---
title: "The Wrap's Permeability Number Never Actually Touches the Stall Model"
description: "Went looking for why foil kills the stall outright while paper only trims it, and found a clean-looking permeability number sitting right in the site's wrap config. Traced it through the code and it goes nowhere — it's decoration, not a driver."
pubDate: '2026-08-23'
heroImage: '/blog/wrap-permeability-is-decorative.jpg'
pillar: myth-bust
protein: [general]
---

Went looking for the reason paper knocks the stall down by roughly half while foil kills it outright, and thought I'd found the whole explanation sitting right there in the site's own wrap config: every wrap option carries a `permeability_psi` value: 1.0 for naked, 0.35 for butcher paper, 0.0 for foil. Clean story, right there in the data. Less permeable, less evaporation escapes, shorter stall. I got about half a paragraph into writing that explanation before I actually traced where the number goes in the code. It doesn't go anywhere.

## A number with nowhere to go

`permeability_psi` lives in `stallEngine.js`'s `wrapping_boundary_conditions` block, declared once per wrap option right alongside the fields that actually drive the model. Grep the rest of `src/` for it and those three declaration lines are the only places it appears, not in `computeModel()`, not in any component, not anywhere the stall duration or the post-wrap climb actually gets computed. It's read into the data object and then never read again. That's not a subtle dependency I'm missing; it's a field with no consumer anywhere in the codebase.

> Compare it to `btu_per_lb` in the fuel engine, [the same pattern, one engine over](/blog/wood-splits-btu-vs-burn-rate): a physically plausible-sounding number sitting in the config, doing real work in the description text, doing nothing in the math.

## What's actually driving the stall

The real levers are two other fields on the same wrap objects, and they're used directly. `stall_duration_multiplier` scales how much of the naked stall survives once you wrap: 0.45× for paper, 0.0× for foil, meaning foil doesn't shorten the stall, it erases it. `post_stall_climb_modifier` then scales how fast the meat climbs once the plateau ends: 0.85× naked, 1.2× paper, 1.65× foil. Both numbers get multiplied straight into the model: `stallDuration` uses the first, `climb3 = climb1 * effPostMod` uses the second. Neither one is derived from `permeability_psi`. They're independently fit values sitting in the same object as a field that looks like it should be their source.

You can see the disconnect most clearly on paper. If `stall_duration_multiplier` really were computed from how permeable the wrap is, you'd expect the two numbers to land close together. Instead paper's permeability sits at 0.35 while its actual stall multiplier is 0.45, a real ten-point gap between a number that reads like a cause and the number that's the actual effect. Foil and naked wrap happen to have matching permeability and multiplier values (0.0 and 0.0, 1.0 and 1.0), which is almost certainly what makes the connection look real at a glance, right up until you check the one wrap option in the middle.

## The lesson isn't about wrap: it's about trusting adjacent fields

Nothing about your actual wrap choice changes because of this. Foil still stops the stall outright, paper still trims it to under half, naked still runs the full plateau. Those outcomes were never in question. What's worth remembering is narrower: sitting next to the number that drives a model isn't the same as being read by it, and a field with a plausible physical name is exactly the kind of thing that earns unearned trust in a config file you're skimming instead of tracing.

Run your own wrap choice through the **[stall predictor](/stall-predictor)** and watch the real levers (`stall_duration_multiplier` and `post_stall_climb_modifier`) move the plateau and the finish, not the permeability figure sitting quietly beside them.
