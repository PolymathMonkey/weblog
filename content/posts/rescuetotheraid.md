---
title: "Rescue to the softraid"
author: ["Dirk"]
date: 2025-10-15T19:03:00+02:00
lastmod: 2025-12-18T12:36:40+01:00
tags: ["forensicwheels", "personal", "openbsd"]
categories: ["forensic"]
draft: false
weight: 1008
---

## Introduction {#introduction}

So I had this USB Disk attached to my OpenBSD Router used as storage, one saturday when I was walking by
I noticed the weird clicking sounds from the disk. So I knew my time was running before the disc would fail.

Curiously, when I plugged the same drive into a Linux box, it **was** detected and even
showed a valid OpenBSD partition table. That gave me a glimmer of hope:
maybe the hardware wasn’t completely dead yet.

So, for fun (and a little bit of stubborn curiosity), I decided to spend
the weekend seeing how much I could rescue from it.

This post documents the process part forensic experiment, part recovery attempt,
and part “let’s see what happens if I do this.”


## Phase 1: Identifying the Disk under Linux {#phase-1-identifying-the-disk-under-linux}

Before doing anything risky, I wanted to be sure I was imaging the **right** disk.
The idea was to identify the OpenBSD partition and dump it to an image file.


### Listing block devices {#listing-block-devices}

```sh
lsblk -o NAME,SIZE,FSTYPE,TYPE,LABEL,UUID
```

That gives a good overview which disks are present, how large they are, and what filesystems they contain.
Sure enough, my external USB drive showed up as /dev/sda.


### Inspecting partition table {#inspecting-partition-table}

```sh
sudo fdisk -l /dev/sda
```

Example output:

```text
Disk /dev/sda: 931.5 GiB, 1000204883968 bytes, 1953525164 sectors
Disk model: External USB 3.0
Sector size: 512 bytes
Disklabel type: dos
Device     Boot Start        End    Sectors   Size Id Type
/dev/sda4  *       64 1953525163 1953525100 931.5G a6 OpenBSD
```

Perfect. The OpenBSD partition was still there (/dev/sda4), and it even reported the correct size.

-   The **Start sector** (64) is important later for offset calculations.
-   Type **a6 OpenBSD** confirmed the filesystem was OpenBSD-specific (likely softraid).
-   Knowing the **sector size** (512 bytes) ensured that later tools like **dd** or **ddrescue** wouldn’t misalign reads.

At this point, the goal was to make a **bit-for-bit copy** of that partition, compress it, and work
on the image rather than risk further damage to the actual disk.


## Phase 2: Creating a Compressed Disk Image {#phase-2-creating-a-compressed-disk-image}

For imaging, I decided to use GNU `ddrescue` it’s great for flaky disks and can retry sectors intelligently.


### Installing ddrescue {#installing-ddrescue}

On Fedora, installation was trivial:

```sh
sudo dnf install ddrescue
```


### First Attempt (Quick and Dirty) {#first-attempt--quick-and-dirty}

I tried a fast, one-shot dump not ideal for a failing disk, but I wanted to see if it would work at all:

```sh
sudo ddrescue -d -r3 /dev/sda4 - - | xz -T0 -c > openbsd_sda4.img.xz
```

That command streams data directly from the device, compresses it with `xz`, and writes the result.
It works **if the disk is healthy**. Mine wasn’t, so it failed partway through.


### Second Attempt (Proper Forensic Mode) {#second-attempt--proper-forensic-mode}

So I switched to the safer, resumable method:

```sh
sudo ddrescue -d -r3 /dev/sda4 openbsd_sda4.img openbsd_sda4.log
xz -T0 openbsd_sda4.img
sha256sum openbsd_sda4.img > openbsd_sda4.img.sha256
```

This time, ddrescue created a detailed log file so I could resume later if the system froze or the disk disconnected.
It took most of the night, but eventually I had a clean (or mostly clean) image.

<span class="underline">Explanation of parameters</span>

-   `-r3` retries each bad block 3 times
-   `-d` enables direct disk I/O
-   The **.log** file lets you stop and restart without losing progress
-   `xz -T0` uses all CPU cores for compression

After the dump, I verified the output:

```sh
ls -lh openbsd_sda4.img.xz
xz -t openbsd_sda4.img.xz   # test integrity
sha256sum openbsd_sda4.img.xz > openbsd_sda4.img.xz.sha256
```

Everything checked out a ~450 GB compressed image file safely sitting on my main system.


## Phase 3: Simulating Disk Damage (For Fun and Testing) {#phase-3-simulating-disk-damage--for-fun-and-testing}

Since the real disk was unstable, I wanted a safe way to experiment.
So I created a **copy of the image** and simulated damage to practice recovery techniques.


### Creating the test image {#creating-the-test-image}

```sh
sudo dd if=/dev/sda4 of=openbsd_sda4.img bs=4M status=progress
```


### Simulating corruption {#simulating-corruption}

To emulate bad sectors:

```sh
dd if=/dev/zero of=openbsd_sda4.img bs=512 count=10 seek=1000 conv=notrunc
```

Now the image contained 10 intentionally corrupted sectors perfect for testing.


### Recovering from the damaged image {#recovering-from-the-damaged-image}

```sh
ddrescue -d -r3 openbsd_sda4.img openbsd_sda4_recovered.img openbsd_sda4_recovery.log
```

And just like that, I was able to practice recovery without touching the actual hardware again.


### Optional Compression {#optional-compression}

```sh
xz -T0 openbsd_sda4.img
```

It’s amazing how much you can still do with raw disk images and a few tools.


## Phase 4: Performance Tuning and System Stability {#phase-4-performance-tuning-and-system-stability}

During the rescue, I learned (the hard way) that `ddrescue` can saturate I/O and make your system lag like crazy.
So I ended up using this combination for a gentler approach:

```sh
sudo ionice -c2 -n7 nice -n19 ddrescue -b 4096 -B 4096 /dev/sda4 openbsd_sda4.img
```

And, for long operations, running it inside `tmux`:

```sh
tmux new-session -s rescue
sudo ddrescue -d -r3 /dev/sda4 openbsd_sda4.img openbsd_sda4.log
# Detach with Ctrl-B D
```

Later, I could simply:

```sh
tmux attach -t rescue
```

That setup saved me more than once when I accidentally closed an SSH session.


## Phase 5: Next Steps — Future Analysis {#phase-5-next-steps-future-analysis}

Once I had a full image, the plan was to:

1.  Decompress it (`unxz openbsd_sda4.img.xz`)
2.  Attach it as a loopback device under Linux, or use `vnconfig` under OpenBSD
3.  Attempt to reassemble the `softraid` volume using `bioctl`
4.  If all goes well — mount the decrypted filesystem and access my old data

That’s a topic for another weekend. But getting to this
point already felt like a small victory.


## Conclusion {#conclusion}

What started as a “let’s see if I can still read this disk” experiment turned into
a proper mini-forensics exercise. Even though the original USB drive was dying,
I managed to preserve most of its data and learned a ton in the process.

Allover it was quite fun to do something forensics related on a OpenBSD target, I guess it is
something you don't come across everyday but when you do its good to be prepared I think.

Key takeaways:

-   `ddrescue` is your friend for unstable media
-   Always work on **images**, not the original device
-   Compression and checksums are cheap insurance
-   And most importantly: never underestimate what you can recover with a bit of patience

Not a bad way to spend a weekend. Nevertheless I would like to find a purely OpenBSD Based solution.
But I was not able to find the dd_rescue in the ports and packages of OpenBSD. If someone knows how
to do this on purely OpenBSD please contact me.


## Appendix {#appendix}


### Device summary {#device-summary}

-   Device: /dev/sda
-   Partition: /dev/sda4
-   Size: ~931 GiB
-   Partition type: a6 (OpenBSD)
-   Start sector: 64
-   Sector size: 512 bytes


### Estimated time and storage {#estimated-time-and-storage}

Depending on USB speed:

-   Imaging took about 2–3 hours
-   Compressed image size: ~40–60% of original


### Tools used {#tools-used}

-   `dd`, `ddrescue`, `xz`
-   `fdisk`, `lsblk`, `sha256sum`
-   `tmux`, `ionice`, `dstat`, `iotop`

---

{{< giscus >}}
