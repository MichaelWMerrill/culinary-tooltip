---
title: "Brisket and Pork Shoulder Share the Exact Same Stall-Duration Exponent"
description: "Two different animals, two different climb-rate exponents, two different geometric constants — and one mass-scaling number that matches to three decimal places. It's not a coincidence, and the constant that looks like it should explain the difference turns out to be decorative."
pubDate: '2026-08-19'
heroImage: '/blog/stall-exponent-universality.jpg'
pillar: science
protein: [beef_brisket, pork_shoulder]
---

Went digging through the registry comparing a brisket cook to a pork butt cook, expecting the usual story: different cut, different shape, different numbers throughout. Climb-rate exponents: different. Geometric constants: different. Then I got to the number that scales how long the stall itself lasts, and brisket and pork shoulder had the exact same value, out to three decimal places. Two species, two shapes, two completely separate calibration efforts, landing on the identical number for one specific thing. That's not the kind of coincidence you get from independently fitting curves to field data.

## Where they differ, and where they don't

Brisket's geometry block in the registry: `{ beta: 0.42, exponent: -1.073, stall_exponent: 0.333 }`. Pork shoulder's: `{ beta: 0.45, exponent: -1.086, stall_exponent: 0.333 }`. The **climb-rate exponent**, how fast the core heats up as mass increases, differs between them, `-1.073` versus `-1.086`, each independently fitted to its own published field cook-time data. The **beta constant** differs too, `0.42` versus `0.45`. But `stall_exponent`, the number that governs how the *plateau itself* scales with mass, is `0.333` for both. Not close. Identical.

## The stall doesn't care what's inside the cylinder

The reason isn't that the registry got lazy and copy-pasted a number. It's that the climb and the stall are governed by two entirely different physical processes, and only one of them cares about the meat's insides.

> Climb rate is **conduction-limited**: heat has to physically travel through the cut's mass to reach the center, and how well it conducts depends on what the meat actually is: its fat content, its density, its internal structure. That's exactly the kind of thing that should differ between a lean packer flat and a fattier Boston butt, and the registry's two different climb exponents reflect that.

Stall length is a different problem entirely. It's set by evaporation off the *surface*: how much moisture is sitting on the outside of a roughly cylindrical piece of meat, and how fast that surface area can shed it relative to the total mass behind it. For any two geometrically similar cylinders, regardless of what's inside them, that surface-area-to-volume ratio scales as mass^(1/3), the classic cube-root scaling law you'd get from pure geometry, independent of species. `0.333` isn't a brisket number or a pork number. It's a *shape* number, and a packer brisket and a Boston butt are both, near enough, the same shape.

## The constant that looks relevant but isn't

Here's the part that's easy to miss reading the registry top to bottom: `beta` looks like exactly the per-protein shape constant that should matter for this. It's commented "geometric constant" on both blocks, it differs between brisket and pork the way you'd expect a real shape difference to show up, and it sits right next to `exponent` and `stall_exponent` like a peer.

Grep the engine for where `beta` actually gets used, though, and there's exactly one reference: `stallEngine.js` reads `brisketThermal.geometry.beta` (brisket's value only, never pork's) into a metadata object, `DATA.mass_geometry_scaling.geometric_constant_beta`. That object is display data. It never appears anywhere inside `computeModel()`'s actual math. The function that turns mass into a climb rate and a stall duration reads exactly two things off the geometry block: `exponent` and `stall_exponent`. `beta` sits there looking load-bearing and does nothing. The number that actually governs geometry, the shared `0.333`, was never labeled as the geometric constant at all.

## Two exponents, one universal, one not

This sits alongside [the earlier post on brisket's own two exponents](/blog/brisket-mass-exponents), but it's a different claim. That post was about one cut: brisket's climb-rate and stall-duration exponents are decoupled from each other. This is about the stall-duration exponent specifically, compared *across* cuts: it's not decoupled from anything, it's the same number for brisket and pork because the physics it encodes, surface-to-volume scaling for a cylinder, doesn't know or care what species the cylinder is.

Run the same weight through both the **[brisket stall predictor](/stall-predictor)** and the **[pork shoulder predictor](/pork-shoulder-stall)** side by side. The stall lengths won't be identical, because pit settings and the base stall-hours constant still differ, but the *rate* at which each one stretches as you add weight will track together in a way the climb rates never do.
