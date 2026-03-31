---
title: "SANS FOR608"
author: ["Dirk"]
date: 2026-03-20T07:39:00+01:00
lastmod: 2026-03-31T09:15:02+02:00
tags: ["forensicwheels", "honeypot", "canarytokens"]
categories: ["forensic", "threathunting"]
draft: false
weight: 1004
---

<div class="ox-hugo-toc toc">

<div class="heading">Table of Contents</div>

- [Enterprise Threat Hunting and Incident Response (FOR608)](#enterprise-threat-hunting-and-response--for608)
- [Preparing for the exam: building an index](#course-overview)
- [608.1 — Proactive Detection and Response](#proactive-detection-and-response--608-dot-1)
- [608.2 — Scaling Response and Analysis](#scaling-response-and-analysis--608-dot-2)
- [608.3 — Modern Attacks against Windows and Linux](#modern-attacks-against-windows-and-linux-dfir--608-dot-3)
- [608.4 — macOS and Docker Containers](#analyzing-macos-and-docker-containers--608-dot-4)
- [608.5 — Cloud Attacks and Response](#cloud-attacks-and-response--608-dot-5)
- [608.6 — Capstone](#capstone-enterprise-class-ir-challenge)
- [What I took away from this](#key-takeaways)

</div>
<!--endtoc-->


## Enterprise Threat Hunting and Incident Response (FOR608) {#enterprise-threat-hunting-and-response--for608}

My employer booked me back in 2025 onto SANS FOR608 in the on-demand version.

That means no classroom, no peers to argue with, just me and the material
at whatever pace I could manage. Harder than it sounds. More on that later.

This is my write-up, part learning journal, part recommendation for anyone
considering the course.

The official course description[^fn:1]:

> FOR608: Enterprise-Class Incident Response &amp; Threat Hunting focuses on
> identifying and responding to incidents too large to focus on individual
> machines. By using example tools built to operate at enterprise-class
> scale, students learn the techniques to collect focused data for
> incident response and threat hunting, and dig into analysis
> methodologies to learn multiple approaches to understand attacker
> movement and activity across hosts of varying functions and operating
> systems by using an array of analysis techniques.

---


## Preparing for the exam: building an index {#course-overview}

GIAC exams are open book. That sounds easier than it is.

You have your course books in front of you, but you're racing a clock.
Without a good index, you spend half your time flipping pages instead of
answering questions.

Before I started the material, I read two guides on how to build a proper
exam index:

-   <https://tisiphone.net/2015/08/18/giac-testing/>
-   <https://www.muratbekgi.com/indexing-giac/>

The core idea is simple: a sorted list of terms, concepts, and attack types,
with book and page numbers next to each entry.

| Term             | Book  | Page |
|------------------|-------|------|
| Active Directory | 608.1 | 45   |
| ARP Spoofing     | 608.2 | 112  |
| Buffer Overflow  | 608.5 | 16   |
| XOR Encryption   | 608.4 | 154  |

Building the index forced me to actually read the material instead of just
watching the videos. That's the other benefit nobody talks about: it's a
second pass through everything, and it reinforces what you learned while
building it.

If you skip the index, you're making the exam harder for no reason.

---


## 608.1 — Proactive Detection and Response {#proactive-detection-and-response--608-dot-1}

The course opens with something I didn't expect: a section on how to
actually run an incident response effort as a human being.

Not just the technical side, the coordination, the communication with
stakeholders, the documentation. [Aurora](https://github.com/cyb3rfox/Aurora-Incident-Response) gets introduced here as a tool
for tracking investigation phases from initial detection through
remediation. It's the kind of thing that looks obvious in retrospect but
nobody teaches explicitly.

Then it gets into the detection side: [MITRE ATT&amp;CK](https://attack.mitre.org/) as a shared language
for describing attacker behavior, [Sigma](https://github.com/SigmaHQ/sigma) rules for detection, and the
concept of active defense.


#### Honeypots, honey tokens, and canaries {#honeypots-honey-tokens-and-canaries}

This was one of the sections I found most interesting.

The idea is straightforward: place things in your environment that have
no legitimate business reason to be touched. If something interacts with
them, you know immediately that something is wrong.

Honeypots are fake systems. Honey tokens are fake credentials, documents,
or data. Things an attacker would find valuable and try to use.
[Canary tokens](https://canarytokens.org) are a practical implementation of this: you generate a
token (a URL, a document, a DNS name), embed it somewhere, and get an
alert the moment it's triggered.

What makes this approach interesting from a detection standpoint is that
it has near-zero false positives. There is no legitimate reason for
anyone to access a canary token. When it fires, something is wrong.

The chapter concludes with threat intelligence. How to build internal
intel, and how to consume external sources. [MISP](https://www.misp-project.org) and [OpenCTI](https://filigran.io/solutions/open-cti/) are both
covered as platforms for managing and sharing threat intel.

The lab scenario throughout 608.1 involves a compromised environment at
a fictional company. A threat intel report on the adversary targeting
them is the starting point for the investigation, which continues
through the rest of the course.

---


## 608.2 — Scaling Response and Analysis {#scaling-response-and-analysis--608-dot-2}

This is where the tooling gets serious.

The challenge in enterprise IR isn't finding the right artifact on one
machine. It's collecting the right artifacts across hundreds or thousands
of machines fast enough to matter, without drowning in noise.

608.2 introduces [Velociraptor](https://docs.velociraptor.app/) as the primary answer to that problem.


#### Velociraptor {#velociraptor}

Velociraptor is an endpoint visibility and collection platform. You deploy
an agent to your endpoints, write queries in its own query language (VQL),
and collect forensic artifacts at scale across the entire fleet, or
targeted at specific hosts.

What makes it stand out is the depth. You're not just pulling logs.
You can query running processes, parse specific artifact types, hunt for
IOCs across every machine simultaneously, and drill into individual hosts
for deeper analysis, all from one interface.

The course also covers [CyLR](https://github.com/orlikoski/CyLR) for rapid triage collection, and how to
ingest that data into [Elasticsearch](https://www.elastic.co/elasticsearch) for fast searching and aggregation.


#### Timesketch {#timesketch}

Once you have data, you need to make sense of it. That's where
[Timesketch](https://timesketch.org/) comes in.

Timesketch is a platform for collaborative timeline analysis. You load
forensic artifacts event logs, filesystem timestamps, network data
and it builds a searchable, filterable timeline across all of it.

The collaborative part matters in enterprise IR. Multiple analysts can
work the same timeline simultaneously, add annotations, tag events, and
build a shared picture of what happened and when.

Working through the lab scenario in Timesketch was the moment the course
clicked for me. You go from a pile of artifacts to a coherent sequence of
attacker actions. The timeline makes the narrative visible.

Velociraptor and Timesketch individually are both powerful tools.
Integrated, Velociraptor collecting at scale, Timesketch making the
data navigable, they cover a large part of what enterprise IR actually
requires.

The chapter also covers EDR data from tools like [Sysmon](https://learn.microsoft.com/de-de/sysinternals/downloads/sysmon), and importantly,
common techniques attackers use to bypass or blind EDR tooling. Knowing
the evasion techniques is as important as knowing the detection ones.

---


## 608.3 — Modern Attacks against Windows and Linux {#modern-attacks-against-windows-and-linux-dfir--608-dot-3}

608.3 moves from the tooling layer to the artifact layer.

The focus here is on what attackers actually do on Windows and Linux
systems, and what traces they leave behind.


#### Windows: ransomware and living off the land {#windows-ransomware-and-living-off-the-land}

The course covers ransomware from an IR perspective, not how it works
cryptographically, but what artifacts it leaves and how to reconstruct
the timeline of a ransomware incident.

More interesting to me was the [Living Off the Land](https://lolbas-project.github.io/#) (LOTL) section.

LOTL attacks use built-in Windows binaries and scripting capabilities
to do malicious things, `certutil` for downloads, `wmic` for lateral
movement, `mshta` for execution. No custom malware to detect, no
suspicious executables to flag. Just Windows doing what Windows does,
pointed in the wrong direction.

[Sigma](https://github.com/SigmaHQ/sigma) rules get more attention here as a detection layer, a way to
write detection logic in a vendor-neutral format that can be translated
to whatever SIEM or detection platform you're running.


#### Linux DFIR {#linux-dfir}

The Linux section starts with common attack vectors and then covers the
fundamentals of forensic analysis on Linux systems, differences between
distributions, filesystem considerations, initial triage approach, and
deeper artifact analysis.

It concludes with hardening and logging recommendations that would
actually make future investigations easier. That's a useful framing:
good logging isn't just compliance, it's evidence preservation.

---


## 608.4 — macOS and Docker Containers {#analyzing-macos-and-docker-containers--608-dot-4}


#### macOS {#macos}

The macOS section covers the Apple Filesystem (APFS) and the specific
artifacts that matter for IR on macOS, property list (plist) files,
log formats, acquisition approaches.

macOS has its own challenges for IR: Apple's privacy controls affect
what you can collect, and the forensic tooling ecosystem is narrower
than on Windows. The course is honest about that.


#### Docker containers {#docker-containers}

The container section was one I hadn't seen covered well elsewhere.

The approach is a specific triage workflow: how to assess a running
container quickly, what artifacts are available at the container level
versus the host level, and how the architecture of Docker affects what
evidence exists and where.

Container forensics is a different mental model from host forensics.
The container might be long gone by the time you're investigating.
Understanding where the evidence persists, in image layers, in host
logs, in orchestration tooling, is the core skill here.

---


## 608.5 — Cloud Attacks and Response {#cloud-attacks-and-response--608-dot-5}

The final technical chapter covers IR in Microsoft Azure / M365 and AWS.


#### Microsoft 365 and Azure {#microsoft-365-and-azure}

The M365 section is heavily focused on log analysis, specifically the
Unified Audit Log, which is the primary source of truth for what happened
in an M365 environment. Suspicious logon patterns, email forwarding rules,
OAuth application grants, these are the artifacts that matter in M365
incidents, and the course walks through how to find and interpret them.

The [MITRE ATT&amp;CK Cloud Matrix](https://attack.mitre.org/matrices/enterprise/cloud/) is used as a framework throughout,
which helps map observed activity to known attacker techniques.

Coverage includes Entra ID (formerly Azure AD), Exchange, SharePoint,
and Teams, the services that appear in most real M365 incidents.


#### AWS {#aws}

The AWS section covers the general architecture and the specific logs
and services that matter for IR: CloudTrail, GuardDuty, VPC Flow Logs,
S3 access logs.

What I found useful here was the discussion of architecting for
response, setting up a dedicated security account as an isolated enclave,
using AMIs as analysis templates, and automating IR tasks with Lambda
and Step Functions. The idea is to design your AWS environment so that
incident response is faster and more reliable before an incident happens.

---


## 608.6 — Capstone {#capstone-enterprise-class-ir-challenge}

The capstone is a simulated breach across multiple operating systems and
cloud environments.

You get a dataset from the compromised environment and work through it
using the tools and techniques from the course to reconstruct what
happened.

I'm not going to detail the scenario. But the capstone is where you find
out whether you actually understood the course or just watched it.
The tools are familiar by that point, the challenge is knowing which
artifact to look at, in which order, and what it means.

---


## What I took away from this {#key-takeaways}

FOR608 is a good course. It earns that.

The breadth is real,  Windows, Linux, macOS, containers, two major cloud
platforms, plus the tooling layer underneath all of it. Covering all of
that at useful depth in one course is genuinely hard to do.

The two tools I'll actually keep using are Velociraptor and Timesketch.
Both have steep initial learning curves. Both are worth it. If you're
building or improving an IR capability, those two together cover a large
part of what you need for collection and analysis at scale.

The honeypot and canary token material from 608.1 is immediately
applicable with minimal infrastructure. If your environment has none of
that right now, it's low-effort detection with high signal quality.
I'd start there.


#### On the on-demand format {#on-the-on-demand-format}

The on-demand version is harder than the in-person class. I'm confident
of that even without having done the in-person version.

In a classroom, you can ask a question when something doesn't click.
You can argue about an approach with someone sitting next to you.
That back-and-forth is where a lot of real learning happens.

On-demand, you're alone with the material. That requires more
self-discipline, and some things take longer to click because there's
no one to pressure-test your understanding against.

If you have the choice, do the in-person version. If you don't, the
on-demand version is still worth doing, just budget more time than you
think you need.


#### If you're considering the course {#if-you-re-considering-the-course}

You'll get more out of FOR608 if you come in with some foundation.

Hands-on experience matters more than certifications here. Working
through [Hack The Box Sherlocks](https://app.hackthebox.com/sherlocks/) before the course is a good way to
build familiarity with forensic artifact analysis in a low-stakes
environment. Setting up a home lab with a SIEM and some logging
infrastructure helps even more, the tooling in the course will make
more sense if you've wrestled with log ingestion before.

Linux and macOS fundamentals are worth having before 608.3 and 608.4.
The course teaches you what to look for; it assumes you know your way
around the filesystems.

Cloud fundamentals, particularly AWS and Azure architecture, will make
608.5 easier to follow. You don't need to be a cloud engineer, but
knowing what CloudTrail is before the course saves time during it.q

---

[^fn:1]: <https://www.sans.org/cyber-security-courses/enterprise-incident-response-threat-hunting/>

    {{< giscus >}}
