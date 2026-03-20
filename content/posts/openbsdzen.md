---
title: "Open BSD and Zen"
author: ["Dirk"]
date: 2025-06-28T12:48:00+02:00
lastmod: 2026-03-20T07:40:37+01:00
tags: ["forensicwheels", "openbsd", "zen"]
categories: ["personal"]
draft: false
weight: 1005
---

## OpenBSD and Zen {#about}

I've been using OpenBSD for a long time.

I've been sitting Zen for about two years, in the tradition of Seungsahn,
with Ryōkan as a guide.

Nobody asked me to connect these two things. But they kept connecting
themselves.

{{< figure src="../img/puffy77.gif" >}}

This is me trying to say why.

---


## Less is not a compromise {#less-is-not-a-compromise}

OpenBSD ships without a lot of things other systems include by default.

That's a choice. Every piece of code that isn't there is a piece of code
that can't have a vulnerability. Every feature you don't ship is a surface
you don't have to defend.

The OpenBSD developers call this "correct by default". I'd call it
knowing what you actually need.

Zen works the same way.

Zazen — sitting meditation — is almost nothing. You sit. You follow your
breath. You don't try to achieve anything. You don't add anything.
Whatever arises, you don't chase it.

What's left when you stop adding is not emptiness. It's clarity.

Ryōkan spent most of his life in a small hut on a mountain, owning
almost nothing, writing poems about moon and rain and loneliness. He
wasn't poor in spirit. He was clear.

> What is there
> I can give you?
> Take this handful of snow.
> — Ryōkan

I think about that poem when I look at OpenBSD's base system.
Take what's here. It's enough.

---


## Correctness is not perfectionism {#correctness-is-not-perfectionism}

Every commit to OpenBSD goes through code review. Not as a process checkbox
— as a genuine practice. Someone reads what you wrote. They question it.
The code changes or it doesn't go in.

This is not about perfection. Bugs exist in OpenBSD. Always have.

It's about care. About not shipping something you haven't looked at.
About taking responsibility for what you put into the world.

In Zen, this shows up as attention to the thing in front of you.

Not the thing you're planning. Not the thing you finished an hour ago.
This breath. This step. This line of code.

The enso — the Zen circle, brushed in one stroke — is never geometrically
perfect. That's not the point. The point is that it's fully committed.
The brush doesn't hesitate.

{{< figure src="../img/enso1.jpg" >}}

A half-committed security decision is worse than no decision.
A half-present sitting is still a sitting.

The practice is showing up and being honest about what you find.

---


## What breaks is information {#what-breaks-is-information}

OpenBSD's malloc aborts the process when it detects memory corruption.

Not silently. Not gracefully. It stops.

That sounds harsh. It's actually kind. A crash you can see is a bug you
can fix. A crash that doesn't happen is a vulnerability waiting to be
found by someone else.

The system is designed to surface what's wrong rather than paper over it.

Zen does this too, differently.

When you sit long enough, what comes up is not peace. First it's
restlessness. Then it's the things you've been avoiding thinking about.
Then, maybe, something quieter.

The discomfort is not the problem. The discomfort is the practice.

Seungsahn used to say: don't know. Not as an excuse — as a posture.
Hold the question. Don't rush to an answer that makes you comfortable.

I've spent a lot of my career watching people paper over problems.
Log the error and move on. Silence the alert. Call the risk acceptable.

OpenBSD's default answer to uncertainty is: stop and look.

That's a Zen answer.

---


## A note on this comparison {#a-note-on-this-comparison}

I'm not saying the OpenBSD developers are Zen practitioners.

I'm not saying Zen is a system design philosophy.

What I'm saying is that I find the same posture in both: take less,
commit fully, don't hide what breaks.

That's a way of being in the world. I've found it in a terminal and
on a cushion. That's enough for me.

{{< giscus >}}
