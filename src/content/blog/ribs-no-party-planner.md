---
title: "Why Ribs Don't Show Up on the Party Planner"
description: "Went to plan a rib cookout the same way I'd planned every brisket and turkey party: punch in a guest count, let the tool back-solve the shopping list. Ribs weren't in the protein dropdown at all. Not a bug: the site's own yield model genuinely doesn't apply to a rack."
pubDate: '2026-09-09'
heroImage: '/blog/ribs-no-party-planner.jpg'
pillar: tool-spotlight
protein: [pork_ribs]
---

Went to plan a rib cookout the way I'd planned every brisket and turkey party before it — pull up the party planner, punch in a guest count, let it back-solve how much raw meat to buy and what it'll cost. The protein dropdown had brisket, pork shoulder, and turkey. No ribs. Figured it was a glitch, checked the URL params, tried forcing a rib protein ID into the query string by hand. Still nothing. It took reading the actual registry to understand ribs isn't missing by accident — the party planner's whole model doesn't fit a rack of ribs, and the site says so directly in a comment most people never see.

## What the party planner actually inverts

Every protein the tool supports — brisket, pork shoulder, turkey — has a `yield` block in the registry: a trim-loss and cook-loss matrix that turns a raw purchase weight into a cooked serving weight. The party planner runs that model backward. Give it a guest count and an appetite, and it multiplies out to a needed cooked weight, then divides by the yield fraction to back-solve the raw weight and budget. The whole tool only works because `yieldProteinIds` filters the protein list down to `Object.values(PROTEINS).filter((p) => p.yield)` — every protein that actually has a yield block to invert.

Ribs don't have one. The registry says exactly why, in a comment sitting right above the rib thermal block:

> "No yield/cost calculator: ribs are planned and served by the rack/bone, not by trim-and-shrinkage weight — so this protein has no `yield` block."

There's no trim step to shrink from and no cook-loss percentage to apply, because nobody buys ribs by weight and portions them out after cooking the way you'd slice a brisket. You buy racks, and you serve bones. The whole raw-to-cooked shrinkage model the other three proteins run on has nothing to invert for a cut priced and served by the piece.

## The constant that would fix this already exists — it's just not wired in

Here's the part that's easy to miss: the registry does carry a serving-size number for ribs, `bonesPerGuest: 4`, sitting in the exact same `serving` block that holds brisket's and turkey's `lbPerGuestCooked: 0.5`. It's a real, calibrated constant — you can see it today on `/methodology`, printed as "4 bones/guest" right alongside every other protein's serving figure. But `bonesPerGuest` is read in exactly one place in the entire codebase outside its own declaration: that methodology display. It's never referenced anywhere in `partyPlanner.controller.js`. The number that could answer "how many racks do I need for 12 people" already lives in the site's data — it's just never been connected to the tool that would actually use it.

## Doing the math the tool won't do for you

Since the party planner can't back-solve this, the arithmetic is worth doing by hand. `bonesPerGuest = 4` means the guest-count side is simple: 12 guests need roughly 48 bones as a main course, more if ribs are sharing the table with other proteins, fewer if they're a side dish. The rack side takes a bit of butcher knowledge the registry doesn't encode — a typical spare or St. Louis-trimmed rack runs somewhere around 11 to 13 bones, baby backs usually a couple fewer — so 48 bones lands you around four full racks, comfortably inside the stall predictor's own 1–8 rack range for the same cut.

That rack count is also where the registry's real numbers pick back up. The cut you choose changes the cook rate directly — `rate_modifiers.cut` gives spare ribs a 0.82× multiplier, St. Louis 0.9×, baby back 1.05× — but racks stack in parallel, not in series, so going from three racks to four doesn't change your cook time at all, only your fuel and your bone count.

## Plan the party by hand, plan the cook with the tools that fit

None of this is a gap to file a complaint about — it's the site correctly declining to force a rack-and-bone protein through a trim-and-shrinkage model built for something else. For the guest-count math, do the `bonesPerGuest` arithmetic yourself the way this post just did, and check what the **[party planner](/party-planner)** does for brisket, pork shoulder, and turkey to see the shape of the tool ribs deliberately sits outside of. For the cook itself, ribs still get the full treatment: the **[ribs stall predictor](/ribs-stall)** models the slab-geometry curve by cut, and the **[cook scheduler](/cook-scheduler?pr=pork_ribs)** hands you the fixed 3-2-1 block timeline with a fire-up time attached — just plan how many racks to buy before you get there.
