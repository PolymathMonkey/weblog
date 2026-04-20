---
title: "The unseen hero of OpenBSD"
author: ["Dirk"]
date: 2026-04-20T17:09:00+02:00
lastmod: 2026-04-20T17:13:00+02:00
tags: ["forensicwheels", "openbsd"]
draft: false
weight: 1001
---

## The unseen hero of OpenBSD: OpenBSD's malloc {#the-unseen-hero-of-openbsd-openbsd-s-malloc}


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

I stipped away the MALLOC_STATS, you can find the full struct defintion [here](https://github.com/openbsd/src/blob/master/lib/libc/stdlib/malloc.c#L233)


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

Slot selection within a chunk page uses the `rbytes` pool from
`dir_info`. Which specific slot you get is not deterministic.


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

When you see these values in a crash dump, you know immediately what
kind of bug you're looking at.

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
