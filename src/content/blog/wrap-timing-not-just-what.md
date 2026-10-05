---
title: "Wrapping Doesn't Just Depend on What — It Depends on When"
description: "I foiled a brisket right as the plateau looked like it was finally breaking on its own, feeling clever about it. The model says I picked almost exactly the one moment that wrap could do nothing for me."
pubDate: '2026-08-09'
heroImage: '/blog/wrap-timing-not-just-what.jpg'
pillar: myth-bust
protein: [beef_brisket]
---

Rode out a stall longer than usual on purpose, chasing bark, then wrapped in foil the second the temperature finally twitched upward again: figured I'd get the crutch's full push right as I needed it most. The brisket finished fine, but slower than a foil-wrapped cook has any business running. Went back through the site's own stall math afterward and found out why: I hadn't wrapped early enough to matter. I'd ridden out essentially the whole stall naked and then applied foil to a plateau that was already about to end on its own.

## The stall isn't a point, it's a 12-degree band

Every brisket write-up treats wrapping as a binary: foil or no foil, paper or no paper. The engine models it differently. The stall is a **12°F-wide band** starting at the pit's stall threshold, and the wrap temperature you set determines how much of that band you ride out naked before the wrap kicks in:

> **wrapProgress = (your wrap temp − stall start) ÷ 12°F**, clamped between 0 and 1

Wrap right at the bottom of the band (wrapProgress = 0) and the wrap gets the entire stall to work with: full effect. Wrap at the top of the band (wrapProgress = 1) and there's nothing left of the plateau for the wrap to shorten. You get the *same stall length as never wrapping at all*. Everything in between is a straight blend of the two. Wrap temperature isn't a toggle in this model; it's a dial that runs from "full benefit" to "no benefit," and where you land on it is a choice you're making every time you set that number.

## Running the actual band

Take a brisket at the site's own defaults (225°F, offset smoker, moderate climate, reference weight), where the stall starts at 155°F and, left naked, runs about **2.29 hours**. Butcher paper cuts stall length by more than half if you commit early:

| Wrap temp | Position in the band | Paper (0.45× multiplier) | Foil (0.0× multiplier) |
| --- | --- | --- | --- |
| 155°F (bottom) | wrapProgress = 0 | **1.03 h** (55% shorter) | **0 h** (stall eliminated) |
| 161°F (middle) | wrapProgress = 0.5 | 1.66 h | 1.15 h |
| 167°F (top) | wrapProgress = 1 | 2.29 h, no change | 2.29 h, no change |

That bottom row is the whole point. At the top of the 12°F band, paper and foil both collapse to the exact same number as never wrapping at all. The wrap's `stall_duration_multiplier` value stops mattering once there's no naked stall left to apply it to. Foil is dramatically more powerful than paper *only* if you use it early; wrapped late enough, foil's famous full-stop effect is worth precisely nothing.

## "Once the bark sets" is doing a lot of unexamined work

The advice to wrap once bark looks set, or once the stall has held for a while, is really an instruction to wrap somewhere in the middle-to-late part of the band, which the model shows costs you most of the wrap's benefit, not some incidental fraction of it. My foil-at-the-first-twitch move was close to the worst version of that instinct: I read "temperature moving again" as the signal to act, when the model treats that exact moment as roughly wrapProgress = 1, the stall already finishing on its own, with nothing left for the foil to cut short.

None of this argues for wrapping the instant you hit the stall threshold and sacrificing bark for speed. That's a real bark-versus-time tradeoff, and it's yours to make. The point is narrower: whatever wrap temperature you land on, know where it sits in that 12°F band, because that position, not just paper-versus-foil, is what decides how much of the wrap's benefit you actually collect.

The **[stall predictor](/stall-predictor)** has wrap temperature as a live slider: drag it from the bottom of the band to the top on the same cook and watch stall duration slide continuously between the wrapped and naked extremes before you commit to a number on the actual smoker.
