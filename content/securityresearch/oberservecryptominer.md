---
title: "Two Cryptominer Campaigns in the Wild"
author: ["Dirk"]
date: 2026-06-26T09:34:00+02:00
lastmod: 2026-06-28T05:11:10+02:00
tags: ["threathunting", "misp", "securityresearch"]
draft: false
weight: 1003
---

## Overview {#overview}

Over a 17-day observation window (June 5–22, 2026), my Cowrie SSH
honeypot recorded 53 file upload events across multiple source IPs.
Manual triage of the data revealed two structurally distinct campaigns
operating concurrently: one a well-documented commodity cryptominer
with static tooling and relaxed operational security, the other a
larger, more disciplined operation using process name masquerading and
a substantially wider infrastructure footprint.

This post documents both clusters, compares their characteristics,
and draws what conclusions the data supports — while being explicit
about where attribution remains uncertain.


## Cluster A: Redtail (Commodity Cryptominer) {#cluster-a-redtail--commodity-cryptominer}


### Observation {#observation}

The first cluster was immediately recognizable. A set of files
uploaded via SFTP — `clean.sh`, `setup.sh`, and architecture-specific
binaries named `redtail.arm7`, `redtail.arm8`, `redtail.i686`, and
`redtail.x86_64` — were first observed on June 5th from
`213.209.159.158` (Alexhost Srl, DE). The same bundle reappeared on
June 8th and June 14th from the same IP, and on June 16th from a new
source: `91.224.92.17` (UAB Biuro sprendimu tinklas, LT).

This campaign was already documented in a prior post (see: [Tracking a
credential scanner](/weblog/securityresearch/hassh-redtail-cryptominer-campaign/)), where the Alexhost node was identified as the
deployment stage of a two-phase operation involving a separate
credential validation node.


### Technical Analysis {#technical-analysis}

The defining characteristic of this cluster is hash stability. Across
all four deployment events — from two different source IPs in two
different countries — the file hashes are identical:

| Filename         | SHA256 (truncated) |
|------------------|--------------------|
| `clean.sh`       | `d46555af...`      |
| `redtail.arm7`   | `3625d068...`      |
| `redtail.arm8`   | `dbb7ebb9...`      |
| `redtail.i686`   | `048e374b...`      |
| `redtail.x86_64` | `59c29436...`      |
| `setup.sh`       | `783adb7a...`      |

Identical hashes across rotating source IPs is the primary indicator
linking these events to a single campaign. The binaries themselves
are not rebuilt between deployments — the same payload is distributed
from different infrastructure nodes.

The deployment intervals are irregular: 3 days, 6 days, 2 days. This
lack of fixed cadence, combined with static binaries, suggests human
operators who deploy opportunistically rather than a fully automated
pipeline that rebuilds on a schedule.

The transition from Alexhost (DE) to a Lithuanian VPS provider between
June 14th and 16th may indicate infrastructure rotation, though the
sample size is too small to confirm a pattern.

Malware characteristics (from prior analysis):

-   `redtail.arm7`: ELF32 ARM, UPX-packed, XMRMiner (36/75 VT detections)
-   `clean.sh`: competition remover, kills rival miners, wipes `/tmp`
-   `setup.sh`: dropper, detects architecture, deploys appropriate binary
-   SSH key persistence via `chattr +ai ~/.ssh/authorized_keys`

Operationally, the campaign makes no effort to disguise its tooling.
Binaries are named after the malware family. No process masquerading.
No obfuscation beyond UPX packing.


### Infrastructure {#infrastructure}

| IP                | ASN          | Country   | Role       |
|-------------------|--------------|-----------|------------|
| `213.209.159.158` | Alexhost Srl | Germany   | Deployment |
| `91.224.92.17`    | UAB BST      | Lithuania | Deployment |

Both Alexhost and UAB Biuro sprendimu tinklas are budget VPS
providers with a known history of hosting abuse. Neither IP appeared
in MISP feeds prior to analysis.


## Cluster B: systemd-worker (Masquerading Miner) {#cluster-b-systemd-worker--masquerading-miner}


### Observation {#observation}

The second cluster is less cohesive on the surface: 15 upload events
over 17 days, all uploading a file named `sshd`, from source IPs
across China, Russia, Bulgaria, Vietnam, Netherlands, United Kingdom,
India, Iran, Pakistan, and Hong Kong. The apparent geographic
diversity initially suggests unrelated activity.

Several events returned the null hash
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
(SHA256 of an empty file), consistent with aborted or failed SFTP
transfers. These events are excluded from further analysis.

Filtering to events with substantive payloads reveals approximately
five distinct hashes, with `94f2e4d8d4436874785cd14e6e6d403507b8750852f7f2040352069a75da4c00`
appearing most frequently across multiple source IPs and dates.


### Technical Analysis {#technical-analysis}

VirusTotal analysis of the primary hash (45/61 detections) reveals:

-   File type: ELF 64-bit, 28.9 MB
-   VT submission name: `systemd-worker`
-   Popular threat label: `miner.multiverze/genericrxss`
-   Family labels: `multiverze`, `genericrxss`, `r002c0pjf23`
-   YARA hits: Linux_Generic_Threat (Elastic), APT1_WEBC2_Y21K (AlienVault)

The file is uploaded to the honeypot as `sshd` — a legitimate Linux
system binary name — while identifying internally as `systemd-worker`.
This is textbook masquerading (MITRE ATT&amp;CK T1036): the binary mimics
process names that would appear routine in a `ps` listing, reducing
the likelihood of manual detection.

The VT Relations graph shows substantial infrastructure breadth:
481 associated domains, 3644 IP addresses, 790 related files, and
524 URLs. Multiple MISP collections reference this sample in the
context of honeypot activity, indicating widespread observation across
the research community over an extended period.

The presence of multiple concurrent hashes — different builds active
simultaneously from different source IPs — is consistent with a
distributed deployment infrastructure rather than a single operator
working from one node.


### Infrastructure {#infrastructure}

Source IPs span multiple ASNs and continents with no obvious
geographic anchor. China-originating IPs are overrepresented, but
given the prevalence of VPN and proxy infrastructure among threat
actors, this is a weak signal at best and should not be treated as
attribution.

> Note: Shodan analysis of source IPs is pending. Results will be
> added in a follow-up revision.


## Comparison {#comparison}

| Characteristic      | Cluster A (Redtail)    | Cluster B (systemd-worker) |
|---------------------|------------------------|----------------------------|
| File naming         | Overt (`redtail.*`)    | Masquerading (`sshd`)      |
| Hash stability      | Fully static           | Multiple concurrent builds |
| Source IP diversity | Low (2 IPs)            | High (15+ IPs)             |
| Infrastructure size | Small, budget VPS      | 3644 IPs, 481 domains      |
| Evasion technique   | None beyond UPX        | Process name masquerading  |
| Deployment cadence  | Irregular, human-paced | Distributed, broader reach |
| VT detection rate   | 36/75 (arm7)           | 45/61                      |


## Attribution Hypothesis {#attribution-hypothesis}

Both clusters deploy cryptominers and are therefore financially
motivated. Beyond that, the evidence supports different assessments
of operator sophistication.

Cluster A exhibits characteristics consistent with a small criminal
operation: commodity tooling, no evasion investment, budget
infrastructure, irregular deployment suggesting manual operation.
The campaign is persistent and actively maintained, but not
technically ambitious.

Cluster B presents a more uncertain picture. The infrastructure
scale, masquerading behavior, and distributed deployment are
consistent with either a larger organized criminal operation or a
state-sponsored actor conducting opportunistic financial operations
— a documented behavior pattern. The available data does not
support distinguishing between these two hypotheses.

Attribution beyond "financially motivated threat actor" is not
warranted given current data.


## Indicators of Compromise {#indicators-of-compromise}


### Cluster A (Redtail) {#cluster-a--redtail}

| Type   | Value                                                              | Context            |
|--------|--------------------------------------------------------------------|--------------------|
| ip-src | `213.209.159.158`                                                  | Deployment node    |
| ip-src | `91.224.92.17`                                                     | Deployment node    |
| sha256 | `d46555af1173d22f07c37ef9c1e0e74fd68db022f2b6fb3ab5388d2c5bc6a98e` | clean.sh           |
| sha256 | `3625d068896953595e75df328676a08bc071977ac1ff95d44b745bbcb7018c6f` | redtail.arm7       |
| sha256 | `dbb7ebb960dc0d5a480f97ddde3a227a2d83fcaca7d37ae672e6a0a6785631e9` | redtail.arm8       |
| sha256 | `048e374baac36d8cf68dd32e48313ef8eb517d647548b1bf5f26d2d0e2e3cdc7` | redtail.i686       |
| sha256 | `59c29436755b0778e968d49feeae20ed65f5fa5e35f9f7965b8ed93420db91e5` | redtail.x86_64     |
| sha256 | `783adb7ad6b16fe9818f3e6d48b937c3ca1994ef24e50865282eeedeab7e0d59` | setup.sh (dropper) |


### Cluster B (systemd-worker) {#cluster-b--systemd-worker}

| Type   | Value                                                              | Context                  |
|--------|--------------------------------------------------------------------|--------------------------|
| sha256 | `94f2e4d8d4436874785cd14e6e6d403507b8750852f7f2040352069a75da4c00` | sshd / systemd-worker    |
| ip-src | `109.199.126.3`                                                    | Bulgaria / SoftLayer     |
| ip-src | `45.118.144.36`                                                    | Vietnam / Long Van       |
| ip-src | `172.206.17.236`                                                   | United Kingdom           |
| ip-src | `188.32.210.218`                                                   | Russia / Rostelecom      |
| ip-src | `5.255.122.180`                                                    | Netherlands / Liteserver |

> Note: Additional hashes from Cluster B require VT verification
> before inclusion as confirmed IoCs.


## Defensive Takeaways {#defensive-takeaways}

Both campaigns enter via SSH credential brute-force. The defensive
surface is narrow and well-understood:

1.  Disable password authentication. Use key-based auth exclusively.
2.  Monitor for process names that shadow system binaries (`sshd`,
    `systemd-worker`, `kthreadd`) running from unusual paths.
3.  Check `~/.ssh/authorized_keys` for unexpected entries, and audit
    for immutable flags (`lsattr ~/.ssh/authorized_keys`).
4.  Hash-based detection for the Cluster A IoCs is reliable given
    hash stability. Cluster B requires behavioral detection given
    multiple concurrent builds.
5.  The `chattr +ai` technique used by Cluster A to protect its
    persistence key is worth adding to your hunting queries.
