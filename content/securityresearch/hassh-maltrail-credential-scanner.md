+++
title = "Tracking a Credential Scanner"
author = ["Dirk"]
date = 2026-06-05T12:01:00+02:00
lastmod = 2026-06-05T12:23:33+02:00
tags = ["forensicwheels", "honeypot", "threathunting", "hassh", "misp"]
categories = ["securityresearch"]
draft = false
weight = 1001
+++

## Background {#background}

In this threathunt I tested my threathunting.org template I described in [threathuntinglikeanerd](threathuntinglikeanerd/)


## The Alert {#the-alert}

At 10:23 this morning, ElastAlert fired a Pushover notification:

```nil
MISP Hit: Known Threat Actor
IP: 130.12.180.51 | Canada
Feed: Maltrail IOC for 2026-06-01 | Level: Medium
```

The honeypot had seen this IP before. A lot. The first session was logged
on 2026-02-27 — over three months ago. MISP just caught up.

This is the typical lifecycle of threat intelligence: by the time an IOC
lands in a feed, the actor has already been operating for weeks or months.
The value is not in the alert itself. The value is in the pivot it enables.


## What is HASSH? {#what-is-hassh}

HASSH is a network fingerprinting method for SSH clients, analogous to
JA3 for TLS. During the SSH key exchange, the client advertises its
supported algorithms — KEX algorithms, encryption ciphers, MACs,
compression methods — in a specific order that reflects the library and
version used to build the client. HASSH takes that ordered list and
produces an MD5 hash.

The result is a stable, tool-specific identifier that persists across
IP changes, VPN rotations, and infrastructure churn. The same automated
scanner running from a different exit node will still produce the same
HASSH. This makes it a useful pivot when you want to ask: _is this the
same actor I have seen before, under a different address?_

Cowrie captures the full `client.kex` event and our Logstash pipeline
indexes it under `ssh.client`.


## The Evidence {#the-evidence}

Pulling the session history for 130.12.180.51 from Elasticsearch reveals
a clean, repetitive pattern across 13 sessions spanning 98 days:

```nil
session.connect
client.version
client.kex       ← HASSH: 5f904648ee8964bef0e8834012e26003
login.success    ← root / P  (Feb–Mar)
session.closed   ← ~0.5 seconds after connect
```

Then, after a three-month gap:

```nil
login.success    ← admin / admin  (June)
session.closed
```

No commands. No file transfers. No post-login activity of any kind. The
session opens, authenticates, and terminates within half a second. Every
time.

This is a credential validator. The tool is not attempting to compromise
the system — it is verifying that the credentials work, logging the
result, and moving on. The credential rotation after three months
(root/P → admin/admin) suggests an actively maintained wordlist rather
than a fire-and-forget scanner.

The MISP match confirms what the behavioral pattern already implied:
tracked scanning infrastructure, attributed to the Maltrail IOC feed
for 2026-06-01, MISP Event 2058, 638 attributes.


### Session Timeline {#session-timeline}

| Timestamp (UTC)     | Outcome       | Username | Password |
|---------------------|---------------|----------|----------|
| 2026-02-27 15:10:08 | login.success | root     | P        |
| 2026-02-28 08:45:11 | login.success | root     | P        |
| 2026-02-28 11:06:10 | login.success | root     | P        |
| 2026-02-28 23:23:10 | login.success | root     | P        |
| 2026-03-01 04:29:06 | login.success | root     | P        |
| 2026-03-01 07:36:54 | login.success | root     | P        |
| 2026-03-01 17:08:27 | login.success | root     | P        |
| 2026-03-01 17:56:49 | login.success | root     | P        |
| 2026-03-02 04:24:55 | login.success | root     | P        |
| 2026-03-02 22:42:24 | login.success | root     | P        |
| 2026-03-03 11:37:35 | login.success | root     | P        |
| 2026-06-04 14:56:27 | login.success | admin    | admin    |
| 2026-06-05 05:39:26 | login.success | admin    | admin    |

All sessions follow the same pattern: `session.connect` → `client.kex` →
`login.success` → `session.closed` within ~0.5 seconds. No commands executed.


### MISP Context {#misp-context}

| Field        | Value                                          |
|--------------|------------------------------------------------|
| Feed         | Maltrail IOC for 2026-06-01                    |
| Threat Level | Medium                                         |
| Event ID     | 2058                                           |
| Attributes   | 638                                            |
| Org          | Krawczyk Industries Limited                    |
| Event URL    | <https://misp.home.arpa:8043/events/view/2058> |


## Behavioral Analysis {#behavioral-analysis}

The 11 February–March sessions are clustered in bursts of 2–4 per day,
with irregular intervals between bursts. Then silence for roughly 90
days. Then two sessions in June, 19 hours apart.

This is not random scanning noise. The regularity within bursts, the
deliberate pause, the wordlist rotation — these are signs of an operator
managing a scanning campaign. Whether that operator is a human or a
scheduler is less interesting than the implication: this infrastructure
is being maintained.


## HASSH Fingerprint {#hassh-fingerprint}

The `client.kex` event gives us a full picture of the client's algorithm
negotiation:

| Field       | Value                                                                     |
|-------------|---------------------------------------------------------------------------|
| HASSH       | `5f904648ee8964bef0e8834012e26003`                                        |
| KEX         | curve25519-sha256, ecdh-sha2-nistp256, diffie-hellman-group14-sha256/sha1 |
| Encryption  | aes128-gcm, aes256-gcm, chacha20-poly1305, aes128/192/256-ctr             |
| MAC         | hmac-sha2-256-etm, hmac-sha2-256, hmac-sha1                               |
| Compression | none                                                                      |

This is the default profile of a modern OpenSSH client — not a
stripped-down scanner like Masscan or a custom SSH implementation. The
tooling is standard OpenSSH, placing it in the "scripted automation on a
compromised or rented host" category rather than purpose-built scanning
infrastructure.


## HASSH as a Pivot: Finding the Second IP {#hassh-as-a-pivot-finding-the-second-ip}

With the HASSH in hand, the natural next question is whether this
fingerprint appears under any other source addresses:

```json
{
  "query": {"term": {"ssh.client": "5f904648ee8964bef0e8834012e26003"}},
  "aggs": {"ips": {"terms": {"field": "source.address", "size": 20}}}
}
```

Result:

| IP              | Sessions | In MISP feed |
|-----------------|----------|--------------|
| 130.12.180.51   | 13       | Yes          |
| 213.209.159.158 | 2        | No           |

213.209.159.158 is not in the MISP feed. It has only two sessions in the
index — both recent. Same HASSH, same behavioral pattern, different
address. This is either the same operator rotating IPs, or the same tool
deployed on a second host. Either way, the fingerprint gives attribution
the IP feed does not.

This is the practical payoff of HASSH indexing: an IP-based IOC feed
tells you about one address. The HASSH tells you about the tool. The
tool persists longer than the infrastructure.

213.209.159.158 has been added to the MISP instance as a local IOC,
cross-referenced to Event 2058.


## Conclusions {#conclusions}

A Medium-severity MISP alert on a Canadian IP turned into a three-month
session history, a behavioral profile of a credential validation
campaign, a tool fingerprint, and a second IP the feed had missed.

The honeypot's value here is not in catching the attacker — the attacker
never got past the cowrie shell, and there was nothing to catch. The
value is in the data. Thirteen sessions of clean, timestamped,
fingerprintable evidence of an actor methodology. That evidence feeds
back into MISP, into the ElastAlert ruleset, into the HASSH index. The
next time this tool shows up — different IP, different feed, different
month — the infrastructure already knows what it is looking at.

That is the point of the whole stack.
