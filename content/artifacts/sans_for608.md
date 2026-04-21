---
title: "Sans FOR608"
author: ["Dirk"]
date: 2026-03-20T07:39:00+01:00
lastmod: 2026-04-21T06:48:30+02:00
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
- [The unseen hero of OpenBSD: otto's malloc](#the-unseen-hero-of-openbsd-otto-s-malloc)
    - [What this is about](#what-this-is-about)
    - [Start here: what malloc actually does](#start-here-what-malloc-actually-does)
    - [A brief history: how we got here](#a-brief-history-how-we-got-here)
    - [The internal structure](#the-internal-structure)
    - [The defense mechanisms, together](#the-defense-mechanisms-together)
    - [Why classic heap exploits fail here](#why-classic-heap-exploits-fail-here)
    - [Comparison with other allocators](#comparison-with-other-allocators)
    - [What I took away from this](#what-i-took-away-from-this)
    - [References](#references)

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


## The unseen hero of OpenBSD: otto's malloc {#the-unseen-hero-of-openbsd-otto-s-malloc}


### What this is about {#what-this-is-about}

This is me learning about OpenBSD's malloc.

I try not to do a surface-level overview.

I want to understand the internals better, the data structures, the design
decisions, and why those decisions make heap exploitation so much
harder.

---


### Start here: what malloc actually does {#start-here-what-malloc-actually-does}

Every C program that needs memory at runtime calls `malloc`.

`malloc` is a library function. It's not a syscall -- it's a layer
between your code and the kernel.

When you write:

```c
char *buf = malloc(64);
```

...you're asking the allocator to find 64 bytes somewhere, hand you a
pointer, and track that those bytes are in use.

When you call `free(buf)`, you're telling the allocator those bytes are
available again.

That's the contract. The allocator manages that contract.

The question is: what happens when the contract is violated?

A buffer overflow writes past the end of `buf`.
A use-after-free reads from `buf` after it's been freed.
A double free calls `free(buf)` twice.

With a naive allocator, these bugs are often silent. The program keeps
running with corrupted state. That corrupted state is what attackers
exploit.

OpenBSD's malloc is designed to make these bugs loud, to turn silent
corruption into immediate, reproducible crashes.

---


### A brief history: how we got here {#a-brief-history-how-we-got-here}


#### The original: sbrk() and one big heap {#the-original-sbrk-and-one-big-heap}

Early Unix allocators used `sbrk()`, a syscall that extends the
process's data segment upward.

Think of it as a stack of memory growing in one direction.

All allocations lived in one contiguous block. Predictable layout.
Fast. And a security problem, because attackers could reason about
where things would be in memory.


#### 2001: mmap instead of sbrk {#2001-mmap-instead-of-sbrk}

Thierry Deval rewrote OpenBSD's malloc to use `mmap()` instead.

`mmap()` is a syscall that requests a fresh page of memory from the
kernel. Unlike `sbrk()`, it doesn't have to extend a single contiguous
block. Each call can land anywhere in the address space.

This was the first major break from the "one big heap" model.


#### 2008: Otto Moerbeek's rewrite {#2008-otto-moerbeek-s-rewrite}

Otto Moerbeek did a near-complete redesign.

This is the allocator OpenBSD ships today. It's called "otto-malloc"
informally.

The focus: safety, randomness, metadata integrity, and defined failure
behavior. Not performance. Safety.


#### After 2008: continued hardening {#after-2008-continued-hardening}

The design didn't freeze in 2008. Relevant additions since then:

-   Chunk canaries
-   Delayed free lists
-   Use-after-free protection for large allocations
-   Per-thread pools
-   `malloc_readonly` in a read-only mapping

---


### The internal structure {#the-internal-structure}


#### Everything starts with `struct dir_info` {#everything-starts-with-struct-dir-info}

Every malloc pool is represented by one `struct dir_info`.

`dir_info` is the central bookkeeping structure. It tracks:

-   Where all the allocated regions are
-   Which small-allocation slots are free
-   The delayed-free queue
-   A buffer of random bytes used for randomizing slot selection
-   Two canary values that sandwich the struct

Here you find the complete [struct definition](https://github.com/openbsd/src/blob/master/lib/libc/stdlib/malloc.c#L151%20)

```c
struct dir_info {
    u_int32_t canary1;
    int active;			/* status of malloc */
    struct region_info *r;		/* region slots */
    size_t regions_total;		/* number of region slots */
    size_t regions_free;		/* number of free slots */
    size_t rbytesused;		/* random bytes used */
    const char *func;		        /* current function */
    int malloc_junk;		         /* junk fill? */
    int mmap_flag;			/* extra flag for mmap */
    int mutex;
    int malloc_mt;			/* multi-threaded mode? */
    /* lists of free chunk info structs */
    struct chunk_head chunk_info_list[BUCKETS + 1];
    /* lists of chunks with free slots */
    struct chunk_head chunk_dir[BUCKETS + 1][MALLOC_CHUNK_LISTS];
    /* delayed free chunk slots */
    void *delayed_chunks[MALLOC_DELAYED_CHUNK_MASK + 1];
    u_char rbytes[32];		/* random bytes */
    /* free pages cache */
    struct smallcache smallcache[MAX_SMALLCACHEABLE_SIZE];
    size_t bigcache_used;
    size_t bigcache_size;
    struct bigcache *bigcache;
    void *chunk_pages;
    size_t chunk_pages_used;
    #ifdef MALLOC_STATS
    ...snip..
    #endif /* MALLOC_STATS */
    u_int32_t canary2;
};
```

The canaries are the first and last fields. If anything corrupts
`dir_info`, the integrity check fires and the allocator aborts.


#### The global config lives in read-only memory {#the-global-config-lives-in-read-only-memory}

```c
  struct malloc_readonly {
    /* Main bookkeeping information */
    struct dir_info *malloc_pool[_MALLOC_MUTEXES];
    u_int malloc_mutexes;	/* how much in actual use? */
    int malloc_freecheck;	/* Extensive double free check */
    int malloc_freeunmap;	/* mprotect free pages PROT_NONE? */
    int def_malloc_junk;	/* junk fill? */
    int malloc_realloc;	/* always realloc? */
    int malloc_xmalloc;	/* xmalloc behaviour? */
    u_int chunk_canaries;	/* use canaries after chunks? */
    int internal_funcs;	/* use better recallocarray/freezero? */
    u_int def_maxcache;	/* free pages we cache */
    u_int junk_loc;		/* variation in location of junk */
    size_t malloc_guard;	/* use guard pages after allocations? */
    #ifdef MALLOC_STATS
    ...snip...
    #endif
    u_int32_t malloc_canary;	/* Matched against ones in pool */
};
```

I stipped away the MALLOC_STATS, you can find the full struct defintion [here](https://github.com/openbsd/src/blob/master/lib/libc/stdlib/malloc.c#L233).

Why is this structure in read-only memory? An attacker cannot directly corrupt
`dir_info` because the canaries would catch that. However, if `malloc_readonly`
were writable, an attacker could disable security features. For example,
setting `malloc_freecheck` to zero would silence double-free detection. Setting
`malloc_freeunmap` to zero would allow use-after-free bugs tosucceed silently.
To prevent this, the entire configuration structure lives in a read-only memory
region, established via `mprotect(PROT_READ)` after initialization. The kernel
will refuse any write attempt to this segment, forcing any exploit to crash
rather than succeed.


#### The metadata is not next to your data {#the-metadata-is-not-next-to-your-data}

This is the key architectural decision.

In glibc's allocator, chunk headers sit immediately before user data.
If you overflow your buffer, you can overwrite that metadata. Classic
heap exploits are built on exactly this.

In otto-malloc, `dir_info` and `chunk_info` live in completely separate
`mmap` regions. There is no chunk header adjacent to user data.


#### Small allocations: chunks and buckets {#small-allocations-chunks-and-buckets}

Allocations smaller than half a page go into chunk pages.

A chunk page is one `mmap`'d page divided into uniform slots of the
same size. Each chunk page is described by a `struct chunk_info`.

<https://github.com/openbsd/src/blob/master/lib/libc/stdlib/malloc.c#L217>

```c
  struct chunk_info {
        LIST_ENTRY(chunk_info) entries;
        void *page;			/* pointer to the page */
        /* number of shorts should add up to 8, check alloc_chunk_info() */
        u_short canary;
        u_short bucket;
        u_short free;			/* how many free chunks */
        u_short total;			/* how many chunks */
        u_short offset;			/* requested size table offset */
#define CHUNK_INFO_TAIL			3
        u_short bits[CHUNK_INFO_TAIL];	/* which chunks are free */
};
```

The `bits` member deserves closer attention. It is a bitset composed of three
`u_short` elements, totaling 48 bits. Each bit represents one slot within the
chunk page. A bit value of 1 means the slot is free and available for
allocation.

A bit value of 0 means the slot is already allocated. This allows a single
`chunk_info` structure to manage up to 48 chunks per page. When the allocator
needs to place a new small allocation, it scans the bitset to find a free
slot. The comment "number of shorts should add up to 8" refers to a deliberate
size constraint. The entire `chunk_info` structure, including canary, bucket,
free, total, offset, and the 6 bytes for the bits array, totals exactly 18
bytes.

This fixed, predictable size is not an accident. A structure this compact means
that any corruption to `chunk_info` will immediately violate the surrounding
memory layout expectations, triggering the canary check and causing the
allocator to abort.

Slot selection within a chunk page uses the `rbytes` pool from `dir_info`. The
allocator does not simply take the first free slot. Instead, it hashes or
randomly indexes into the available slots, ensuring that attackers cannot
predict where your allocation will land. Which specific slot you get is
not deterministic.


#### Large allocations: their own mmap region {#large-allocations-their-own-mmap-region}

Allocations at or above one page get their own dedicated `mmap` region.

When freed, they can go back to the kernel via `munmap`. Any dangling
pointer to that address will fault on the next access.


#### The junk fill values {#the-junk-fill-values}

<https://github.com/openbsd/src/blob/master/lib/libc/stdlib/malloc.c#L97>

```c
#define SOME_JUNK      0xdb  /* written on fresh allocation */
#define SOME_FREEJUNK  0xdf  /* written before free */
```

When you see these values in a crash dump or debugger, you know immediately
what kind of bug you are looking at. The value 0xdb (11011011 in binary) is
written to freshly allocated memory. The value 0xdf (11011111 in binary) is
written to memory that has just been freed. Both values have the high bit set
in each nibble, which makes them immediately suspicious when interpreted as
pointers, ASCII strings, or integer values. An attacker cannot silently exploit
these memory regions because the junk values will immediately cause
dereferencing failures or type confusion that crashes the program.

---


### The defense mechanisms, together {#the-defense-mechanisms-together}


#### Guard pages (`G`) {#guard-pages--g}

An unmapped page placed after each page-size-or-larger allocation.

```sh
sysctl vm.malloc_conf='G'
```


#### Junk filling (`J` / `j`) {#junk-filling--j-j}

Level 1: freed memory gets filled with `0xdf`.
Level 2: freshly allocated memory also gets filled with `0xdb`.

```sh
sysctl vm.malloc_conf='JJ'
```


#### Redzones (`R`) {#redzones--r}

Small allocations get padding. The canary check on free catches
anything written into that padding.

```sh
sysctl vm.malloc_conf='R'
```


#### Use-after-free protection (`F`) {#use-after-free-protection--f}

Freed pages get `mprotect`'d to `PROT_NONE` before entering the cache.

```sh
sysctl vm.malloc_conf='F'
```


#### Combining flags {#combining-flags}

```sh
# Strong development / fuzzing setup
sysctl vm.malloc_conf='GJJRF'

# Shorthand: all security-relevant options at once
sysctl vm.malloc_conf='S'
```

---


### Why classic heap exploits fail here {#why-classic-heap-exploits-fail-here}

The `unsafe unlink` technique against glibc relies on predictable
adjacency between allocations and in-band metadata.

Against otto-malloc this fails because:

1.  No predictable adjacency between allocations
2.  No in-band metadata to corrupt
3.  Chunk canary fires on free if overflow crosses a boundary
4.  Guard page for large allocations catches overflows immediately

None of these individually make exploitation impossible. Together, they
eliminate the determinism exploitation depends on.

---


### Comparison with other allocators {#comparison-with-other-allocators}

| Feature                  | OpenBSD malloc    | glibc malloc         | jemalloc       |
|--------------------------|-------------------|----------------------|----------------|
| Metadata location        | out-of-band       | in-band              | in-band        |
| Randomization            | high              | limited              | varies         |
| Guard pages              | optional          | rarely default       | rarely default |
| Use-after-free detection | strong            | limited              | limited        |
| Failure mode             | abort             | undefined/continuing | undefined      |
| Performance priority     | safety &gt; speed | speed                | speed          |

---


### What I took away from this {#what-i-took-away-from-this}

The design is coherent. Every decision points in the same direction.

Metadata out-of-band. Randomized placement. Read-only config.
Canaries on bookkeeping structures. Junk fill. Guard pages.
Fail fast on any inconsistency.

Together they add up to an allocator that treats memory misuse as a
hard contract violation rather than undefined behavior you get to
exploit later.

---


### References {#references}

-   [OpenBSD malloc manual](https://man.openbsd.org/OpenBSD-6.5/malloc)
-   [malloc.conf documentation](https://man.openbsd.org/OpenBSD-5.6/malloc.conf.5)
-   [Otto Moerbeek's malloc design talk (EuroBSDCon 2023)](https://www.openbsd.org/papers/eurobsdcon2023-otto-malloc.pdf)
-   [Summary of OpenBSD malloc evolution](https://isopenbsdsecu.re/mitigations/malloc/)
-   [malloc.c source](https://github.com/openbsd/src/blob/master/lib/libc/stdlib/malloc.c)

---

{{< giscus >}}

[^fn:1]: <https://www.sans.org/cyber-security-courses/enterprise-incident-response-threat-hunting/>

    {{< giscus >}}

    w\* DONE The unseen hero of OpenBSD                                                       :openbsd:
    CLOSED: <span class="timestamp-wrapper"><span class="timestamp">[2026-04-20 Mo 17:09]</span></span>

    :EXPORT_AUTHOR: Dirk
    :EXPORT_HUGO_FRONT_MATTER_FORMAT: yaml
    :HUGO_TITLE: OpenBSD-malloc
    :HUGO_MENU_TITLE: openbsdmalloc
    :HUGO_CHAPTER: true
    :HUGO_WEIGHT: 5
    :EXPORT_FILE_NAME: openbsdmalloc
    :EXPORT_DATE: 2025-12-09T08:48:00-05:00
    :CUSTOM_ID: openbsdmalloc
