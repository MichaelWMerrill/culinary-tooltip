---
title: "Turkey's Hold Window Is a Fraction of Brisket's — Same Cooler, Same Math"
description: "I planned a turkey hold the way I plan a brisket hold and nearly served a bird that had drifted into the danger zone at the table. The same cooling formula, the same cooler, and a pull temperature 40+ degrees lower changes everything."
pubDate: '2026-08-19'
heroImage: '/blog/turkey-hold-window-gap.jpg'
pillar: planning-safety
protein: [turkey]
---

Pulled a turkey at 160°F an hour before guests showed up, wrapped it the exact same way I wrap a brisket (foil, towels, into a pre-warmed cooler) and figured I had my usual cushion if dinner ran late. Dinner ran late. Went to carve and the breast had dropped further than felt right for "an hour in a faux cambro." Checked it against a thermometer instead of trusting the clock, and it had already slid close to the floor I didn't think I'd have to worry about for hours yet. Same cooler, same wrap, same technique that buys a brisket most of an afternoon, and it very nearly wasn't enough for a bird that had barely rested.

## One formula, four hold profiles, every protein

The site's rest engine doesn't have a turkey-specific model and a brisket-specific model. It has one formula, Newton's law of cooling, applied identically regardless of what's in the cooler:

> **T(t) = T_amb + (T_pull − T_amb) · e^(−k·t)**

The same four hold profiles back every protein on the site: a warm oven holding near 150°F (`amb: 150, k: 0.1`), a **faux cambro**: foil, towels, pre-warmed cooler (`amb: 70, k: 0.1`), a **bare cooler** with no towels (`amb: 70, k: 0.2`), and **loosely tented on the counter** (`amb: 70, k: 0.55`). The 140°F floor is the same shared `SAFE_TEMP` constant for everything that comes off a smoker. Nothing about the decay curve itself treats turkey differently from brisket.

## The gap is entirely in T0

What *does* differ, and differs by a lot, is the pull temperature the curve starts from. The registry sets brisket's `finish_temp` at 203°F and pork shoulder's at 202°F. Turkey's sits at 160°F, a full 42-43°F lower. Solve the cooling formula for exactly when it crosses 140°F and that gap in starting altitude is the entire story:

| Hold | Brisket (203°F) | Turkey (160°F) |
| --- | --- | --- |
| Faux cambro | ~6.4 h | **~2.5 h** |
| Bare cooler | ~3.2 h | **~75 min** |
| Loosely tented on counter | ~70 min | **~27 min** |

That faux-cambro number for brisket, about six hours, is the same figure from [the site's original hold post](/blog/faux-cambro-holding). Turkey's window on the exact same setup comes out to a little over a third of that. Not because poultry cools faster (the `k` rate constant per hold vessel doesn't change with protein at all), because it starts barely 20°F above the 140°F line it's racing toward, while brisket starts more than 60°F above it. The exponential decay has three times less room to work with before it hits the floor.

## The calculator already knows this: it's one click away

The rest calculator isn't set up as a brisket tool with a turkey option bolted on. Switch the protein selector and `state.pullTemp` resets straight to that protein's `thermal.finish_temp`: 203°F for brisket, 160°F for turkey, no manual re-entry required. Toggle from brisket to turkey on the same hold profile and the safe window collapses in front of you, which is a faster way to internalize the gap than doing the log-and-exponent math by hand, the way I'm doing it here after the fact.

## This is the hold-side companion to the danger-zone post

[The turkey danger-zone post](/blog/turkey-danger-zone-clock) went out of its way to say it wasn't covering this: "the site's hold/rest post covers the *other* end of the cook... this is the climb, the 40 to 140°F stretch on the way up, before the meat has been cooked at all." That post is about the danger zone on the way *in*: cold meat climbing up to safe. This is the danger zone on the way *out*: cooked meat cooling back down. Same 140°F line, same shared engine, opposite direction, and turkey comes out worse off on both ends: a stricter climb-side clock per that post, and now a dramatically shorter hold-side window too.

If you're planning a turkey hold with brisket instinct, drop your actual pull temperature into the **[rest calculator](/rest-calculator)** before you commit to "an hour cushion should be fine." Six hours of brisket margin does not translate. Plan the bird's hold on its own numbers, not habit carried over from red meat.
