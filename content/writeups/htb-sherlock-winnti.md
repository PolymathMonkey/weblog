---
title: "HTB Sherlock: KitsuneHook"
author: ["Dirk"]
date: 2026-06-23T00:00:00+02:00
lastmod: 2026-06-23T10:13:17+02:00
tags: ["attribution", "osint", "malware-analysis"]
categories: ["htb", "malware", "threathunting"]
draft: false
weight: 1003
---

## Overview {#overview}

| Attribute      | Value                           |
|----------------|---------------------------------|
| Challenge Type | Sherlock (Investigation)        |
| Difficulty     | Medium                          |
| Focus          | Threat Intelligence &amp; OSINT |
| Key Techniques | Vendor Attribution, Malware     |
|                | Analysis, Cluster Correlation   |
| Status         | COMPLETED                       |

The investigation starts with a cold lead ("Winnti behind this") and
requires classic OSINT: vendor reports, GitHub source analysis,
conference presentations, and leaked data correlation.


## Scenario &amp; Investigation Approach {#scenario-and-investigation-approach}

You're a Threat Intelligence Analyst with a new assignment: all you
know is that Winnti is behind this mess. Your organization has detected
suspicious activity targeting manufacturing and energy companies, and
the SOC needs answers fast.

Classic cold-start TI scenario. No samples, no PCAP, just a threat
actor name and a pile of questions.


### Research Methodology {#research-methodology}

The Sherlock requires:

1.  ****Vendor Report Cross-Reference**** — Different vendors (Mandiant,
    Cybereason, LAC, Symantec, Trend Micro) track the same group under
    different names
2.  ****Timeline Correlation**** — Linking sample compilation dates to
    known campaign windows
3.  ****Leaked Data Analysis**** — i-Soon leak (early 2024) exposed
    internal Chinese security contractor tools
4.  ****Source Code Analysis**** — Public GitHub repositories (Behinder,
    China Chopper) contain hardcoded keys and signatures
5.  ****String Artifacts**** — PDB paths, window titles, and YARA rules
    reveal internal naming conventions

---


## Task-by-Task Investigation {#task-by-task-investigation}


### Task 1 — APT Designation Number {#task-1-apt-designation-number}

**Question:** What is the primary APT designation number used to track
this state-sponsored threat actor that has been active since at least
2012?

**Research Path:** Google "Winnti APT designation" leads immediately to
Mandiant's tracking system. Winnti overlaps heavily with the group
Mandiant calls APT41, documented as active since at least 2012 and
conducting both espionage and financially motivated operations.
Cross-referencing with the US DOJ indictment from 2020 confirms the
designation.

> ****Answer:**** \`AXXXX\` [HTB-SPOILER]

---


### Task 2 — Symantec's Tracking Name {#task-2-symantec-s-tracking-name}

**Question:** This group is tracked under multiple names by different
security vendors. Provide the alternative name used by Symantec.

**Research Path:** Known aliases include BARIUM (Microsoft) and Earth
Freybug (Trend Micro). Pulling up Symantec's threat actor database or
their reporting on the group gives the answer directly. Their
CuckooBees reporting and related publications consistently use a
single internal name.

> ****Answer:**** \`BXXXXXXy\` [HTB-SPOILER]

---


### Task 3 — Campaign Name {#task-3-campaign-name}

**Question:** What is the name of the campaign that specifically targeted
organizations in the manufacturing, materials, and energy sectors?

**Research Path:** Narrowing down to campaigns targeting manufacturing
and energy in Japan specifically leads to a February 2025 LAC Co.,
Ltd. report. They named the campaign after observing it in March 2024.
The naming convention follows geographical/operation-type patterns —
consistent with how LAC Co. names campaigns.

> ****Answer:**** \`RXXXXXXSXXXX\` [HTB-SPOILER]

---


### Task 4 — Leak Name {#task-4-leak-name}

**Question:** Internal documents from a security contractor, revealing a
Linux controller for the malware, were leaked. What is the common name
for this leak?

**Research Path:** The RevivalStone report by LAC references leaked data
from a Chinese security contractor. This is a well-known incident from
early 2024 — a massive data leak from a Chinese company called Anxun
Information Technology. The leak contained internal tools, target lists,
and crucially: a Linux malware controller UI with branding in the
window title.

> ****Answer:**** \`i-XXXX leak\` [HTB-SPOILER]

---


### Task 5 — C2 Controller Name {#task-5-c2-controller-name}

**Question:** Researchers discovered references to a Linux-based C2
infrastructure component with a geology-themed codename. What is the
name of this control panel specifically engineered to manage the
malware ecosystem?

**Research Path:** Back in the LAC report: PDB paths reference a specific
controller name. Cross-referencing with the leaked data confirms it is
the controller designed to work with Winnti malware. The "geology" or
stone-related naming is consistent with Winnti's internal tool naming
scheme.

> ****Answer:**** \`TXXXXSXXXX\` [HTB-SPOILER]

---


### Task 6 — Version Designation {#task-6-version-designation}

**Question:** What version designation was found in the samples
indicating the latest iteration of this malware?

**Research Path:** PDB paths in the malware samples contain specific
version markers alongside the controller reference. The researchers
speculate this indicates a specific malware version — though not
confirmed, inferred from the embedded strings.

> ****Answer:**** \`SXXXXXVX\` [HTB-SPOILER]

---


### Task 7 — Initial Access Vulnerability {#task-7-initial-access-vulnerability}

**Question:** What type of vulnerability was exploited to gain initial
access during the RevivalStone campaign?

**Research Path:** The LAC report details the attack chain. Initial
access was achieved by exploiting a specific vulnerability class in
an ERP system exposed to the internet — used to deploy web shells
onto the compromised server.

> ****Answer:**** \`XXX Injection\` [HTB-SPOILER]

---


### Task 8 — Third Web Shell {#task-8-third-web-shell}

**Question:** The adversaries deployed multiple web shells including
"China Chopper" and "Behinder". What is the third web shell?

**Research Path:** The LAC report lists all three web shells used in the
campaign. China Chopper and Behinder (冰蝎 / IceScorpion) are the known
ones. The third is a file uploader payload that can be generated with
specific tools — a simple GUI-based upload shell.

> ****Answer:**** \`XXXXXX file uploader\` [HTB-SPOILER]

---


### Task 9 — Behinder Hardcoded Key {#task-9-behinder-hardcoded-key}

**Question:** Behinder uses a hardcoded encryption key consisting of the
first 16 characters of the MD5 hash of what specific word?

**Research Path:** Behinder is open-source on GitHub
(github.com/rebeyond/Behinder). In v3.0, dynamic key negotiation was
removed and replaced with a pre-shared key. The default key is the
first 16 characters of MD5() of a specific string. Multiple analysis
reports (Sangfor, Elastic, Gigamon) confirm this directly by analyzing
the tool's initialization code.

> ****Answer:**** \`XXXXXXXX\` [HTB-SPOILER]

---


### Task 10 — Graph API Malware {#task-10-graph-api-malware}

**Question:** Which malware uses Microsoft Graph API to fetch commands
from email messages for file management and proxy operations?

**Research Path:** Searching for "malware Microsoft Graph API Outlook
drafts C2" pulls up reporting from early 2025. One specific RAT uses
Outlook's draft folder as a C2 channel via the Graph API. Commands
come in as draft emails, responses go back as new drafts. In the
RevivalStone context specifically, there is an equivalent component
using the Graph API for C2.

> ****Answer:**** \`XXXXXXXXXXX / XXXXXXXXX\` [HTB-SPOILER]

---


### Task 11 — Loader and Rootkit {#task-11-loader-and-rootkit}

**Question:** In the RevivalStone campaign, a loader drops a RAT which
installs a kernel-level rootkit. Identify both.

**Research Path:** From the LAC report and corroborating Cybereason
CuckooBees analysis: the loader and rootkit are separately named
components. Execution chain: Loader decrypts DAT files → launches RAT
→ RAT drops rootkit installer → temporarily hijacks a service binary
path → rootkit installer runs as a service → shellcode deploys
rootkit into kernel space.

> ****Answer:**** \`Loader: XXXXXXXXXX — Rootkit: XXXXXXXXXX\` [HTB-SPOILER]

---


### Task 12 — Abused Windows Service {#task-12-abused-windows-service}

**Question:** Which Windows system service is commonly abused for DLL
side-loading using TSMSISrv.DLL?

**Research Path:** The LAC report is explicit here. The execution chain
starts with a specific Windows system service. The service loads a
legitimate DLL, which then loads the trojanized TSMSISrv.DLL, which in
turn loads the Winnti Loader. Because the service runs as SYSTEM, the
entire chain executes with SYSTEM privileges — no exploit needed, just
write access to the right path.

> ****Answer:**** \`RXX (SessXXXXXX)\` [HTB-SPOILER]

---


### Task 13 — AES Mode {#task-13-aes-mode}

**Question:** What AES encryption mode is used in the malware DAT file
decryption process?

**Research Path:** The cybersecuritynews.com writeup of the LAC report is
specific: DAT files are encrypted with AES in a specific mode combined
with ChaCha20. Keys are derived from victim-specific hardware
identifiers (IP, MAC, GUID) run through multiple SHA256 hash rounds.

> ****Answer:**** \`XXX\` [HTB-SPOILER]

---


### Task 14 — Concurrent Campaign {#task-14-concurrent-campaign}

**Question:** Two samples of prntvpt.dll show compilation timestamps of
May 12 and August 17, 2021. Identify the major APT campaign active
during this timeframe.

**Research Path:** prntvpt.dll is a known sideloading target in the
Winnti toolchain. Looking at what major Winnti campaigns ran through
2021 leads to a major disclosure from May 2022 detailing intrusions
during 2021 itself — the campaign ran from at least 2019 through 2021,
targeting manufacturing and tech companies across Asia, Europe, and
North America.

> ****Answer:**** \`Operation XXXXXXXXXX\` [HTB-SPOILER]

---


### Task 15 — Kernel Device Object {#task-15-kernel-device-object}

**Question:** The Winnti Rootkit YARA rule by LAC Co., Ltd. references
two Windows kernel device objects. Identify the one related to sound at
hardware level.

**Research Path:** Digging into the YARA rule from the LAC appendix and
cross-referencing with deep-dive analysis: one component tries to open
a handle to a specific kernel device — the Windows kernel device for
the PC speaker / system beeper at hardware level. This is used to test
whether the rootkit is already running via a specific IOCTL. The device
object format uses the standard kernel namespace notation.

> ****Answer:**** \`\\\XXXXXX\\\XXXX\` [HTB-SPOILER]

---


## Lessons Learned &amp; Detection Opportunities {#lessons-learned-and-detection-opportunities}


### For Threat Intelligence {#for-threat-intelligence}

1.  ****Cluster Analysis is Hard**** — One group, many names (Winnti, APT41,
    BARIUM, Earth Freybug, CuckooBees). Attribution confidence requires
    TTP overlap, not just naming.

2.  ****Vendor Reports are Incomplete**** — Different vendors focus on
    different aspects. Cybereason catches kernel rootkit details LAC
    doesn't emphasize. Neither knew about Graph API abuse until later
    reports.

3.  ****Leaked Data is Goldmine**** — The i-Soon leak exposed internal tool
    names, target lists, and infrastructure that would have been
    invisible otherwise. Leaked source code (Behinder) gives you
    hardcoded secrets.

4.  ****Timeline Correlation Matters**** — Linking sample compilation dates
    to known campaign windows narrows attribution. May-August 2021
    samples → Operation CuckooBees → specific victim sets.

5.  ****PDB Paths are Intelligence**** — Developers often leave paths in
    binaries. "StoneV5", "TreadStone", "PRIVATELOG" all came from PDB
    strings — internal naming that reveals toolchain structure.


### For Incident Response {#for-incident-response}

1.  ****Kernel Rootkits are Hard to Detect**** — WINNKIT modifies
    `amonitor.sys` and hijacks services. EDR running in user-mode won't
    catch it. Require kernel-mode hooking or behavioral analysis.

2.  ****DLL Side-Loading is Invisible**** — TSMSISrv.DLL hijacking via
    legitimate service startup. Not a code injection, not unsigned code
    — just a missing DLL in a trusted path.

3.  ****Service Hijacking Patterns**** — Watch for:
    -   Service binary path changes
    -   Legitimate DLLs loading unexpected DLLs
    -   SYSTEM-level processes spawning unusual child processes
    -   Temporary modifications to driver paths

4.  ****Multiple Web Shells = Persistence**** — China Chopper, Behinder, and
    file uploader suggest redundancy — assume multiple footholds before
    assuming containment.

5.  ****Hardware Identifier Harvesting**** — Malware collecting IP, MAC,
    GUID suggests key derivation tied to victim infrastructure. Same
    malware won't work on different victims — target-specific encryption.


### For OSINT Workflow {#for-osint-workflow}

1.  ****Start with Vendor Reports**** — Mandiant, Cybereason, LAC, Sangfor.
    Each has a different angle.

2.  ****Cross-Reference GitHub**** — Public tool source code (Behinder) is
    goldmine for signatures, hardcoded values, and capability analysis.

3.  ****Follow Leaked Data Incidents**** — i-Soon, Uber breach aftermath,
    etc. Leaked internal tools reveal naming schemes and infrastructure.

4.  ****Timeline Correlation is Key**** — Sample dates + campaign windows +
    public disclosures = confidence in attribution.

5.  ****YARA Rules are Intelligence**** — Rules from reputable sources (LAC,
    Cybereason) encode detection logic and often leak artifact names.


## Timeline of Winnti Evolution {#timeline-of-winnti-evolution}

| Period     | Key Activity                      |
|------------|-----------------------------------|
| 2012-2019  | Early APT41 / Winnti activity     |
| 2019-2021  | Operation CuckooBees              |
| 2021-2024  | RevivalStone campaign begins      |
| 2024-02    | LAC publishes RevivalStone report |
| 2024-early | i-Soon contractor data leaked     |
| 2025-early | Follow-on reporting and analysis  |


## Tools &amp; Resources {#tools-and-resources}


### Threat Intelligence Sources {#threat-intelligence-sources}

-   [LAC Co., Ltd. — RevivalStone Campaign Report (2025-02-13)](https://www.lac.co.jp/lacwatch/report/20250213_004283.html)
-   [Cybereason — Operation CuckooBees Deep-Dive (2022-05-04)](https://www.cybereason.com/blog/operation-cuckoobees-a-winnti-malware-arsenal-deep-dive)
-   [Behinder GitHub (Source Code Analysis)](https://github.com/rebeyond/Behinder)
-   Mandiant: APT41 Reports and Tracking
-   Microsoft: BARIUM Threat Intelligence


### Analysis Tools &amp; Techniques {#analysis-tools-and-techniques}

-   YARA Rule Analysis (extracting artifact names)
-   PDB Path Parsing (tool naming and versioning)
-   GitHub Source Code Inspection (hardcoded values)
-   Leaked Data Correlation (i-Soon incident)
-   Timeline Correlation (sample dates vs. campaign windows)
-   Vendor Report Cross-Referencing


### Key Searches for OSINT {#key-searches-for-osint}

\`\`\`
"APT41" Winnti Mandiant
"RevivalStone" LAC Winnti
"i-Soon" leak contractor
"Behinder" hardcoded key GitHub
"TreadStone" malware controller
"CUNNINGPIGEON" Graph API
prntvpt.dll sideload Windows service
\`\`\`


### Related HTB Resources {#related-htb-resources}

-   Other Sherlocks on threat actor attribution
-   DFIR Sherlocks for incident response workflows
-   Machine boxes (Silentium, DevHub) for hands-on exploitation

---

****Note:**** This Sherlock demonstrates the importance of multi-source
threat intelligence. One vendor report answers some questions; true
attribution requires triangulation between public disclosures, leaked
data, source code analysis, and timeline correlation. Classic OSINT
workflow for a mature threat actor.
