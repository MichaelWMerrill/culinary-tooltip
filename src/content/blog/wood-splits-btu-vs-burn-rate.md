---
title: "Wood Splits Carry the Most BTU/lb, and Burn Through the Most Pounds an Hour"
description: "More energy per pound and fewer pounds burned per hour sound like the same claim. In the site's fuel model they aren't even close: hardwood splits top the BTU/lb chart and the burn-rate chart at the same time."
pubDate: '2026-08-16'
heroImage: '/blog/wood-splits-btu-vs-burn-rate.jpg'
pillar: science
protein: [general]
---

Switched an offset over to splits-only for a competition-style cook, reasoning that wood carries more energy per pound than charcoal, so I'd be feeding the firebox less often. Packed the truck for what I figured would be a lighter fuel run than my usual charcoal cooks. Came up short before dinner and had to make an emergency wood run mid-cook, which is exactly the kind of thing you don't want to be doing three hours before people show up hungry. More BTUs per pound turned out to have nothing to do with how many pounds an hour I was actually burning.

## Two numbers that sound related and aren't

The fuel engine's config lists two stats side by side for every fuel type — `btu_per_lb` and `base_burn_ideal` — and it's easy to read them as the same claim from two angles. They're not:

> wood_pellets: 8,000 BTU/lb · 1.2 lb/hr ideal burn
> charcoal_briquettes: 9,500 BTU/lb · 1.5 lb/hr ideal burn
> hardwood_splits: 12,000 BTU/lb · **3.5 lb/hr** ideal burn

Splits carry the most energy per pound of any fuel in the model — 26% more than charcoal, 50% more than pellets. They also burn through pounds the fastest by a wide margin — more than double charcoal's rate, and just under three times pellets'. The fuel with the best energy density is also the fuel that eats the most weight per hour. Nothing about "more BTUs per pound" implies "fewer pounds burned," and the numbers here move in the same direction, not opposite ones.

## Why: the model doesn't actually spend the BTUs

The reason isn't some hidden inefficiency in wood — it's that the estimator was never built to balance energy in the first place. The engine's own comment on `btu_per_lb` says it directly: that number is **display-only**. The fuel description panel prints "12,000 BTU/lb" next to your fuel choice, but `estimate()` never reads it. The actual pounds-burned model is:

> **fuel weight = base_burn_ideal × duration × ambient multiplier × wind multiplier × (baseline efficiency ÷ cooker efficiency)**

There's no BTU-balance term anywhere in that chain — no step where the model says "this fuel packs more energy, so burn less of it to hit the same pit temp." `base_burn_ideal` is just an independently fitted lb/hr rate per fuel, calibrated to how that fuel actually gets burned in the field (splits in a bigger, leakier offset firebox; pellets in a small auger-fed hopper), not derived from the BTU figure sitting right next to it in the same config block.

## Running the actual weights

Same 12-hour cook, same single-wall steel cooker, calm 70°F day — the estimator's own defaults, so the efficiency and weather terms both come out to 1.0 and the comparison is just `base_burn_ideal × duration`:

| Fuel | BTU/lb | lb/hr ideal | 12-hr cook |
| --- | --- | --- | --- |
| Wood pellets | 8,000 | 1.2 | 14.4 lb |
| Charcoal briquettes | 9,500 | 1.5 | 18.0 lb |
| Hardwood splits | 12,000 | 3.5 | **42.0 lb** |

Going from charcoal to splits for the same 12-hour cook isn't a modest bump — it's more than double the weight of fuel, and it's the fuel that was supposedly the most energy-dense of the three. If you're mentally converting "denser fuel" into "buy less of it," that instinct is exactly backwards here, and it's the mistake that had me making a wood run mid-cook instead of finishing with fuel to spare.

## Don't extrapolate fuel type from BTU/lb

None of this means splits are a worse choice — offset cooking on splits is its own tradition for real reasons that have nothing to do with fuel economy. The point is narrower: BTU/lb tells you about energy density, not about how many pounds a given cooker burns in a given hour, and this model keeps those two numbers completely separate on purpose. If you're loading a firebox and reasoning from "this fuel has more energy so I need less of it," check the actual burn rate instead of the energy density.

The **[fuel estimator](/fuel-estimator)** runs the live comparison across pellets, charcoal, and splits for your exact cook — same duration, same cooker, same weather — so you can see the pounds gap before you're the one making a supply run at 9pm.
