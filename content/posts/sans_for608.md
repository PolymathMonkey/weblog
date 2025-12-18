---
title: "SANS FOR608"
author: ["Dirk"]
date: 2025-05-26T16:21:00-05:00
lastmod: 2025-12-09T14:11:32+01:00
tags: ["forensicwheels", "honeypot", "canarytokens"]
categories: ["forensic", "threathunting"]
draft: true
weight: 1004
---

<div class="ox-hugo-toc toc">

<div class="heading">Table of Contents</div>

- [**Enterprise Threat hunting and Response (FOR608)**](#enterprise-threat-hunting-and-response--for608)
- [Introduction](#introduction)
    - [Brief overview of forensic analysis and its application](#brief-overview-of-forensic-analysis-and-its-application)
- [**Course Overview/ Preparing your Index**](#course-overview)
    - [Proactive Detection and Response (608.1)](#proactive-detection-and-response--608-dot-1)
    - [Scaling Response and Analysis (608.2)](#scaling-response-and-analysis--608-dot-2)
    - [Modern Attacks against Windows and Linux FIR (608.3)](#modern-attacks-against-windows-and-linux-dfir--608-dot-3)
    - [Analyzing macOS and Docker Containers (608.4)](#analyzing-macos-and-docker-containers--608-dot-4)
    - [Cloud Attacks and Response (608.5)](#cloud-attacks-and-response--608-dot-5)
    - [Capstone: Enterprise-Class IR Challenge](#capstone-enterprise-class-ir-challenge)
- [**Key Takeaways**](#key-takeaways)
    - [Summary of key concepts and skills learned during the course](#summary-of-key-concepts-and-skills-learned-during-the-course)
    - [learning outcomes and their application in real-world scenarios](#learning-outcomes-and-their-application-in-real-world-scenarios)
- [**Conclusion and Recommendations**](#conclusion-and-recommendations)
    - [Summary of overall effectiveness of the SANS Forensics course for608](#summary-of-overall-effectiveness-of-the-sans-forensics-course-for608)
    - [Recommendations for future students looking to learn forensic analysis skills](#recommendations-for-future-students-looking-to-learn-forensic-analysis-skills)

</div>
<!--endtoc-->


## **Enterprise Threat hunting and Response (FOR608)** {#enterprise-threat-hunting-and-response--for608}

Course description from SANS&nbsp;[^fn:1] :

> FOR608: Enterprise-Class Incident Response &amp; Threat Hunting focuses on
> identifying and responding to incidents too large to focus on individual
> machines. By using example tools built to operate at enterprise-class
> scale, students learn the techniques to collect focused data for
> incident response and threat hunting, and dig into analysis
> methodologies to learn multiple approaches to understand attacker
> movement and activity across hosts of varying functions and operating
> systems by using an array of analysis techniques.


## Introduction {#introduction}


### Brief overview of forensic analysis and its application {#brief-overview-of-forensic-analysis-and-its-application}

Forensic analysis in computer science investigates digital evidence to
solve cybercrimes and security incidents. In enterprise environments, it
involves analyzing devices, networks, and cloud storage. Key
applications include incident response, compliance with regulations,
investigations, and predictive analytics.

{{< figure src="../img/mfsans.png" >}}

Tools like Timesketch, Velociraptor or Wireshark, and cloud forensics
platforms aid in the analysis. Collaboration between IT and law
enforcement is also crucial for successful investigations.

The goal of forensic analysis is to reconstruct events, identify
perpetrators, and determine damage extent, ensuring organizations can
respond effectively to security threats and maintain compliance with
regulations.


## **Course Overview/ Preparing your Index** {#course-overview}

The course was booked by my employer in the on demand version, so I got access
to the SANS on demand platform, so I could learn self paced. For good
preparation, I read this guides on how to create a exam index:

-   <https://tisiphone.net/2015/08/18/giac-testing/>
-   <https://www.muratbekgi.com/indexing-giac/>

The exams are open book and so you have to create a index for:

-   It helps you quickly locate answers in your official SANS course books.
-   It saves valuable time during the exam.
-   personalized knowledge map
-   It reinforces your understanding while building it

The core of the index is a sorted list of terms, concepts, or attack types,
with book and page numbers e.g:

| Term             | Book  | Page |
|------------------|-------|------|
| Active Directory | 608.1 | 45   |
| ARP Spoofing     | 608.2 | 112  |
| Buffer Overflow  | 608.5 | 16   |
| XOR Encryption   | 608.4 | 154  |


### Proactive Detection and Response (608.1) {#proactive-detection-and-response--608-dot-1}

The FOR608 course start with discussing current cyber defense concerns
and the importance of collaboration among incident responders and
threat hunters. There is a emphasize to use to shared knowledge from
sources like the [MITREATT&amp;CK](https://attack.mitre.org/) framework and further explores the
concept of active defense, like the use of honeypots, honey tokens,
and canaries to slow down attackers and facilitate detection.

For case of a compromise, the materials focus on efficiently handling of
intrusions, by covering topics such as leading the response, managing
team members, documenting findings, and communicating with stakeholders.

[Aurora](https://github.com/cyb3rfox/Aurora-Incident-Response) documentation tool is introduced as a means for tracking
the investigation phases from initial detection to remediation.

Later chapter dives into a scenario where an alert gets triggered
in a company network, then in the labs triage data is analyzed
using [Timesketch](https://timesketch.org/), a powerful platform for scalable and collaborative
analysis of forensic data.

Additionally, techniques are shared for visualising the same data set
with [Kibana](https://www.elastic.co/kibana), which offers capabilities such as creating dashboards and
saved searches to aid analysis.

The Chapter concludes by examining key threat intelligence concepts,
including developing and implementing internal threat intelligence.
External projects like [MITRE ATT&amp;CK](https://attack.mitre.org/) and [Sigma](https://github.com/SigmaHQ/sigma) are leveraged, and two
comprehensive threat intel platforms, [MISP](https://www.misp-project.org) and [OpenCTI](https://filigran.io/solutions/open-cti/), are introduced.

A threat intel report on the adversary targeting Stark Research Labs is
used for intelligence to kick off the investigation into potential signs
of intrusion in the company.


### Scaling Response and Analysis (608.2) {#scaling-response-and-analysis--608-dot-2}

The course continues from chapter 1 by focusing on response actions.
The Instructors show how to collect evidence at scale to scope a potential
intrusion by leveraging EDR tooling data from EDR Solutions like [Sysmon](https://learn.microsoft.com/de-de/sysinternals/downloads/sysmon).

However, they also discuss common bypass techniques that attackers use
to evade EDR technology. To aid in this analysis, [Velociraptor](https://docs.velociraptor.app/) is introduced
as a powerful platform for incident response and threat hunting.

{{< figure src="../img/logo.svg" >}}

Then the chapter continuses to show how [Velociraptor](https://docs.velociraptor.app) can collect forensic
artifacts from across the enterprise and provide deep-dive capabilities
into individual hosts of interest. Additionally, [Elasticsearch](https://www.elastic.co/elasticsearch) is used to
ingest and process data from various tools, allowing for fast searches and
aggregations. I also learned about rapid response options for targeted
data collections at scale using tools like [Velociraptor](https://docs.velociraptor.app/) and [CyLR](https://github.com/orlikoski/CyLR).
Finally, we got solutions shown that are used for quickly processing acquired
data for analysis in tools like [Timesketch](https://timesketch.org/) and individual artifact review.


### Modern Attacks against Windows and Linux FIR (608.3) {#modern-attacks-against-windows-and-linux-dfir--608-dot-3}

In the third chapter of the course the focus shifts from network-based
analysis to classic host-based forensic artifact analysis. The start is to
discuss modern attack techniques on Windows systems, including
the infamous ransomware and "[living-of-the-land](https://lolbas-project.github.io/#)" (LOTB) attacks that avoid detection
by using built-in binaries and scripts.

The use of [Sigma](https://github.com/SigmaHQ/sigma) rules is highlighted as a way to facilitate rapid
detection and response.

The chapter covers Linux incident response and analysis too, by starting
with common vulnerabilities and exploits targeting Linux systems. Then it
dives into DFIR fundamentals on Linux systems, including key concepts
such as differences among Linux distributions and filesystems, and
strategies for handling initial triage and deeper forensic analysis.
The chapter concludes by providing best practices for hardening Linux
systems and enhancing logging configurations to aid future investigations.


### Analyzing macOS and Docker Containers (608.4) {#analyzing-macos-and-docker-containers--608-dot-4}

Now the focus went on to Apple macOS incident response, building on the
foundation we got established earlier. This part includes understanding
the history, ecosystem, and details of the Apple Filesystem (APFS),
file structure, and important file types such as Property List (plist)
configuration files. A discussion of challenges and opportunities in
responding to macOS incidents follows, covering topics like acquiring
disk and triage data, reviewing acquisitions, and identifying suspicious
activity in logs and artifacts.

This part of the course then transitions to containerized microservices
and [Docker](https://www.docker.com/) analysis, focusing on the architecture and management of [Docker](https://www.docker.com/)
containers and providing a specific triage workflow for quick and effective
response against individual containers as well as the container host.


### Cloud Attacks and Response (608.5) {#cloud-attacks-and-response--608-dot-5}

This part focused on incident response in major cloud platforms from
Microsoft and Amazon, covering log analysis techniques, architecture
designs, and automation initiatives that can be applied across various
cloud providers. It highlights unique challenges and opportunities in
cloud environments, particularly through the use of the
[MITRE ATT&amp;CK framework's Cloud Matrix](https://attack.mitre.org/matrices/enterprise/cloud/).

In-depth discussion follows on Microsoft 365 (M365) and Azure, including
popular SaaS offerings like Entra ID, Exchange, SharePoint, and Teams,
as well as common attack scenarios against these platforms. The importance
of log analysis is emphasized strongly, particularly in identifying suspicious user
logon and email activity from Unified Audit Logs.

The course then addresses the Recovery phase, covering security enhancements
to detect or prevent similar attacks in the future for M365 and Azure.

Next, it delves into Amazon Web Services (AWS), covering its general
architecture and components, as well as numerous logs and services
providing critical detection and analysis data for responders. Discussions
focus on architecting for response in the cloud, including setting up
security accounts for a secure enclave within AWS, using template VMs
(AMIs) for analysis, and automating IR tasks with AWS Lambda and Step Functions.


### Capstone: Enterprise-Class IR Challenge {#capstone-enterprise-class-ir-challenge}

The final section of the course is the capstone exercise that allows
students to apply their knowledge by working on a simulated breach
scenario. They will receive a dataset from a compromised environment
that spans multiple host operating systems and cloud environments, and
use tools and techniques learned throughout the course to uncover the
steps of the breach.


## **Key Takeaways** {#key-takeaways}


### Summary of key concepts and skills learned during the course {#summary-of-key-concepts-and-skills-learned-during-the-course}

During the SANS FOR608 course, I learned concepts and skills that
enabled me to do more effective incident response and coordination,
including enterprise-level incident detection and to deploy threat
hunting strategies. The course covered large-scale event correlation
and timeline analysis techniques to identify patterns and trends in
incidents, as well as multi-platform artifact analysis for incident
response.

Specifically, I gained hands-on experience analyzing artifacts from
various platforms, including Windows devices, Linux systems, macOS
devices, containerized environments, and cloud-based infrastructure.
This comprehensive training has equipped me with the knowledge and tools
needed to detect, analyze, and respond to complex threats in enterprise
environments.

The most fun was the parts where we learned about Timesketch and Velociraptor,
I think each of those tools individually is extremely powerful, but when you
integrate them into your threathunting / Response stack I thing they are
of great benefit.


### learning outcomes and their application in real-world scenarios {#learning-outcomes-and-their-application-in-real-world-scenarios}

Based on the provided course materials, I have analyzed my learning
outcomes and their application in real-world scenarios. Through my
analysis, I have gained a deeper understanding of the key concepts and
skills required for effective cloud response and analysis, container
DFIR fundamentals, detecting modern attacks, enterprise incident
response management, enterprise visibility and incident scoping,
foundational cloud concepts, Linux DFIR fundamentals, macOS DFIR
fundamentals, macOS essentials, rapid response triage at scale.

I have also gained practical knowledge of how to correlate large volumes
of data to identify patterns and trends in incidents.

In particular, my experience with cloud-based infrastructure has
highlighted the need for a comprehensive understanding of foundational
cloud concepts, including popular cloud services that enterprises use to
support business operations. I have also gained familiarity with common
data source types in an enterprise environment and strategies to
aggregate telemetry from disparate resources.

My analysis of learning outcomes suggests that effective application of
these skills requires a combination of technical expertise, analytical
thinking, and communication skills. By mastering these skills, I am
confident in my ability to respond effectively to complex incidents and
provide value to organizations as a security professional.


## **Conclusion and Recommendations** {#conclusion-and-recommendations}


### Summary of overall effectiveness of the SANS Forensics course for608 {#summary-of-overall-effectiveness-of-the-sans-forensics-course-for608}

SANS FOR608 course is a comprehensive training program which provides
responders with a strong foundation in incident response, threat hunting,
and digital forensic analysis. Through its curriculum, the course covers
concepts and skills related to managing incident response teams,
detecting threats in enterprise environments using advanced analytics
tools, correlating large volumes of data to identify patterns and trends
in incidents, analyzing artifacts from various platforms including
Windows devices, Linux systems, macOS devices, containerized
environments, and cloud-based infrastructure.

<span class="underline">Analysis</span>:

-   **Comprehensive coverage**: The course covers a wide range of topics
    related to incident response and digital forensic analysis, providing
    students with a comprehensive understanding of the subject matter.
-   **Hands-on experience**: The course includes hands-on labs that
    allow participants to apply their knowledge in real-world scenarios, which
    helps to reinforce learning and improve retention.
-   **Practical skills**: The course emphasizes practical skills over
    theoretical concepts, which is beneficial for security professionals
    who need to respond to incidents in a timely and effective manner. And
    I also think that pactical knowledge is more interessting to learn, because
    you can apply it in the following labs
-   **Real-world relevance**: The course covers topics that are relevant to
    real-world scenarios responders are confronted with, making it easier
    for students to apply their   knowledge in practical settings.

Summary:

From my personal opinion the SANS FOR608 course is very  effective for
providing students with a very well understanding of incident response and
digital forensic analysis. Through its comprehensive coverage, hands-on
exercises, and emphasis on practical skills, the course provides
security professionals with the knowledge and skills needed to respond
effectively to incidents.

Overall, the course is well-structured,
engaging, and relevant to real-world scenarios, making it an excellent
choice for individuals looking to improve their incident response and
digital forensic analysis skills.

Tho I have to say the on-demand course is way more exhausting I belive than
the in person class. Also I think in person is more benificial beause you can
discuss matters with your peers.


### Recommendations for future students looking to learn forensic analysis skills {#recommendations-for-future-students-looking-to-learn-forensic-analysis-skills}


#### Gain Practical Experience {#gain-practical-experience}

Before enrolling in a forensic analysis course, try to gain as much
practical experience as possible for example practicing
[Sherlocks on hack the box](https://app.hackthebox.com/sherlocks/) or try yourself in Malware analysis
challanges This could also involve setting up your own home lab,
participating in bug bounty programs, or volunteering to help a
friend or family member with their computer issues. The more hands-on
experience you have, the better equipped you'll be to learn and
apply forensic analysis skills.


#### Develop Your Analytical Skills {#develop-your-analytical-skills}

Forensic analysis requires strong analytical skills, including attention
to detail, critical thinking, and problem-solving. Practice these skills
by working on puzzles, brain teasers, or other activities that challenge
your mind. You can also try analyzing data sets, network traffic logs,
or system logs to develop your skills.


#### Learn about Cloud Computing {#learn-about-cloud-computing}

As a forensic analyst, it's essential to understand cloud computing and
how it affects the analysis of digital evidence. Take online courses or
attend webinars that teach you about cloud security, compliance, and
investigation techniques. This will help you stay up-to-date with the
latest trends and technologies.


#### Familiarize Yourself with Linux and macOS {#familiarize-yourself-with-linux-and-macos}

Linux and macOS are popular operating systems used by many
organizations, including those in the finance, healthcare, and
government sectors. Take online courses or attend workshops that teach
you about these operating systems, including their command-line
interfaces, file systems, and security features.


#### Join Online Communities {#join-online-communities}

Joining online communities, such as Reddit's r/learnprogramming or
r/netsec, can be a great way to connect with other professionals in the
field, ask questions, and learn from their experiences. You can also
participate in online forums, attend webinars, or join online study
groups to stay updated on the latest forensic analysis techniques.


#### Consider Specializing in a Specific Area {#consider-specializing-in-a-specific-area}

Forensic analysis is a broad field that encompasses many areas,
including computer forensics, mobile device forensics, and digital
evidence collection. Consider specializing in a specific area that
interests you the most, such as incident response or threat hunting.
This will help you develop deeper knowledge and skills in that area.


#### Stay Up-to-Date with Industry Developments {#stay-up-to-date-with-industry-developments}

The field of forensic analysis is constantly evolving, with new
technologies and techniques emerging regularly. Stay up-to-date with
industry developments by attending conferences, webinars, or online
courses that focus on the latest trends and advancements.

[^fn:1]: <https://www.sans.org/cyber-security-courses/enterprise-incident-response-threat-hunting/>
