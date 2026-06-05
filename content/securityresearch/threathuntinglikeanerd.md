---
title: "Threathunting like a nerd"
author: ["Dirk"]
date: 2026-06-05T12:04:00+02:00
lastmod: 2026-06-05T12:32:13+02:00
tags: ["threathunting", "hassh", "misp", "securityresearch"]
categories: ["threathunting"]
draft: false
weight: 1002
---

## The Tooling Problem {#the-tooling-problem}

Most threat hunters use one of three things to document their work:
a Word document, a Jupyter notebook, or a dedicated platform like
TheHive or Aurora. Word documents are fine until you want to run a
query from inside the document. Jupyter notebooks are fine until you
want to write prose that does not look like a GitHub README. TheHive
is fine until you are a solo analyst running a homelab and you do
not want to maintain another service.

I use Emacs and org-mode. I have used it for years, for everything
from note-taking to project management to writing these articles.
When I started running a honeypot and needed to document threat
hunts, the obvious thing was to use the tool I already had open.

It turns out this is not just a comfortable habit, org-mode has
specific properties that make it genuinely good for threat hunting work.


## Why Org-Mode {#why-org-mode}

The core property that matters is `org-babel`: the ability to embed
executable code blocks in a document and run them inline, with the
results stored in the document itself. You write a query, run it
with `C-c C-c`, and the results appear in the document. You iterate,
refine, run again. The document is simultaneously the investigation
journal and the execution environment.

This is what Jupyter does, and Jupyter is fine. But org-mode
adds things Jupyter does not have:

-   **Folding.** A hunt document gets long. Org-mode's outline folding
    lets you collapse sections you are not currently working on.
-   **Linking.** Links to MISP events, Kibana dashboards, external OSINT
    tools. Internal cross-references.
-   **TODO tracking.** A hunt has tasks. `[ ]` items, `:STATUS:` properties,
    tag-based filtering.
-   **Export.** When you are done, the document exports cleanly to
    HTML, PDF, or plain text for reporting.
-   **Plain text.** The file is a text file. It goes in git.
    You diff it, grep it, version-control it.

And of course it is Emacs, which means the keybindings are the
ones you already know, the integration with the rest of your
workflow is complete, and no one will ever tell you the feature
you need requires upgrading to the Enterprise plan.


## The Setup {#the-setup}

The template I use has a fixed structure:

```nil
 * Hunt Metadata        — IDs, TLP, ATT&CK mapping, analyst, dates
 * Hypothesis          — The thing being tested, written out explicitly
 * Investigation       — Numbered sections with executable query blocks
  * Initial Scope     — Volume, top IPs, MISP hit rate
  * MISP Intelligence — Known threats, MISP misses, correlation
  * IP Investigation  — Per-IP deep dive with OSINT links
  * Attack Patterns   — Credential patterns, commands, geo distribution
  * HASSH Fingerprinting
* Findings            — Structured finding records with severity/confidence
* Conclusions         — Was the hypothesis confirmed?
* Evidence Appendix   — Raw logs, screenshots
* Hunt Log            — Running timestamped log
* Next Steps          — Checklist
```

The query blocks connect to Elasticsearch over SSH via
org-babel's `:dir` header argument:

```org
#+PROPERTY: header-args:shell :dir /ssh:siem1:
```

This means every shell block runs on the SIEM host without me needing to
SSH in manually. I write the query in my editor, hit `C-c C-c`, and the
results appear below the block.


## An Example Hunt Session {#an-example-hunt-session}

Here is what an actual session looks like. I notice an unusual
volume of MISP misses from a specific ASN and want to understand
whether it represents a new campaign or just normal scan noise.

I start with the scope check block:

```shell
curl -s -k -u elastic:PASSWORD \
  "https://localhost:9200/cowrie-*/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"range": {"@timestamp": {"gte": "now-24h"}}},
          {"exists": {"field": "source.address"}}
        ],
        "must_not": [
          {"term": {"tags": "misp_hit"}}
        ]
      }
    },
    "aggs": {
      "by_asn": {
        "terms": {
          "field": "source.geo.as.organization.name",
          "size": 10
        }
      }
    },
    "size": 0
  }'
```

`C-c C-c`. Results appear inline. I see one ASN accounting for 40% of misses.
I set the target IP variable at the top of the IP investigation section and
run the per-IP blocks — activity timeline, credential patterns, command
execution. All of this runs against the live Elasticsearch instance,
results stored in the document.

The OSINT section has a table with links:

```org
| AbuseIPDB  | [[https://www.abuseipdb.com/check/1.2.3.4]]           |
| GreyNoise  | [[https://viz.greynoise.io/ip/1.2.3.4]]               |
| Shodan     | [[https://www.shodan.io/host/1.2.3.4]]                |
| MISP       | [[https://misp.home.arpa:8043/events/view/38]]        |
```

I open the links with `C-c C-o`, paste the relevant findings back into the notes,
and continue. The document is a complete record of what I looked at and what I found.

When I have a new indicator to add to MISP, I note it in the findings table
and run a MISP API call from the document to add the sighting. One block, one keypress.


## The Hypothesis Discipline {#the-hypothesis-discipline}

The thing that separates threat hunting from random log browsing is a written
hypothesis. Writing it down before touching the data forces you to be explicit
about what you are looking for and why. It also gives you a clear criterion for
when to stop: the hypothesis is either confirmed, rejected, or inconclusive.

Org-mode enforces nothing here — you can absolutely skip the hypothesis section
and go straight to the queries. But having the template with a dedicated
hypothesis section creates enough friction that I usually fill it in. And when
I do, the investigation is noticeably more focused.


## The HASSH Section {#the-hassh-section}

One section worth calling out specifically is SSH client fingerprinting via
HASSH. Every SSH client has a characteristic set of algorithms it proposes
during key exchange. The hash of this proposal set is the HASSH fingerprint,
and it is logged by Cowrie.

A single HASSH fingerprint showing up across hundreds of source IPs is a
strong indicator that those connections are automated, using the same tool.
A new HASSH fingerprint you have not seen before is worth investigating,
it may indicate a new tool or a new campaign.

The HASSH query in the template surfaces these patterns directly:

```shell
curl -s -k -u elastic:PASSWORD \
  "https://localhost:9200/cowrie-*/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "aggs": {
      "hassh": {
        "terms": {
          "field": "ssh.client",
          "size": 20
        }
      }
    },
    "size": 0
  }'
```

You then cross-reference the top HASSH values against [Salesforce's HASSH
database](https://github.com/salesforce/hassh) to identify known tools.


## Limitations {#limitations}

Org-mode is not a case management system. It does not track multiple analysts
working on the same hunt, send notifications, integrate with ticketing systems,
or produce standardised report formats. If you work in a team, you need
something else.

It is also not a substitute for a proper SIEM dashboard. The Kibana dashboards
exist for a reason, real-time monitoring, visual pattern recognition, the
GeoMap. Org-mode is for the deep-dive investigation after something has caught
your attention, not for watching the board.

What it is: a frictionless, extensible, versionable investigation journal that
runs your queries for you and lets you work in the same environment you use for
everything else. For a solo analyst, that is exactly enough.


## The Template {#the-template}

The complete template is available [on GitHub](https://github.com/PolymathMonkey/templates/). It includes:

-   All query blocks pre-configured for the Cowrie/Elasticsearch setup
    described in earlier posts
-   OSINT link tables with placeholder variables
-   Org-capture configuration snippet
-   Skeleton finding records
-   ATT&amp;CK mapping fields in metadata

To use it with org-capture, add to your `init.el`:

```emacs-lisp
(setq org-capture-templates
  '(("t" "Threat Hunt" plain
     (file (lambda ()
       (let ((name (read-string "Hunt name: ")))
         (expand-file-name
           (concat "hunts/TH-"
                   (format-time-string "%Y%m%d")
                   "-" name ".org")
           org-directory))))
     (file "~/.emacs.d/templates/threathunt-template.org"))))
```

`M-x org-capture t`, enter a name, and you have a new hunt document
with the full structure, ready to go.


## One More Thing {#one-more-thing}

The file is plain text. When the hunt is closed, it goes into git. Six months
later you can `git log --grep="SSH scanner"` and find every hunt that mentioned
that term. You can diff two hunts to compare methodology. You can grep across
all your hunt files for a specific IP or HASSH fingerprint.

Your investigation history is queryable. In the same editor you used to write
the investigations. With the same tools you use for everything else.

That is the pitch. If you are already living in Emacs, threat hunting in Emacs
is not a compromise. It is just more Emacs.
