---
title: "Sans FOR608"
author: ["Dirk"]
date: 2026-03-20T07:39:00+01:00
lastmod: 2026-04-22T07:09:35+02:00
tags: ["forensicwheels", "honeypot", "canarytokens"]
categories: ["forensic", "threathunting"]
draft: false
weight: 1004
---

<div class="ox-hugo-toc toc">

<div class="heading">Table of Contents</div>

- [Enterprise Threat Hunting and Incident Response (FOR608)](#enterprise-threat-hunting-and-response--for608)
- [Preparing for the exam: building an index](#course-overview)
- [608.1 -- Proactive Detection and Response](#proactive-detection-and-response--608-dot-1)
- [608.2 -- Scaling Response and Analysis](#scaling-response-and-analysis--608-dot-2)
- [608.3 -- Modern Attacks against Windows and Linux](#modern-attacks-against-windows-and-linux-dfir--608-dot-3)
- [608.4 -- macOS and Docker Containers](#analyzing-macos-and-docker-containers--608-dot-4)
- [608.5 -- Cloud Attacks and Response](#cloud-attacks-and-response--608-dot-5)
- [608.6 -- Capstone](#capstone-enterprise-class-ir-challenge)
- [What I took away from this](#key-takeaways)

</div>
<!--endtoc-->


## Enterprise Threat Hunting and Incident Response (FOR608) {#enterprise-threat-hunting-and-response--for608}

My employer booked me back in 2025 onto SANS FOR608 in the on-demand
version.

That means no classroom, no peers to argue with, just me and the
material at whatever pace I could manage. Harder than it sounds. More
on that later.

This is my write-up, part learning journal, part recommendation for
anyone considering the course.

The official course description[^fn:1]:

> FOR608: Enterprise-Class Incident Response &amp; Threat Hunting focuses on
> identifying and responding to incidents too large to focus on
> individual machines. By using example tools built to operate at
> enterprise-class scale, students learn the techniques to collect
> focused data for incident response and threat hunting, and dig into
> analysis methodologies to learn multiple approaches to understand
> attacker movement and activity across hosts of varying functions and
> operating systems by using an array of analysis techniques.

---


## Preparing for the exam: building an index {#course-overview}

GIAC exams are open book. That sounds easier than it is.

You have your course books in front of you, but you're racing a clock.
Without a good index, you spend half your time flipping pages instead
of answering questions.

Before I started the material, I read two guides on how to build a
proper exam index:

-   <https://tisiphone.net/2015/08/18/giac-testing/>
-   <https://www.muratbekgi.com/indexing-giac/>

The core idea is simple: a sorted list of terms, concepts, and attack
types, with book and page numbers next to each entry.

| Term             | Book  | Page |
|------------------|-------|------|
| Active Directory | 608.1 | 45   |
| ARP Spoofing     | 608.2 | 112  |
| Buffer Overflow  | 608.5 | 16   |
| XOR Encryption   | 608.4 | 154  |

Building the index forced me to actually read the material instead of
just watching the videos. That's the other benefit nobody talks about:
it's a second pass through everything.

If you skip the index, you're making the exam harder for no reason.

---


## 608.1 -- Proactive Detection and Response {#proactive-detection-and-response--608-dot-1}

The course opens with something I didn't expect: a section on how to
actually run an incident response effort as a human being.

Not just the technical side, the coordination, the communication with
stakeholders, the documentation. [Aurora](https://github.com/cyb3rfox/Aurora-Incident-Response) gets introduced here as a tool
for tracking investigation phases from initial detection through
remediation.

Then it gets into the detection side: [MITRE ATT&amp;CK](https://attack.mitre.org/) as a shared
language for describing attacker behavior, [Sigma](https://github.com/SigmaHQ/sigma) rules for detection,
and the concept of active defense.


#### Honeypots, honey tokens, and canaries {#honeypots-honey-tokens-and-canaries}

This was one of the sections I found most interesting.

The idea is straightforward: place things in your environment that
have no legitimate business reason to be touched. If something
interacts with them, you know immediately that something is wrong.

[Canary tokens](https://canarytokens.org) are a practical implementation of this: you generate a
token, embed it somewhere, and get an alert the moment it's triggered.

What makes this approach interesting from a detection standpoint is
near-zero false positives. There is no legitimate reason for anyone to
access a canary token. When it fires, something is wrong.

The chapter concludes with threat intelligence. [MISP](https://www.misp-project.org) and
[OpenCTI](https://filigran.io/solutions/open-cti/) are both covered as platforms for managing and sharing
threat intel.

---


## 608.2 -- Scaling Response and Analysis {#scaling-response-and-analysis--608-dot-2}

608.2 introduces [Velociraptor](https://docs.velociraptor.app/) as the primary answer to the enterprise
IR problem.


#### Velociraptor {#velociraptor}

You deploy an agent to your endpoints, write queries in VQL, and
collect forensic artifacts at scale across the entire fleet.

The course also covers [CyLR](https://github.com/orlikoski/CyLR) for rapid triage collection, and how to
ingest that data into [Elasticsearch](https://www.elastic.co/elasticsearch) for fast searching and
aggregation.


#### Timesketch {#timesketch}

[Timesketch](https://timesketch.org/) is a platform for collaborative timeline analysis. You load
forensic artifacts and it builds a searchable, filterable timeline
across all of it.

Working through the lab scenario in Timesketch was the moment the
course clicked for me. You go from a pile of artifacts to a coherent
sequence of attacker actions.

The chapter also covers EDR data from tools like [Sysmon](https://learn.microsoft.com/de-de/sysinternals/downloads/sysmon), and common
techniques attackers use to bypass or blind EDR tooling.

---


## 608.3 -- Modern Attacks against Windows and Linux {#modern-attacks-against-windows-and-linux-dfir--608-dot-3}


#### Windows: ransomware and living off the land {#windows-ransomware-and-living-off-the-land}

The course covers ransomware from an IR perspective: what artifacts it
leaves and how to reconstruct the timeline.

More interesting to me was the [Living Off the Land](https://lolbas-project.github.io/#) (LOTL) section.
LOTL attacks use built-in Windows binaries to do malicious things.
No custom malware. Just Windows pointed in the wrong direction.


#### Linux DFIR {#linux-dfir}

The Linux section covers the fundamentals of forensic analysis:
differences between distributions, filesystem considerations, initial
triage approach, and deeper artifact analysis.

---


## 608.4 -- macOS and Docker Containers {#analyzing-macos-and-docker-containers--608-dot-4}


#### macOS {#macos}

Covers APFS and the specific artifacts that matter for IR on macOS.
Apple's privacy controls affect what you can collect, and the forensic
tooling ecosystem is narrower than on Windows. The course is honest
about that.


#### Docker containers {#docker-containers}

The approach is a specific triage workflow: how to assess a running
container quickly, what artifacts are available at the container level
versus the host level.

Container forensics is a different mental model from host forensics.
The container might be long gone by the time you're investigating.

---


## 608.5 -- Cloud Attacks and Response {#cloud-attacks-and-response--608-dot-5}


#### Microsoft 365 and Azure {#microsoft-365-and-azure}

The M365 section is heavily focused on the Unified Audit Log, which is
the primary source of truth for what happened in an M365 environment.

The [MITRE ATT&amp;CK Cloud Matrix](https://attack.mitre.org/matrices/enterprise/cloud/) is used as a framework throughout.


#### AWS {#aws}

Covers the specific logs and services that matter for IR: CloudTrail,
GuardDuty, VPC Flow Logs, S3 access logs.

Useful discussion of architecting for response: designing your AWS
environment so that incident response is faster before an incident
happens.

---


## 608.6 -- Capstone {#capstone-enterprise-class-ir-challenge}

The capstone is a simulated breach across multiple operating systems
and cloud environments. You get a dataset and work through it using
the tools and techniques from the course.

The capstone is where you find out whether you actually understood the
course or just watched it.

---


## What I took away from this {#key-takeaways}

FOR608 is a good course. It earns that.

The two tools I'll actually keep using are Velociraptor and Timesketch.
Both have steep initial learning curves. Both are worth it.

The honeypot and canary token material from 608.1 is immediately
applicable with minimal infrastructure. Low-effort detection with
high signal quality. I'd start there.


#### On the on-demand format {#on-the-on-demand-format}

The on-demand version is harder than the in-person class. In a
classroom, you can ask a question when something doesn't click. On
demand, you're alone with the material.

If you have the choice, do the in-person version.


#### If you're considering the course {#if-you-re-considering-the-course}

Hands-on experience matters more than certifications here. Working
through [Hack The Box Sherlocks](https://app.hackthebox.com/sherlocks/) before the course is a good way to
build familiarity with forensic artifact analysis.

Linux and macOS fundamentals are worth having before 608.3 and 608.4.
Cloud fundamentals will make 608.5 easier to follow.

---

[^fn:1]: <https://www.sans.org/cyber-security-courses/enterprise-incident-response-threat-hunting/>

    {{< giscus >}}
