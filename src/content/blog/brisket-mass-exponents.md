---
title: "Bigger Brisket, Proportionally Longer Stall? The Math Says No"
description: "Doubling a brisket's weight roughly doubles the climb to the stall — but barely touches how long the stall itself lasts. Two separate mass exponents explain why the plateau doesn't scale like the rest of the cook."
pubDate: '2026-08-05'
heroImage: '/blog/brisket-mass-exponents.jpg'
---

Bought a 16 lb packer for a bigger crowd than usual, and did the lazy math: my usual 8-pounder runs about a 3 hour stall, so budget double that, call it 6. I blocked out the extra time, told everyone dinner was later, and then sat there watching the plateau break almost exactly where it always does. The stall barely moved. The part that *did* nearly double was the long climb to get there. I'd scaled the wrong half of the cook.

## One exponent can't do two jobs

The site's stall engine doesn't use a single "bigger meat cooks slower" rule — it uses two, and they're deliberately decoupled. In the brisket thermal block, `exponent: -1.073` scales how fast the *core* heats up, and a separate `stall_exponent: 0.333` scales how long the *plateau* lasts. Different physics, different exponents:

> Core heating is **conduction-limited** — heat has to physically work its way through the meat, and that gets slower fast as the cut gets thicker. Stall length is **surface-evaporation-limited** — it's governed by how much moisture is sitting on the outside and how fast the surrounding air can carry it off, which barely cares how much raw mass is buried underneath.

A steep exponent on one, a shallow exponent on the other. One number physically cannot represent both processes at once, so the model doesn't ask it to.

## Running the actual numbers

The engine's mass scaling is relative to a 10 lb reference weight (`REF_WEIGHT`). Compare an 8 lb packer to a 16 lb one — exactly double the mass:

**Climb rate** (`massRateScale = (weight / 10) ^ -1.073`):
- 8 lb: (0.8)^-1.073 ≈ **1.27** — climbs noticeably faster than reference
- 16 lb: (1.6)^-1.073 ≈ **0.60** — climbs at roughly half that rate

That's why the pre-stall climb on the 16-pounder took nearly twice as long as the 8-pounder's — the rate itself is roughly halved by doubling the weight.

**Stall duration** (`massDurScale = (weight / 10) ^ 0.333`):
- 8 lb: (0.8)^0.333 ≈ **0.93**
- 16 lb: (1.6)^0.333 ≈ **1.17**

That's about a 26% longer plateau, not a doubling. The shallow 0.333 exponent means mass barely leans on stall length at all compared to how hard it leans on climb rate.

## Why the geometry works out that way

A packer brisket doesn't get thicker as it gets bigger — it gets *wider*. The trim floor and the natural taper of the cut mean a 16 lb packer and an 8 lb packer are cooking through roughly the same core thickness; the extra pounds are mostly surface area spread sideways, not more meat between the surface and the center. Heat conducting inward barely notices the difference, which is exactly what the steep `-1.073` climb exponent captures.

The stall doesn't care about thickness at all — it cares about how much surface is wet and how fast that surface can shed moisture into the pit air. A wider brisket does have more total surface, which is the only reason `stall_exponent` isn't zero. But "more surface" scales much more gently with weight than "more distance for heat to travel," so the plateau creeps rather than doubles.

## Budget the two halves separately

The instinct to scale the whole cook by weight isn't wrong for the climb — it's close to right there. It's wrong for the stall, where the geometry mostly decouples plateau length from how much brisket you bought. If you're cooking a bigger packer than usual, add real time to your pre-stall climb estimate and only a modest bump to the stall itself — not the same multiplier for both.

Run your own weight through the **[stall predictor](/stall-predictor)** and watch climb time and stall duration move at their own separate rates as you drag the slider — it's a faster way to see the split than doing the exponent math by hand before every cook.
