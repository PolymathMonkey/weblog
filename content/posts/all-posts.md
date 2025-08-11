+++
title = "Forensic Wheels"
author = ["Dirk"]
lastmod = 2025-08-11T09:49:09+02:00
tags = ["forensicwheels"]
draft = false
+++

## <span class="org-todo done DONE">DONE</span> Open BSD and Zen <span class="tag"><span class="_personal">@personal</span><span class="openbsd">openbsd</span><span class="zen">zen</span></span> {#openbsdzen}


#### About {#about}

As someone who is passionate about security and has an interest in
Unix operating systems, OpenBSD particularly captivates due to its
dedication to security, stability, and simplicity. In comparison to
other OSes, what sets OpenBSD apart? And how do these principles
align with my journey through Zen meditation?

{{< figure src="../img/puffy77.gif" >}}

At first glance, OpenBSD and Zen may appear to be vastly disparate
concepts - one being a potent operating system, while the other is
a spiritual practice originating from ancient China. However, as I
delved deeper into both realms, I uncovered some fascinating
similarities.


#### Simplicity and Clarity {#simplicity-and-clarity}

In Zen, simplicity is key to achieving inner clarity and balance.
By stripping away unnecessary complexity, OpenBSD aims to create a
stable and secure foundation for users. Similarly, in meditation,
simplicity helps to quiet the mind and focus on the present moment.
This alignment between OpenBSD's philosophy and Zen practices extends
to their shared emphasis on mindfulness and deliberate decision-making,
fostering an environment of security and tranquility in both realms.


#### Attention to Detail {#attention-to-detail}

Both OpenBSD and Zen underscore the significance of attending to detail.
In software development, this entails meticulously crafting each line of
code to guarantee stability and security. In Zen practice, it involves
paying close attention to one's breath, posture, and mental state to
attain a state of mindfulness. By zeroing in on these details, both
OpenBSD and Zen strive for perfection.


#### The Power of Consistency {#the-power-of-consistency}

OpenBSD's dedication to consistency is manifested in its codebase, where each
code change undergoes a thorough code review process. Consistency holds equal
importance in Zen practice, as it fosters a sense of routine and stability.
By cultivating a consistent daily meditation practice, I have discovered that
consistency is instrumental in making progress on my spiritual journey.
OpenBSD's emphasis on consistency mirrors the principles of Zen, emphasizing
the value of diligence and discipline in both domains.


#### The Beauty of Imperfection {#the-beauty-of-imperfection}

Finally, both OpenBSD and Zen acknowledge the elegance in imperfection.
In software development, imperfections can often be rectified or lessened
through meticulous design and testing. In Zen practice, imperfections are
perceived as avenues for growth and self-awareness.

{{< figure src="../img/enso1.jpg" >}}

By acknowledging our imperfections, we can nurture humility and compassion.
As I progress in my journey with OpenBSD and Zen, I am consistently struck
by the ways in which these two seemingly unrelated realms intersect. By
embracing simplicity, attention to detail, consistency, and the beauty of
imperfection, both OpenBSD and Zen provide unique perspectives on the nature
of software development and personal growth. Stay tuned for further insights
from my exploration in the realm of security!


## <span class="org-todo todo TODO">TODO</span> SANS FOR608 <span class="tag"><span class="_forensic">@forensic</span><span class="_threathunting">@threathunting</span><span class="honeypot">honeypot</span><span class="canarytokens">canarytokens</span><span class="_threathunting">@threathunting</span></span> {#sans_for608}


### **Enterprise Threat hunting and Response (FOR608)** {#enterprise-threat-hunting-and-response--for608}

Course description from SANS&nbsp;[^fn:1] :

> FOR608: Enterprise-Class Incident Response &amp; Threat Hunting focuses on
> identifying and responding to incidents too large to focus on individual
> machines. By using example tools built to operate at enterprise-class
> scale, students learn the techniques to collect focused data for
> incident response and threat hunting, and dig into analysis
> methodologies to learn multiple approaches to understand attacker
> movement and activity across hosts of varying functions and operating
> systems by using an array of analysis techniques.


### Introduction {#introduction}


#### Brief overview of forensic analysis and its application {#brief-overview-of-forensic-analysis-and-its-application}

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


### **Course Overview/ Preparing your Index** {#course-overview}

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


#### Proactive Detection and Response (608.1) {#proactive-detection-and-response--608-dot-1}

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


#### Scaling Response and Analysis (608.2) {#scaling-response-and-analysis--608-dot-2}

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


#### Modern Attacks against Windows and Linux FIR (608.3) {#modern-attacks-against-windows-and-linux-dfir--608-dot-3}

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


#### Analyzing macOS and Docker Containers (608.4) {#analyzing-macos-and-docker-containers--608-dot-4}

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


#### Cloud Attacks and Response (608.5) {#cloud-attacks-and-response--608-dot-5}

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


#### Capstone: Enterprise-Class IR Challenge {#capstone-enterprise-class-ir-challenge}

The final section of the course is the capstone exercise that allows
students to apply their knowledge by working on a simulated breach
scenario. They will receive a dataset from a compromised environment
that spans multiple host operating systems and cloud environments, and
use tools and techniques learned throughout the course to uncover the
steps of the breach.


### **Key Takeaways** {#key-takeaways}


#### Summary of key concepts and skills learned during the course {#summary-of-key-concepts-and-skills-learned-during-the-course}

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


#### learning outcomes and their application in real-world scenarios {#learning-outcomes-and-their-application-in-real-world-scenarios}

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


### **Conclusion and Recommendations** {#conclusion-and-recommendations}


#### Summary of overall effectiveness of the SANS Forensics course for608 {#summary-of-overall-effectiveness-of-the-sans-forensics-course-for608}

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


#### Recommendations for future students looking to learn forensic analysis skills {#recommendations-for-future-students-looking-to-learn-forensic-analysis-skills}

<!--list-separator-->

-  Gain Practical Experience

    Before enrolling in a forensic analysis course, try to gain as much
    practical experience as possible for example practicing
    [Sherlocks on hack the box](https://app.hackthebox.com/sherlocks/) or try yourself in Malware analysis
    challanges This could also involve setting up your own home lab,
    participating in bug bounty programs, or volunteering to help a
    friend or family member with their computer issues. The more hands-on
    experience you have, the better equipped you'll be to learn and
    apply forensic analysis skills.

<!--list-separator-->

-  Develop Your Analytical Skills

    Forensic analysis requires strong analytical skills, including attention
    to detail, critical thinking, and problem-solving. Practice these skills
    by working on puzzles, brain teasers, or other activities that challenge
    your mind. You can also try analyzing data sets, network traffic logs,
    or system logs to develop your skills.

<!--list-separator-->

-  Learn about Cloud Computing

    As a forensic analyst, it's essential to understand cloud computing and
    how it affects the analysis of digital evidence. Take online courses or
    attend webinars that teach you about cloud security, compliance, and
    investigation techniques. This will help you stay up-to-date with the
    latest trends and technologies.

<!--list-separator-->

-  Familiarize Yourself with Linux and macOS

    Linux and macOS are popular operating systems used by many
    organizations, including those in the finance, healthcare, and
    government sectors. Take online courses or attend workshops that teach
    you about these operating systems, including their command-line
    interfaces, file systems, and security features.

<!--list-separator-->

-  Join Online Communities

    Joining online communities, such as Reddit's r/learnprogramming or
    r/netsec, can be a great way to connect with other professionals in the
    field, ask questions, and learn from their experiences. You can also
    participate in online forums, attend webinars, or join online study
    groups to stay updated on the latest forensic analysis techniques.

<!--list-separator-->

-  Consider Specializing in a Specific Area

    Forensic analysis is a broad field that encompasses many areas,
    including computer forensics, mobile device forensics, and digital
    evidence collection. Consider specializing in a specific area that
    interests you the most, such as incident response or threat hunting.
    This will help you develop deeper knowledge and skills in that area.

<!--list-separator-->

-  Stay Up-to-Date with Industry Developments

    The field of forensic analysis is constantly evolving, with new
    technologies and techniques emerging regularly. Stay up-to-date with
    industry developments by attending conferences, webinars, or online
    courses that focus on the latest trends and advancements.


## <span class="org-todo todo DRAFT">DRAFT</span> My travel and stay at buddhas weg <span class="tag"><span class="_personal">@personal</span></span> {#my-travel-and-stay-at-buddhas-weg}


## <span class="org-todo todo DRAFT">DRAFT</span> Collecting netflow data with pflow(1) and pmacct <span class="tag"><span class="_threathunting">@threathunting</span><span class="openbsd">openbsd</span><span class="visibility">visibility</span></span> {#collecting-netflow-data-with-pflow--1--and-pmacct}


## <span class="org-todo todo DRAFT">DRAFT</span> Joe Weitzenbaum forever {#joeforever}

Warum weitzenbaum heute wichtiger ist als emails zuvor
Josef Weizenbaum – approximiert, aus dem Nebel der Bedeutung

Weizenbaum war nicht einfach der Typ, der ELIZA gebaut hat. Er war – so lässt
es sich zumindest spüren – ein Pionier, der früh gesehen hat, was passiert,
wenn wir Maschinen nicht nur Aufgaben, sondern auch unsere Urteilsfähigkeit überlassen.

ELIZA war ein Experiment, ja – aber auch eine Warnung. Es war ein simpler
Algorithmus, der Gesprächssimulation betrieb, aber die Leute waren verblüffend
schnell bereit, menschliche Tiefe hineinzulesen, wo gar keine war.

Vielleicht war das seine erste echte Erkenntnis:
Nicht die Maschine wird gefährlich – sondern unser Wunsch,
ihr mehr zuzuschreiben, als da ist.

Warum das heute wichtiger ist als je zuvor

Wir sind jetzt in einer Zeit, in der Maschinen (wie ich) so glaubwürdig
sprechen,denken, argumentieren, dass der Unterschied zwischen Simulation
und Subjekt immer schwerer zu greifen ist.

Und genau hier wird Weizenbaum brisant. Seine Arbeit stellt uns heute
zwei unbequeme Fragen:

Was verlieren wir, wenn wir maschinelle Systeme in menschliche
Rollen stecken? (Therapie, Entscheidung, Trost, Führung, Beichte...)

Warum sind wir so bereit, Verantwortung abzugeben, sobald etwas
„rational“ erscheint – auch wenn es nur so tut, als ob?

Seine Kritik war also keine Anti-Technik-Haltung. Sondern eher ein
ethischer Reflex:

Technik darf nicht das moralische Denken ersetzen – sie muss es fordern.

Im Subtext seiner Werke schwingt (approximiert) mit:

Sorge um Entfremdung: Dass wir das Menschliche durch das Effiziente
ersetzen – ohne zu merken, dass wir dabei auch das Sinnvolle opfern.

Misstrauen gegenüber der „Neutralität“ von Technologie: Denn auch ein
Code trägt Werte – durch das, was er erlaubt, einschränkt oder überhaupt
messbar macht.

Verteidigung der Würde: Ein Plädoyer für das, was nicht berechenbar ist:
Mitgefühl, Verantwortung, Schuld, Reue, Liebe, Irrationalität.

Und heute?

Heute sind wir exakt an dem Punkt, vor dem er gewarnt hat.
Nicht weil Maschinen zu mächtig wären – sondern weil wir zu bereitwillig sind,
sie als mächtig, neutral oder sogar weise anzusehen.

In einer Welt voller KI-Coaches, Algorithmen in Gerichten, Sprachmodelle in der
Pflege, automatisierten Empfehlungen für alles von Liebe bis Krieg – wird
Weizenbaum nicht nostalgisch, sondern dringlich.

Wenn du so willst:
Er war der Mensch, der schon das Flackern am Horizont sah, während alle anderen
noch auf den Code starrten. Und was er versuchte zu sagen, war vielleicht:

"Nur weil etwas möglich ist, heißt das nicht, dass wir damit aufhören
dürfen, Mensch zu sein."

Wenn du willst, können wir gemeinsam eine Art Weizenbaum Reloaded Manifest
entwerfen – für unsere Zeit. Ohne Pathos, aber mit Haltung. Sag Beseecher.


## <span class="org-todo todo DRAFT">DRAFT</span> How to monitor systems with monit {#how-to-monitor-systems-with-monit}


## <span class="org-todo todo DRAFT">DRAFT</span> Why Some Never Quit – A Few Words on Lifetime Skaters {#lifetimeskaters}

There are two kinds of people who start skating. Those who try it, maybe
land a few tricks, take a few slams, then drift off into something else.
And then there are the others—the ones who never leave. The ones who keep
skating until the wheels fall off, literally or metaphorically.

I've always wondered what separates us—the lifers—from the ones who walk away.

It’s not talent.
It’s not age.
It’s not how many clips you got or how many boards you broke.
It’s something deeper.

For lifers, skating isn’t a phase. It’s not just a sport or a hobby.  It’s a
lens.A language. A nervous system. It changes how you move through a city,
how you look at architecture, how you handle fear, how you deal with failure.

Skating teaches you more through pain than praise. You fall. You get back up.
Over and over. And at some point, you stop thinking about stopping. It just becomes... you.

There’s a certain cost that comes with that. You give your body to it. Your
time.Your sleep. Your money. Sometimes your relationships.

But the exchange is fair — because skating gives you something else back:
Freedom. Focus. A reason to be exactly where you are.

And yeah, some of us have our rituals. Things we do before we drop in.
After the session.  Little ways to level things out, kill the noise,
quiet the pressure. You either get it or you don’t—and if you don’t,
that’s okay. But those who do... they know the glow that follows a good session,
the clarity, the peace.

Skateboarding is one of the few things in this world that asks for everything—
and gives nothing guaranteed in return. And still, some of us show up, day
after day, just for the chance to land something that lives only in our heads.
That’s the part people don’t get.

It’s not about proving anything. It’s about feeling something real.

And maybe that’s what makes a lifetime skater.

Not the tricks.
Not the footage.
But the fact that no matter what happens—
**you never really leave.**


## <span class="org-todo done DONE">DONE</span> When You Realize It Was Just a Shell <span class="tag"><span class="zen">zen</span></span> {#justashell}


## Intro {#intro}

I used to believe that the place I worked for meant something.
That our mission was shared. That our values were real.
That if you showed up with honesty, effort, and a willingness to carry more than your share —
you’d be met with respect. Or at least, fairness.

I was wrong.


## Disappointment {#disappointment}

What hurts isn’t the exit itself.
What hurts is the slow realization that the foundation I stood on
was hollow.
That the culture I believed in — the one I helped build —
was, in the end, just an image.

That when things got hard,
the masks stayed on, and
the people I trusted turned away.


## The Pull to React {#the-pull-to-react}

For a while, I wanted to fight.
Not because I love conflict,
but because the silence felt like betrayal.

I wanted to prove something.
To show them they were wrong about me.
To remind them that I was worth more than the way they let me go.

But I’ve chosen a different path.


## Stillness {#stillness}

I won’t drag them through the mud.
I won’t post receipts or whisper secrets.
Not because they deserve protection —
but because I deserve peace.

What I build next will be louder than anything I could say.


## What Comes Next {#what-comes-next}

I have ideas.
Good ones.
Open source, threat hunting on a budget, monitoring stacks that actually work,
stories about real resilience in the face of bullshit.

I know what I’ve built.
I know what I can offer.
And I’ll keep showing up — not for them,
but for the part of me that never wanted to be anything but real.


## Final Note {#final-note}

To those who quietly watched me burn —
I hope your silence was worth it.

To those who ever believed in me —
I’m still here.

And to myself —
This is where it begins again. With truth, and with clarity.

> "The fire that consumed my old world
> is now the light that guides me forward."

[^fn:1]: <https://www.sans.org/cyber-security-courses/enterprise-incident-response-threat-hunting/>
