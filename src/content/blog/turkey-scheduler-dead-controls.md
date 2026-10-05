---
title: "The Cook Scheduler Shows Turkey Controls That Do Nothing"
description: "Dragged the climate toggle and swapped wrap types building a Thanksgiving schedule, and the fire-up time never moved a minute. Turkey clears the wrong gate in the scheduler's UI logic: its own stall model never reads either control."
pubDate: '2026-08-23'
heroImage: '/blog/turkey-scheduler-dead-controls.jpg'
pillar: myth-bust
protein: [turkey]
---

Building a Thanksgiving schedule on the cook scheduler, I dragged the Regional Climate toggle from moderate to arid, expecting the fire-up time to nudge earlier — arid air deepens and lengthens the brisket stall, so a drier forecast should push the whole schedule out. Turkey's fire-up time didn't move by a minute. Figured I'd fat-fingered it, tried Wrap Type next, foil to no-wrap: same result, identical schedule down to the second. Wrap and climate weren't being ignored a little. They weren't being read at all.

## The gate that lets turkey through

The scheduler decides whether to show the Wrap Type, Wrap at Internal Temp, and Regional Climate controls with one line: `const usesStall = !method321`. Ribs have a `method_321` block in the registry — the fixed 3-2-1 schedule — so for ribs that line evaluates false and those three controls stay hidden, correctly, because ribs' schedule genuinely ignores them. Turkey has no `method_321` either, same as brisket and pork, so `usesStall` comes out `true` for turkey too. All three controls render normally on `/cook-scheduler` with turkey selected, exactly as they do for brisket.

The gate is checking the wrong thing for turkey's case. It's asking "does this protein use a fixed block schedule instead of the stall model," when what actually determines whether wrap and climate matter is "does this protein stall at all."

## Turkey's own branch never reads either control

Turkey doesn't stall — `thermal.stalls === false` in the registry — and `computeModel()` has a dedicated branch for exactly that case: a single monotonic climb straight to the finish temp. That branch computes `climb` from `ct.base_hourly_climb_rate_initial * pitFactor * massRateScale` and nothing else. No `wrap` object anywhere in it, no `cl` (the climate multipliers) anywhere in it. Whatever you set Wrap Type, Wrap Temp, or Regional Climate to, the schedule turkey actually gets back never passes through code that looks at any of the three.

## The predictor already gates this correctly

The single-protein predictor pages — `/turkey-stall` among them — share the same underlying component, `StallPredictor.astro`, and it checks a tighter condition: `const stalls = thermal.stalls !== false`. For turkey that's `false`, and the wrap/climate block is wrapped in `{stalls && (...)}`, so those controls simply don't render on `/turkey-stall` for turkey. The predictor asks the right question — does this protein stall — and hides the dead controls accordingly. The scheduler asks a different, looser question that happens to give the same answer for brisket, pork, and ribs, and the wrong one for turkey.

This isn't the same gap [ribs already has a post about](/blog/ribs-two-clocks). Ribs' wrap/pit/climate controls are correctly hidden on the scheduler — `method_321` catches them at the right gate, and the mismatch there is a completely different mechanism: `cookDuration()` short-circuiting straight to a fixed block before `computeModel()` ever runs. Turkey's problem is narrower and specifically a UI-gating miss — the controls that should be hidden for the same underlying reason ribs' controls correctly are, aren't, because the scheduler's gate and the predictor's gate check two conditions that only happen to agree for three proteins out of four.

## Plan a turkey cook by the number that's actually live

If you're scheduling a turkey and reaching for Wrap Type or Regional Climate expecting them to shift the fire-up time, they won't — the only levers that move turkey's schedule are pit temp, pit type, weight, and prep (whole versus spatchcock). Run it yourself on the **[cook scheduler](/cook-scheduler?pr=turkey)** and you can watch it firsthand: change climate or wrap all you like, the timeline holds exactly still.
