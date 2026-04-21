---
title: "The unseen hero of OpenBSD"
author: ["Dirk"]
date: 2026-04-20T17:09:00+02:00
lastmod: 2026-04-21T16:02:27+02:00
tags: ["forensicwheels", "openbsd"]
draft: false
weight: 1005
---

## The unseen hero of OpenBSD: otto's malloc {#the-unseen-hero-of-openbsd-otto-s-malloc}


### What this is about {#what-this-is-about}

This is me learning about OpenBSD's malloc.

I want to understand the internals better, the data structures, the design
decisions, and why those decisions make heap exploitation so much
harder.

This is an actual Neurodivergent person with dyslexia trying to learn this

---


### What malloc actually does {#what-malloc-actually-does}

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


### How we got here {#how-we-got-here}


#### The original: sbrk() and one big heap {#the-original-sbrk-and-one-big-heap}

Early Unix allocators used `sbrk()`, a syscall that extends the
process's data segment upward.

Think of it as a stack of memory growing in one direction.

All allocations lived in one contiguous block. Predictable layout.
Fast. And a security problem, because attackers could reason about
where things would be in memory.


#### 2001: mmap instead of sbrk {#2001-mmap-instead-of-sbrk}

Thierry Deval rewrote OpenBSD's malloc to use `mmap()` instead.

`mmap()` is a syscall that requests a fresh page (4k Bytes on x86/64) of memory from the
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


#### It starts with `struct dir_info` {#it-starts-with-struct-dir-info}

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
`dir_info` because the canaries would catch that.


#### The metadata is not next to your data {#the-metadata-is-not-next-to-your-data}

This is the key architectural decision.

In glibc's allocator, chunk headers sit immediately before user data.
If you overflow your buffer, you can overwrite that metadata. Classic
heap exploits are built on exactly this.

In otto-malloc, `dir_info` and `chunk_info` live in completely separate
`mmap` regions. There is no chunk header adjacent to user data.


#### Small allocations: chunks and buckets {#small-allocations-chunks-and-buckets}

Allocations smaller than half ( &gt; 2k ) a page go into chunk pages.

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
written to memory that has just been freed.

Both values have the high bit set in each nibble, which makes them immediately
suspicious when interpreted as pointers, ASCII strings, or integer values. An
attacker cannot silently exploit these memory regions because the junk values
will immediately cause dereferencing failures or type confusion that crashes
the program.

---


### The defense mechanisms, together {#the-defense-mechanisms-together}


#### Guard pages (`G`) {#guard-pages--g}

“Guard”. Enable guard pages. Each page size or larger allocation is followed
by a guard page that will cause a segmentation fault upon any access.

```sh
sysctl vm.malloc_conf='G'
```


#### Junk filling (`J` / `j`) {#junk-filling--j-j}

J: “Junk”. Fill some junk into the area allocated. Currently junk is bytes of 0xd0 when allocating; this is pronounced “Duh”. :-) Freed chunks are filled with 0xdf.
j: “Don't Junk”. By default, small chunks are always junked, and the first part of pages is junked after free. This option ensures that no junking is performed.

```sh
sysctl vm.malloc_conf='JJ'
```


#### Realloc (`R`) {#realloc--r}

Always reallocate when realloc() is called, even if
the initial allocation was big enough. This can substantially
aid in compacting memory.

```sh
sysctl vm.malloc_conf='R'
```


#### Use-after-free protection (`F`) {#use-after-free-protection--f}

Enable use after free detection. Unused pages on the freelist
are read and write protected to cause a segmentation fault upon access.

This will also switch off the delayed freeing of chunks, reducing random
behaviour but detecting double free() calls as early as possible.

```sh
sysctl vm.malloc_conf='F'
```

Full list of [malloc options](https://man.openbsd.org/OpenBSD-5.6/malloc.conf.5#MALLOC_OPTIONS)

---


### Why classic heap exploits fail here {#why-classic-heap-exploits-fail-here}

The [unsafe unlink](https://heap-exploitation.dhavalkapil.com/attacks/unlink_exploit) exploit technique against glibc relies on predictable
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


### What I took away {#what-i-took-away}

This was a fun project, I learned a lot about how the allocator in bsd protects
the user from heap exploits.

---


### References {#references}

-   [OpenBSD malloc manual](https://man.openbsd.org/OpenBSD-6.5/malloc)
-   [malloc.conf documentation](https://man.openbsd.org/OpenBSD-5.6/malloc.conf.5)
-   [Otto Moerbeek's malloc design talk (EuroBSDCon 2023)](https://www.openbsd.org/papers/eurobsdcon2023-otto-malloc.pdf)
-   [Summary of OpenBSD malloc evolution](https://isopenbsdsecu.re/mitigations/malloc/)
-   [malloc.c source](https://github.com/openbsd/src/blob/master/lib/libc/stdlib/malloc.c)
-   [Unlink exploit explanation](https://heap-exploitation.dhavalkapil.com/attacks/unlink_exploit)

---

{{< giscus >}}
