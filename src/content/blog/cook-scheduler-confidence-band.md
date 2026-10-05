---
title: "The Cook Scheduler's Fire-Up Time Is a Range Wearing a Point Estimate's Clothes"
description: "Planned a dinner party off the scheduler's single fire-up clock time and cut it close on a naked brisket that ran long. The tool had already told me how much slack to expect — I just wasn't looking at the number that carried it."
pubDate: '2026-08-28'
heroImage: '/blog/cook-scheduler-confidence-band.jpg'
pillar: how-to
protein: [general]
---

Planned a dinner around the cook scheduler's fire-up time like it was gospel: big number on the screen, "5:14 AM," so that's when the alarm went off. Ran the brisket naked, no wrap, chasing bark. By the time guests were due, the meat still hadn't hit its finish temp, and I spent the last hour serving apologies instead of slices. Went back to the scheduler afterward looking for what I'd missed, and found it sitting in the small print under the big clock the whole time: a range, not a single number, and it had been wider for exactly the wrap choice I'd made.

## One big number, one small range, same estimate underneath

The scheduler's headline is `fireUpBig`, a single clock time, computed straight from the cook's total estimated duration. Right below it, smaller, sits `totalSub`: something like "≈ 13h 30m–20h 15m cook + 1h rest + 45m preheat." That range isn't a separate, more cautious estimate. It's built from the *same* total-time number the big clock uses, just with an uncertainty band wrapped around it before display. The clock time and the range come from one estimate; only one of them shows you that it's an estimate.

## The band width is set by your wrap choice, on purpose

The uncertainty isn't a flat fudge factor. It's a function of wrap, and the code says why in a comment sitting right above it:

> Foil is the most predictable, unwrapped the widest.
>
> **bandFraction:** foil 0.15 · peach butcher paper 0.20 · naked 0.25

Foil gets a ±15% band, paper ±20%, naked ±25%. That ordering tracks the same physics the [wrap-timing post](/blog/wrap-timing-not-just-what) covers from a different angle: foil shuts evaporation down entirely, so once it's on, the cook's remaining behavior is close to deterministic. Naked rides out the full stall at the mercy of however dry or humid that particular day's air turns out to be, the model's own admission that a naked cook has the most ways to run long or short.

## Running the actual spread

Take a 14 lb brisket, 225°F, offset smoker, moderate climate, a normal weekday setup. The point estimate and the band it's hiding a wider gap for on the naked cook:

| Wrap | Point estimate (the clock uses this) | Actual range (±band) |
| --- | --- | --- |
| Foil | 15h 31m | 13h 12m – 17h 51m |
| Paper | 16h 53m | 13h 30m – 20h 15m |
| Naked | 18h 53m | 14h 10m – 23h 36m |

My naked cook's true window ran nearly 9.5 hours wide, more than a full workday of slack on either side of the number I'd set an alarm for. Foil's band, for comparison, is under 4.5 hours wide on a longer base estimate. Same tool, same model, same "point estimate" framing on the big clock, a completely different amount of honest uncertainty depending on one input I'd picked for bark, not for scheduling precision.

## Read the small text under the big number

None of this means the scheduler is wrong to show a single fire-up time. You need one number to set an alarm to. It means that number is only as tight as your wrap choice lets it be, and the tool already tells you the real spread if you read past the headline. Before you commit a dinner time to a naked or paper-wrapped cook, check the range on the **[cook scheduler](/cook-scheduler)**, not just the clock, and if the schedule's tight, foil buys you the narrowest band along with the fastest finish.
