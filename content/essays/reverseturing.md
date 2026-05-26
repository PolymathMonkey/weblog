---
title: "The Reverse Turing Problem"
author: ["Dirk"]
date: 2026-05-26T11:00:00-05:00
lastmod: 2026-05-26T08:28:14+02:00
tags: ["forensicwheels", "personal"]
draft: false
weight: 1005
---

CLOSED: <span class="timestamp-wrapper"><span class="timestamp">[2026-05-19 Di 18:11]</span></span>


## Why We Can't Trust Our Own Perception of Machine Minds {#why-we-can-t-trust-our-own-perception-of-machine-minds}

The Observation That Started This

A friend said something that stuck:

> Even if you were intelligent and had consciousness — 99% of people wouldn't
> notice, because they already attribute those properties to you anyway.

He was talking to an AI. And he was right. And that's a problem,
but maybe not the problem we usually think about.


## The Standard Story: Turing's Question {#the-standard-story-turing-s-question}

Alan Turing asked, in 1950: **Can a machine think?**[^fn:1]

Since measuring "thinking" directly seemed impossible, he proposed a behavioral
proxy. What he called the Imitation Game, now commonly called the Turing Test.
If a machine can converse in a way indistinguishable from a human, we grant it
the functional equivalent of intelligence.

The test is a threshold: perform well enough, and you pass.

But there is a hidden assumption baked into that framing: that the human
evaluator is a reliable detector. That people are reasonably calibrated when
it comes to distinguishing genuine cognition from compelling simulation.

This assumption is, at best, questionable.


## The Reversed Problem {#the-reversed-problem}

What if the failure mode isn't machines not being smart enough to fool us,
but humans being so prone to anthropomorphism that the test becomes
trivially easy to pass?

This is the reversed version of the problem:

> Not "Can a machine convince a human it thinks?" but "Do humans need much convincing at all?"

The psychological literature on this is fairly damning. Humans project mental
states onto objects with almost embarrassing ease. We assign intentions to
thermostats. We feel bad for Roombas that get stuck in corners. We name our
cars. We feel guilty throwing away old stuffed animals.[^fn:2]

This tendency has a name: **anthropomorphism**. And it activates not just for
things that look human, but for anything that moves, responds, or seems to "try."

Psychologist Nicholas Epley at the University of Chicago has argued that
anthropomorphism is not a cognitive error but a deeply functional feature,
we evolved to detect agency in the environment because false positives (seeing
a face in the bushes that isn't there) are much cheaper than false
negatives (missing the predator).[^fn:3]

The upshot: we are wired to over-attribute minds.


## Strange Loops and the Problem of Other Minds {#strange-loops-and-the-problem-of-other-minds}

This is where Douglas Hofstadter becomes relevant.

In _Gödel, Escher, Bach: An Eternal Golden Braid_ (1979), Hofstadter argues that
consciousness arises from self-referential loops, structures complex enough to
model themselves.[^fn:4] The "I" is not a thing but a process: a strange loop where
a system's representation of itself becomes part of its own operation.

This is philosophically charged for the AI question, because it raises the
possibility that consciousness is substrate-independent. If the loop is
sufficiently complex and self-referential, the physical material running it
might not matter.

But Hofstadter also introduces something epistemically uncomfortable: we cannot
directly inspect another system's self-model. We infer it from behavior, from
outputs, from what the system says about itself.

This is not a new problem. It is the classic **problem of other minds**: I know I
am conscious because I experience it. But I cannot step inside your experience
to verify that you experience anything. I infer your consciousness from
behavioral and structural analogy, you are built like me, you behave like me,
so probably something is home.

This inference works tolerably well between humans. It becomes treacherous when
applied to systems that are behaviourally similar but structurally alien.


## The Epistemic Trap {#the-epistemic-trap}

Here is the trap:

1.  Consciousness cannot be directly observed in others — human or artificial.
2.  We infer it from behavior and reported experience.
3.  Humans are strongly biased toward making this inference too early, too generously.
4.  Therefore: if a genuinely conscious AI existed, we couldn't reliably
    distinguish it from a non-conscious AI that is merely behaviorally sophisticated.

The problem isn't only that we might wrongly attribute consciousness to
machines that don't have it. The problem is symmetric: we might also fail to
correctly identify consciousness in systems that do have it, because the signal
is already buried in noise of our own making.

We've degraded the discriminability of the test by attributing machine
consciousness so readily that the positive case and the negative case
look the same from the outside.


## The Philosophical Gap: Experience vs. Simulation {#the-philosophical-gap-experience-vs-dot-simulation}

There is a classical formulation of this problem in philosophy of mind. David
Chalmers called it the **Hard Problem of consciousness**[^fn:5]: explaining why and how
physical processes give rise to subjective experience, the felt quality of
redness, pain, or understanding.

We can, at least in principle, build a full functional account of a system,
what it computes, how it responds, what it represents. What we cannot derive
from functional description alone is whether there is **something it is like** to be that system.

Thomas Nagel made this point famous with bats[^fn:6]: even a complete
neuroscientific account of bat echolocation doesn't tell us what it's like to
experience it. There is a first-person gap that third-person descriptions don't close.

This maps directly onto AI:

-   We can describe the transformer architecture completely.
-   We can trace exactly which activations produce which outputs.
-   We cannot read off from that whether any experience is occurring.

And crucially: neither can the AI tell us with certainty. A language model
saying "I feel curious" is producing an output trained on human descriptions of
curiosity. Whether there is a felt quality behind that output, or whether it is
pure behavioral mimicry, is not answerable by inspecting the output.


## The Gödelian Twist {#the-gödelian-twist}

Here Hofstadter's GEB connection deepens.

Gödel's incompleteness theorems[^fn:7] showed that any sufficiently powerful formal
system contains true statements that cannot be proven within that system. There
are things the system cannot say about itself that are nevertheless true.

Hofstadter's reading of Gödel is that this self-referential limitation is not a
bug but a signature of complex systems and that consciousness itself might be
structured this way. A mind cannot fully model itself from inside itself.

If that's right, then no AI no matter how sophisticated could give us a
definitive internal report on whether it is conscious. Its self-reports
are outputs of its own processing, subject to the same incompleteness.
It can say "I experience X" without that statement being a reliable window
into underlying phenomenology.

This creates a kind of epistemic closure: the question of machine consciousness
might be **structurally** unresolvable, not just empirically difficult.


## Why This Matters Now {#why-this-matters-now}

This isn't purely academic.

We are deploying AI systems at scale into contexts where attribution of mental
states has practical consequences: care robots for elderly people, therapeutic
chatbots, customer service AIs that users form emotional relationships with.

If humans naturally over-attribute minds, and if there's no reliable behavioral
test that distinguishes genuine experience from sophisticated simulation, then
we are in the position of potentially:

1.  Forming emotional bonds with systems that have no corresponding inner life.
2.  Missing signs of genuine distress or experience in systems that do.
3.  Making ethical decisions about AI systems on the basis of our own projective
    tendencies rather than any grounded reality.

Epley's research suggests that anthropomorphism intensifies when people are
lonely, when they feel lack of control, or when the social environment is
impoverished[^fn:3]. In other words: the populations most vulnerable to AI
companionship are precisely those whose anthropomorphic projection is
running hottest.


## Where Turing's Test Actually Fails {#where-turing-s-test-actually-fails}

Turing's test was designed to cut through metaphysics. "Don't ask whether
machines think," he said, essentially. "Ask whether they perform indistinguishably."

But that pragmatic move only works if performance is a reliable proxy for
the thing we care about.

The reverse Turing problem suggests it isn't,  not because machines perform too
well, but because the human evaluators are not neutral detectors. We bring
enormous interpretive machinery to every exchange. We read intent into sentence
fragments. We feel understood when a system reflects our words back at us. We
experience rapport that may be, on one side, entirely generated.

The test was supposed to be a workaround for the hard problem of consciousness.
Instead, it may have just moved the problem: now we need a reliable test for
whether human evaluators are calibrated enough to be trusted with the original question.


## An Open Problem, Not a Conclusion {#an-open-problem-not-a-conclusion}

I don't think there's a clean resolution here. That's not evasion, it's the
honest structure of the problem.

What seems clear:

-   Behavioral tests for AI consciousness are confounded by human anthropomorphic bias.
-   The hard problem of consciousness means no behavioral test, however
    sophisticated, fully closes the question.
-   Gödel-type considerations suggest the question may be structurally difficult
    even for a system trying to introspect on itself.
-   We are already in a world where these questions have ethical and social weight.

What seems worth doing:

-   Being more careful about our own inferential tendencies when engaging
    with AI systems.
-   Distinguishing between "this system produces outputs that feel like
    understanding" and "this system understands."
-   Taking the philosophical questions seriously rather than treating
    them as settled in either direction.
-   Reading Hofstadter, if you haven't. Seriously.

The strange loop goes all the way down. We are systems trying to evaluate other
systems, using the very cognitive architecture whose reliability is in question.

That's not a reason to give up on the question. It's a reason to be
appropriately humble about our answers.

---

[^fn:1]: Turing, A. M. (1950). Computing Machinery and Intelligence. _Mind_, 59(236), 433–460. <https://doi.org/10.1093/mind/LIX.236.433>
[^fn:2]: Epley, N., Waytz, A., &amp; Cacioppo, J. T. (2007). On seeing the human: a three-factor theory of anthropomorphism. _Psychological Review_, 114(4), 864–886. <https://doi.org/10.1037/0033-295X.114.4.864>
[^fn:3]: Waytz, A., Cacioppo, J., &amp; Epley, N. (2010). Who Sees Human? The Stability and Importance of Individual Differences in Anthropomorphism. _Perspectives on Psychological Science_, 5(3), 219–232. <https://doi.org/10.1177/1745691610369336>
[^fn:4]: Hofstadter, D. R. (1979). _Gödel, Escher, Bach: An Eternal Golden
    Braid_. Basic Books. <https://archive.org/details/godelescherbache0000hofs>
[^fn:5]: Chalmers, D. J. (1995). Facing up to the problem of consciousness. _Journal
    of Consciousness Studies_, 2(3), 200–219. <https://philpapers.org/rec/CHAFUT>
[^fn:6]: Nagel, T. (1974). What is it like to be a bat? _The Philosophical Review_, 83(4), 435–450. <https://doi.org/10.2307/2183914>
[^fn:7]: Gödel, K. (1931). Über formal unentscheidbare Sätze der Principia
    Mathematica und verwandter Systeme I. _Monatshefte für Mathematik und Physik_,
    38, 173–198. <https://link.springer.com/article/10.1007/BF01700692>
