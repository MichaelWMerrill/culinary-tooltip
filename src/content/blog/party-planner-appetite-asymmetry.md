---
title: "The Party Planner's Appetite Dial Isn't Centered Where You'd Think"
description: "Bumped the appetite setting from standard to hearty for a crew of hungry coworkers, expecting a modest bump in the shopping list. The raw weight jumped 35%, while dropping to light only saves 30%. The dial isn't symmetric, and the code says exactly why."
pubDate: '2026-08-28'
heroImage: '/blog/party-planner-appetite-asymmetry.jpg'
pillar: planning-safety
protein: [general]
---

Planned a work cookout for 12 people and, knowing the crowd, bumped the party planner's appetite setting from standard to hearty before pricing anything out — figured that'd add a pound or two of brisket to the shopping list, nothing dramatic. The raw weight jumped from about 12 lb to over 16 lb, a swing bigger than I'd budgeted for. Curious whether dropping to light for a lighter-eating group would save roughly the same amount in the other direction, I toggled it — and it didn't. Light only pulled the number down by 30%. Hearty had pushed it up by 35%. The dial isn't centered on standard the way its middle position makes it look.

## Three settings, not one symmetric slider

The party planner's appetite input isn't a continuous dial — it's three fixed multipliers applied straight to the protein's standard cooked-weight-per-guest before anything else happens:

> `APPETITE = { light: 0.7, standard: 1.0, hearty: 1.35 }`

Read those as percentages and the asymmetry is right there: light trims demand by a flat 30%, hearty adds 35%. If the three settings were meant to bracket "standard" evenly, you'd expect something like 0.7 and 1.3, or 0.65 and 1.35 — a matched pair on either side of 1.0. Instead hearty's swing is a full 5 points larger than light's, and it's not a rounding accident buried in the math elsewhere; it's the literal constant the whole calculation is built on.

## Why the asymmetry makes sense once you think about who's on each end

A light eater has a floor. Someone skipping the bun, taking a small plate, or just not that hungry that day still eats *something* — the realistic range below "standard" portion size is narrow, so 0.7 is already most of the way to as-low-as-reasonable. A hungry crew doesn't have the same kind of ceiling. Teenagers, a rec-league team straight off the field, guests who skipped lunch to save room — "hearty" eaters can plausibly eat well more than a third over standard, and running out of food at your own cookout is a worse failure mode than having a little extra. The 0.7/1.35 split isn't an error to center — it's shaped like the actual risk on each side: bounded downside, open upside.

## Running the actual numbers

Take a 12-guest party, brisket, Choice grade with commercial trim and a paper wrap — a 50.2% yield fraction (24% trim, 34% cook loss, same math the [yield posts](/blog/prime-brisket-yield-myth) already cover). The party planner inverts that yield model: `neededCooked = guests × lbPerGuestCooked × APPETITE[appetite]`, then `rawNeeded = neededCooked ÷ yieldFraction`.

| Appetite | Cooked lb needed | Raw lb to buy | Budget @ $4.29/lb |
| --- | --- | --- | --- |
| Light (0.7×) | 4.2 lb | 8.4 lb | $35.92 |
| Standard (1.0×) | 6.0 lb | 12.0 lb | $51.32 |
| Hearty (1.35×) | 8.1 lb | 16.1 lb | $69.28 |

Standard to hearty adds just over 4 lb of raw brisket and about $18 to the budget for the same 12 guests — a real jump, and bigger in absolute terms than standard to light saves (about 3.6 lb, $15). The appetite swing here is on the same order as the yield-fraction swings the grade and trim posts already dug into — picking hearty over standard moves your shopping list nearly as much as picking Prime over Select does, just through a completely different knob.

## Don't split the difference between light and hearty

If you're estimating for a mixed crowd and tempted to just average light and hearty and call it "standard," don't — the multipliers aren't built to average back to 1.0, and doing that math by hand undercounts what a genuinely hungry table needs. Run your real guest count, protein, and appetite mix through the **[party planner](/party-planner)** directly — it does the inversion correctly regardless of which side of standard your crowd lands on.
