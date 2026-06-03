---
title: "Threatintel with misp and Logstash"
author: ["Dirk"]
date: 2026-06-02T13:57:00+02:00
lastmod: 2026-06-03T10:55:53+02:00
tags: ["forensicwheels"]
draft: false
weight: 1011
---

## The Problem {#the-problem}

Running a honeypot without Threat Intelligence context is like watching a
door and noting that someone knocked, but having no idea whether they are a
known criminal or just a curious passerby. The IP address alone tells you very
little. What you want to know is: _has this IP been seen before, and in what context_?

MISP ([Malware Information Sharing Platform](https://www.misp-project.org/)) is the answer to that question.
It aggregates threat indicators from multiple feeds — blocklists, VNC scanners,
Tor exit nodes, emerging threats rules — and exposes them via a REST API.

The goal here is straightforward: for every SSH connection hitting a [Cowrie](https://github.com/cowrie/cowrie)
honeypot, query MISP and attach the relevant threat context to the log event
before it lands in Elasticsearch.

The implementation, however, is less straightforward than it looks. Much less.


## Architecture {#architecture}

```nil
Cowrie SSH Honeypot
     |
     | cowrie.json (JSON log)
     v
  Filebeat
     |
     | Port 5044 (Beats protocol)
     v
  Logstash
     |
     | Filter: parse → enrich via MISP API → GeoIP → DNS
     v
  Elasticsearch
     |
     v
  Kibana (Discover / Dashboards)
```

The enrichment happens inside Logstash. For each event carrying an external
source IP, Logstash queries the MISP `restSearch` endpoint and, if the IP
matches a known indicator, adds structured fields to the event before indexing.


## The Logstash HTTP Filter Approach — And Why It Fails {#the-logstash-http-filter-approach-and-why-it-fails}

The documented approach for HTTP-based enrichment in Logstash is the
`http` filter plugin. It looks clean on paper:

```cfg
filter {
  if [source.address] and [source.address] !~ /^192\.168\./ {
    http {
      url          => "https://misp.home.arpa:8043/events/restSearch"
      verb         => "POST"
      headers      => {
        "Authorization" => "YOUR_MISP_API_KEY"
        "Accept"        => "application/json"
      }
      body         => {
        "returnFormat" => "json"
        "value"        => "%{source.address}"
        "page"         => 1
        "limit"        => 10
      }
      body_format  => "json"
      target_body  => "misp_data"
    }
  }
}
```

There are several problems with this that are non-obvious and will cost you hours:


### Problem 1: ECS v8 compatibility breaks `target_body` {#problem-1-ecs-v8-compatibility-breaks-target-body}

Logstash 8.x pipelines default to `pipeline.ecs_compatibility: v8`. Under
this mode, the `http` filter plugin silently ignores the `target_body` setting.
The response body simply does not appear in the event.

The plugin documentation mentions that `ecs_compatibility` affects the default
values of `target_body` and `target_headers`, but does not make it obvious that
the setting actively breaks the behaviour under v8. You set `target_body`,
you get nothing, you wonder what is happening, you add debug logging, you
find the HTTP call is succeeding with status 200, and you still have no
idea where the response went.


### Problem 2: Field notation inconsistency {#problem-2-field-notation-inconsistency}

Logstash has two field notations: dot notation (`source.address`) and bracket
notation (`[source][address]`). After a `mutate` rename that creates
`"src_ip" => "source.address"`, the field is a flat dot-notation field.
A condition using `[source][address]` (bracket notation) does not match
it. The condition silently never fires.

Verifying this required adding a Ruby debug block that logged both notations
simultaneously: `debug_flat: ""`, `debug_nested: "1.2.3.4"`. That was a long
debugging session.


### Problem 3: The `last` parameter {#problem-3-the-last-parameter}

MISP's `restSearch` accepts a `last` parameter (e.g. `"last": "24h"`) that
restricts results to events modified within that timeframe. Feeds ingested
once and rarely updated will return zero results even if the IP is present.
This is indistinguishable from a genuine miss. The `x-result-count: 0` response
header looks identical whether the IP is absent from MISP or just absent from
recently-modified events.


### Problem 4: Missing `Content-Type` header {#problem-4-missing-content-type-header}

Without an explicit `"Content-Type" => "application/json"` header, MISP
interprets the POST body differently and returns empty results even
when the IP matches. A direct `curl` from the Logstash container with
the full headers returns results; the same query without `Content-Type`
returns nothing. This was isolated by comparing the direct `curl`
command against what Logstash was sending.


## A Note on Methodology {#a-note-on-methodology}

The working solution below was developed collaboratively with an AI
assistant. I used AI slop to create AI slop code, as one does in 2026. The
underlying debugging work, adding Ruby blocks to log intermediate field values,
diffing direct `curl` output against Logstash behaviour, reading response
headersm was what finally isolated each of the four problems above. The code
itself is straightforward once you know what the problems are. Getting there
is the painful part.


## The Working Solution: Ruby `Net::HTTP` Directly {#the-working-solution-ruby-net-http-directly}

After exhausting the `http` filter plugin, the reliable solution is to bypass it
entirely and make the MISP API call from a Ruby code block:

```cfg
filter {
  if [log][file][path] =~ "cowrie" {

    # ... JSON parsing, ECS field mapping, etc. ...

    # MISP Enrichment — only for external IPs
    if [source.address] and [source.address] !~ /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/ {
      ruby {
        code => '
          require "net/http"
          require "uri"
          require "json"

          ip  = event.get("source.address")
          uri = URI.parse("https://192.168.210.8:8043/events/restSearch")

          http              = Net::HTTP.new(uri.host, uri.port)
          http.use_ssl      = true
          http.verify_mode  = OpenSSL::SSL::VERIFY_NONE
          http.open_timeout = 3
          http.read_timeout = 5

          request                  = Net::HTTP::Post.new(uri.path)
          request["Authorization"] = "YOUR_MISP_API_KEY"
          request["Content-Type"]  = "application/json"
          request["Accept"]        = "application/json"
          request.body             = {
            "returnFormat" => "json",
            "value"        => ip,
            "page"         => 1,
            "limit"        => 10
          }.to_json

          begin
            response = http.request(request)
            data     = JSON.parse(response.body)
          rescue => e
            data = {"response" => []}
          end

          if data["response"] && data["response"][0]
            evt = data["response"][0]["Event"]

            event.set("misp.event_id",        evt["id"])
            event.set("misp.event_info",       evt["info"])
            event.set("misp.threat_level_id",  evt["threat_level_id"])

            threat_map = {
              "1" => "High",
              "2" => "Medium",
              "3" => "Low",
              "4" => "Undefined"
            }
            event.set("misp.threat_level",
              threat_map[evt["threat_level_id"].to_s] || "Unknown")

            event.set("misp.org",
              evt.dig("Orgc", "name") || "Unknown")

            event.set("misp.ioc_updated",     evt["timestamp"])
            event.set("misp.attribute_count", evt["attribute_count"])
            event.set("misp.event_url",
              "https://misp.home.arpa:8043/events/view/" + evt["id"].to_s)

            event.tag("misp_hit")
          end
        '
      }
    }

    # ... GeoIP, DNS, cleanup ...
  }
}
```

This approach is explicit, debuggable, and immune to the ECS compatibility
issues that affect the plugin.


## The Load Problem — And The Cache Fix {#the-load-problem-and-the-cache-fix}

The basic version above works, but it will saturate your CPU. Every Cowrie
event triggers a synchronous HTTPS call to MISP. A moderately active honeypot
generates hundreds of events per hour, many from the same aggressive scanners
cycling through the same IPs. Without caching, the same IP gets queried
hundreds of times per hour.

On a 4-core host running the full ELK stack, this pushed load average above 3.5
with one core at 100%. The fix is an in-memory cache using Ruby global
variables, which persist across events within a Logstash worker thread:

```cfg
ruby {
  code => '
    require "net/http"
    require "uri"
    require "json"

    $misp_cache      ||= {}
    $misp_cache_time ||= {}

    ip        = event.get("source.address")
    now       = Time.now.to_i
    cache_ttl = 3600

    if $misp_cache.key?(ip) && (now - $misp_cache_time[ip]) < cache_ttl
      data = $misp_cache[ip]
    else
      begin
        uri              = URI.parse("https://192.168.210.8:8043/events/restSearch")
        http             = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl     = true
        http.verify_mode = OpenSSL::SSL::VERIFY_NONE
        http.open_timeout = 3
        http.read_timeout = 5

        request                  = Net::HTTP::Post.new(uri.path)
        request["Authorization"] = "YOUR_MISP_API_KEY"
        request["Content-Type"]  = "application/json"
        request["Accept"]        = "application/json"
        request.body = {
          "returnFormat" => "json",
          "value"        => ip,
          "page"         => 1,
          "limit"        => 10
        }.to_json

        response = http.request(request)
        data     = JSON.parse(response.body)

        $misp_cache[ip]      = data
        $misp_cache_time[ip] = now

        # Bound cache size to avoid unbounded growth
        if $misp_cache.size > 10000
          oldest = $misp_cache_time.min_by { |k, v| v }[0]
          $misp_cache.delete(oldest)
          $misp_cache_time.delete(oldest)
        end
      rescue => e
        data = {"response" => []}
      end
    end

    if data["response"] && data["response"][0]
      evt = data["response"][0]["Event"]

      event.set("misp.event_id",        evt["id"])
      event.set("misp.event_info",       evt["info"])
      event.set("misp.threat_level_id",  evt["threat_level_id"])

      threat_map = {
        "1" => "High", "2" => "Medium",
        "3" => "Low",  "4" => "Undefined"
      }
      event.set("misp.threat_level",
        threat_map[evt["threat_level_id"].to_s] || "Unknown")

      event.set("misp.org",
        evt.dig("Orgc", "name") || "Unknown")

      event.set("misp.ioc_updated",     evt["timestamp"])
      event.set("misp.attribute_count", evt["attribute_count"])
      event.set("misp.event_url",
        "https://misp.home.arpa:8043/events/view/" + evt["id"].to_s)

      event.tag("misp_hit")
    end
  '
}
```

After deploying the cache, load dropped from `3.5 to below ~1.5 on the same
hardware.The cache is per-worker-thread rather than shared, so with
~pipeline.workers: 4` you have four independent caches. This is fine, the
slight redundancy across threads is negligible compared to the savings from
repeated IPs within a thread.


## Field Mapping Reference {#field-mapping-reference}

When a MISP match is found, the following fields are added to the Elasticsearch document:

| Field                  | Type    | Description                                           |
|------------------------|---------|-------------------------------------------------------|
| `misp.event_id`        | keyword | MISP internal event ID                                |
| `misp.event_info`      | keyword | Feed name or description (e.g. "Tor exit nodes feed") |
| `misp.threat_level_id` | integer | Numeric threat level (1–4)                            |
| `misp.threat_level`    | keyword | Human-readable level (High/Medium/Low/Undefined)      |
| `misp.org`             | keyword | Organisation that reported the indicator              |
| `misp.ioc_updated`     | integer | Unix timestamp of last indicator update               |
| `misp.attribute_count` | integer | Number of attributes in the MISP event                |
| `misp.event_url`       | keyword | Direct link to the full MISP event                    |
| `tags`                 | keyword | Contains `misp_hit` when a match is found             |

When no match is found, none of these fields are added. The absence of `misp_hit`
in the tags array is itself meaningful, it identifies IPs that are actively attacking
but have not yet been reported to any feed.


### Making `misp.event_url` clickable in Kibana {#making-misp-dot-event-url-clickable-in-kibana}

By default Kibana displays the URL as plain text. To make it a clickable link:

```nil
Stack Management → Data Views → cowrie-*
→ Find field: misp.event_url
→ Edit (pencil icon)
→ Set format: ON
→ Format: Url
→ Type: Link
→ Open in a new tab: ON
→ URL Template: {{rawValue}}
→ Label Template: View in MISP →
→ Save
```

Note the use of `{{rawValue}}` rather than `{{value}}`. Kibana URL-encodes
 `{{value}}`, which turns the link into something like
 `https://kibana/app/https%3A%2F%2Fmisp...`. The `{{rawValue}}` template
 bypasses this encoding and passes the URL through unchanged.


## MISP Query Design {#misp-query-design}

The `restSearch` endpoint is queried with a minimal body:

```json
{
  "returnFormat": "json",
  "value": "1.2.3.4",
  "page": 1,
  "limit": 10
}
```

A few notes on query design:

-   **No `category` filter.** Adding `"category": "Network activity"` significantly
    narrows results and causes false misses for IPs that appear in other categories.
-   **No `last` filter.** The `last` parameter restricts to recently-modified events.
    Most threat feeds are ingested once and rarely updated; omitting this
    queries all historical indicators.
-   **`limit: 10` is sufficient** for enrichment purposes. Only the first
    matching event is used.


## Threat Hunting with Hits and Misses {#threat-hunting-with-hits-and-misses}

The enriched data supports two distinct hunting workflows.


### Known threats (MISP Hits) {#known-threats--misp-hits}

```nil
tags: misp_hit
```

This surfaces IPs that are in known threat intelligence feeds. Useful for:

-   Confirming that the honeypot is attracting real threat actors, not just random scanners
-   Correlating attack patterns with specific campaigns or feeds
-   Prioritising investigation by threat level


### Unknown threats (MISP Misses) {#unknown-threats--misp-misses}

```nil
NOT tags: misp_hit AND source.address: * AND NOT source.address: 192.168.*
```

This surfaces IPs that are actively attacking but absent from all MISP feeds. These are candidates for:

-   Manual OSINT investigation
-   Submission back to MISP as new indicators
-   Creating local MISP events to track emerging patterns

The miss list is often more operationally interesting than the hit list. Known
threats are already handled by existing defences; unknown threats represent the gap.


## MISP Feed Coverage {#misp-feed-coverage}

Not every attacking IP appears in MISP feeds. In practice, coverage varies considerably:

-   Tor exit nodes: near-complete
-   Blocklist.de: high coverage for persistent scanners
-   Emerging Threats: good coverage for known malware infrastructure
-   General opportunistic SSH scanners: low coverage

Expect 10–30% of honeypot source IPs to match MISP feeds, depending on which
feeds are loaded. The remaining 70–90% are either new actors, residential IPs
rotating through botnets, or IPs that have not yet been reported to any feed.

Enriching the miss list with additional context — ASN, country, rDNS, Shodan
data - is a productive next step.


## Operational Notes {#operational-notes}

-   The Ruby `Net::HTTP` call happens synchronously in the Logstash worker
    thread. The in-memory cache mitigates this substantially for repeated IPs.
    For very high-volume deployments, consider reducing `pipeline.workers` to
    bound the number of concurrent MISP connections.
-   The cache uses Ruby global variables (`$misp_cache`, `$misp_cache_time`).
    These persist for the lifetime of the Logstash process. A restart clears
    the cache, meaning a brief spike in MISP API calls after each restart as
    the cache warms up.
-   The cache is not shared across worker threads. Each thread maintains its
    own independent cache of up to 10,000 entries. Memory usage is bounded.
-   `verify_mode = OpenSSL::SSL::VERIFY_NONE` is appropriate here because the
    MISP instance uses a self-signed certificate on a private network. With
    a valid certificate, use `VERIFY_PEER`.
-   Timeouts (`open_timeout: 3`, `read_timeout: 5`) prevent MISP connectivity
    issues from stalling Logstash pipeline workers indefinitely. Without them, a
    MISP outage will back up the pipeline.
