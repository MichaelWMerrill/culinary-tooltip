---
title: "Ribs Run on Two Different Clocks, and We Never Reconciled Them"
description: "Our own rib scheduler and rib predictor disagree with each other by design — a fixed 3-2-1 block schedule versus a slab-geometry physics model. Here's why, and which one to trust."
pubDate: '2026-08-04'
heroImage: '/blog/ribs-two-clocks.jpg'
---

I had two tabs open planning a rib cook — our cook scheduler in one, the rib stall predictor in the other, both set to the same spare ribs at 250°F. The scheduler said 6 hours, flat, no matter what I touched. The predictor gave me a curve that shifted a little with wrap and climate. They weren't telling the same story, and for a minute I assumed one of them was just wrong.

They're not wrong. They're two different models that happen to share a page, and ribs are the one cut where we never fully merged them.

## The scheduler runs on a recipe, not a curve

Ask the cook scheduler to lay out a rack of spare ribs and it reaches for a fixed block: **3 hours smoking, 2 hours wrapped, 1 hour unwrapped and sauced** — the classic 3-2-1 method, with baby backs getting a shorter 2-2-1. That's it. Pit temp, wrap choice, climate — none of it moves the number, because the scheduler isn't running the thermal model for ribs at all. It's reading `method_321` straight out of the protein registry and adding up the blocks.

That's a deliberate, sensible choice for a scheduling tool. 3-2-1 is a real, widely used rib method, and a scheduler's job is to hand you a fire-up time and a timeline you can actually follow at the grill, not a differential equation.

## The predictor runs the same slab-geometry model as everything else

The rib stall predictor is a different animal. It calls the same `computeModel` physics engine that drives the brisket and pork shoulder predictors — pit airflow, wrap permeability, climate, the works — just with rib-specific constants. And those constants tell an interesting story on their own.

Ribs are modeled as a **slab**, not a cylinder. A brisket or pork butt is a compact mass, so heat has to fight its way to the center and total weight matters (brisket's climb-rate exponent is around **-1.07**). A rack of ribs is the opposite: it's thin in one dimension and heat moves through that thickness fast, so total mass barely enters into it. The geometry block spells this out directly — rack count doesn't change cook time, because two racks and eight racks on the same grate reach the same internal temp in about the same time, as long as the pit holds steady.

That thinness has a second consequence: ribs barely stall. The base stall length is set at **0.12 hours** — essentially a rounding error next to brisket's 3-hour base — because there just isn't enough mass under the surface to sustain an evaporative plateau. The predictor's curve looks like a slightly-kinked climb, not the flat shelf you'd see on a brisket.

> **What actually drives rib cook time in the predictor:** cut thickness (baby back 1.05×, St. Louis 0.9×, spare 0.82×) and pit temp — not weight, and barely the stall.

## Two honest models, one shared assumption

Here's the part that's easy to miss: our own test suite calls this out. The cross-tool consistency check that verifies the scheduler and predictor agree on cook time explicitly carves out ribs as a **known, declared exception** — the two paths are allowed to diverge because they're built on different assumptions on purpose, not by accident.

3-2-1 assumes a specific wrap discipline (wrap at hour 3, unwrap and sauce at hour 5) and a fairly standard pit temp. The physics model doesn't assume a wrap schedule at all — it computes one from whatever pit temp, wrap material, and climate you hand it. If you're running 3-2-1 exactly as written, the scheduler's block timeline is the more useful tool: it hands you the wrap and sauce moments directly. If you're running a hotter pit, skipping the wrap, or just want to see how sensitive rib time actually is to weather and equipment, the predictor is the one modeling that.

Neither is broken. They're answering different questions that happen to look like the same question until you check both tabs at once.

Run your cut and pit through the **[ribs stall predictor](/ribs-stall)** to see the slab-geometry curve, or use the **[cook scheduler](/cook-scheduler?pr=pork_ribs)** if you just want the 3-2-1 block timeline with a fire-up time attached.
