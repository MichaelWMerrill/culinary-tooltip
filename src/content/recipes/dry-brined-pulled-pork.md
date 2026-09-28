---
title: "Dry-Brined Pulled Pork"
seoTitle: "Dry-Brined Pulled Pork Recipe by Weight"
description: "Dry-brined pulled pork recipe with salt and rub scaled to your shoulder's weight, plus a smoker time from the model behind our stall predictor."
pubDate: 2026-09-28
heroImage: '/recipes/dry-brined-pulled-pork.jpg'
heroAlt: "Shredded smoked pork shoulder in a foil pan with metal shredding claws at both edges."
pillar: how-to
protein: [pork_shoulder]
calculator: pork-shoulder-calculator
modelProtein: pork_shoulder
modelVersion: "2026.3"
defaults:
  weight: 8
  cut: bone_in
  wrap: paper
  pitTemp: 250
  pit: offset_smoker
  climate: moderate
  wrapTemp: 160
sources:
  - id: fsis-smoking-meat-poultry
    title: "Smoking Meat and Poultry"
    publisher: "USDA Food Safety and Inspection Service"
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/smoking-meat-and-poultry"
    tier: A
    checked: 2026-09-27
    note: "Danger zone 40-140F, thaw fully before smoking, smoker 225-300F, 4-8h smoke, 145F pork minimum with 3 min rest, refrigerate within 2h and use within 4 days."
  - id: graiver-2006-nacl-diffusion
    title: "Diffusion of sodium chloride in pork tissue"
    publisher: "Journal of Food Engineering 77, 910-918 (2006)"
    url: "https://www.sciencedirect.com/science/article/abs/pii/S0260877405005704"
    tier: A
    checked: 2026-09-27
    note: "Brine immersion of pork Longissimus dorsi at 4C; effective diffusion coefficient about 0.6-5.0 x 10^-10 m2/s across 30-200 g/L NaCl. A wet-brine study, not a dry-rub study. The millimeter-scale overnight penetration depth cited in this recipe is our own arithmetic from these coefficients (depth ~ sqrt(D*t)), not a figure the paper itself reports."
  - id: amazingribs-beef-rub
    title: "Big Bad Beef Rub"
    publisher: "AmazingRibs.com"
    url: "https://amazingribs.com/tested-recipes/spice-rubs-and-pastes/big-bad-beef-rub-recipe/"
    tier: B
    checked: 2026-09-27
    note: "Per-pound salt rule of thumb only (about 1/2 tsp Morton coarse kosher salt per pound, bone excluded). Not used for salt depth or hold times."
# Every ratio is a fraction of raw weight as purchased, weighed out of the
# package before trimming. All pending science-editor review.
ratios:
  - { id: salt, label: "Kosher salt", pct: 0.0075, review: pending, sourceIds: [amazingribs-beef-rub] }
  - { id: sugar, label: "Brown sugar", pct: 0.005, review: pending }
  - { id: pepper, label: "Coarse black pepper", pct: 0.003, review: pending }
  - { id: paprika, label: "Paprika", pct: 0.003, review: pending }
  - { id: garlic, label: "Garlic powder", pct: 0.0015, review: pending }
guidance:
  - id: dry-brine-hold
    text: "Give the salted shoulder at least one night in the fridge before it goes on the smoker. A lot of cooks stretch that to a full day. That timing comes from common practice, and we haven't measured it ourselves."
    review: pending
steps:
  - text: "Take the shoulder out of the package and pat it dry. Make sure it's fully thawed all the way through, then weigh it before you trim anything, and use that weight for every amount below."
    why: "A smoker runs cool compared to an oven, so a shoulder that's still partly frozen in the middle can sit in the 40 to 140°F danger zone longer than it should while the frozen part catches up. Thawing it fully first keeps that clock from running long."
    sourceIds: [fsis-smoking-meat-poultry]
  - text: "Sprinkle the salt evenly over the whole shoulder. Set it on a rack over a pan on the bottom shelf of the fridge, away from any food that's ready to eat, and leave it overnight."
    why: "Salt starts on the surface and moves inward slowly from there. The closest published measurement we found is a study of salt moving into pork sitting in a brine solution, not a dry rub on the surface. Running its diffusion numbers ourselves puts overnight penetration at a few millimeters, our own arithmetic from that study, not a figure it reports directly. So it's fair to say salt gets into the surface layer overnight and not much further, and we haven't measured our own dry-rub version of that."
    sourceIds: [graiver-2006-nacl-diffusion]
  - text: "The next day, mix the brown sugar, pepper, paprika, and garlic powder, then press the rub onto every side."
    why: "Part of bark is a slow browning reaction between amino acids and sugars. Coarse pepper gives the smoke more rough surface to hold onto than fine pepper does."
  - text: "Put the shoulder on straight from the fridge with the smoker holding 250°F."
    why: "The time estimate starts from fridge-cold meat at about 40°F, so putting it on cold keeps your cook matched to the number here."
    timing: model
  - text: "Leave the lid closed until the probe reads 160°F, then wrap the shoulder snugly in butcher paper and put it back on."
    why: "At a 250°F pit in moderate weather, the model's stall starts near 165°F. That's when moisture evaporating off the surface carries heat away as fast as the smoker adds it. In moderate climate, wrapping just before then gives the paper the whole stall to work on, and because paper slows evaporation without sealing it off, the stall gets shorter. Drier or more humid air moves the onset temperature, so the same wrap point won't always land at the very start of the stall."
  - text: "Keep going until the probe slides in with almost no push, around 202°F. On a bone-in shoulder the bone should wiggle loose."
    why: "202°F is a pulling target for texture, not a safety number. FSIS's minimum safe temperature for a pork roast is 145°F with a 3 minute rest, and this shoulder passes that point well before it's done. By 202°F it's tender enough to shred. Cooks commonly use easy probing and a loose bone as signs it's gotten there, though we haven't measured either one ourselves. If the timing between 40°F and 140°F runs long on your cook, that's expected for a shoulder this size; [here's why that's not a warning sign](/blog/danger-zone-guideline-vs-real-cook)."
    sourceIds: [fsis-smoking-meat-poultry]
  - text: "Take it off the smoker and let it rest in the paper before you shred it."
    why: "Once it leaves the heat the meat cools on a steady curve toward the air around it. Left loosely tented on the counter that curve drops fast, so don't let it sit long there. How long it actually stays above the 140°F holding line depends on how you hold it, so the rest calculator gives you that number for your setup."
  - text: "Once you've shredded it, refrigerate whatever you're not serving right away within 2 hours of it coming off the smoker, and use leftovers within about 4 days."
    why: "That's FSIS's own guidance for cooked meat, not something specific to this recipe. Time spent resting in the paper counts toward that 2 hours; FSIS starts the clock the moment it leaves the smoker, not from when you finish shredding."
    sourceIds: [fsis-smoking-meat-poultry]
---

This version moves the salt to the night before and scales every amount to your shoulder, so an 8 lb butt and a 10 lb butt get the right amount of salt instead of the same few tablespoons.

A few things to know before you start:

- **Weigh it yourself.** The amounts come from the raw weight, taken out of the package before you trim anything. Use a kitchen scale and read the ingredients in grams. A spoonful of salt can weigh a different amount from one brand to the next, and we haven't measured that ourselves, so grams keep the ratio steady no matter what's in your pantry.
- **How much salt.** 0.75% of the purchased weight is a moderate starting point, not a claim that it's the one right number. AmazingRibs' well-known rule of thumb, about half a teaspoon of Morton coarse kosher salt per pound, measures against the meat with the bone weight left out. Plenty of cooks salt heavier than this. Adjust it to your own taste once you've tried it.
- **The rub blend.** Brown sugar, pepper, paprika, and garlic powder here are our starting rub, not a claim that these are the correct ratios. We haven't sourced these amounts from anywhere; they're a reasonable place to begin and worth adjusting.
- **Where the time comes from.** The smoker time is the output of our pork shoulder model (v2026.3), run for an offset smoker at 250°F in moderate weather and wrapped in butcher paper at 160°F. A different cooker, or drier or more humid air, will move it, and you can run your own setup in the [pork shoulder stall predictor](/pork-shoulder-stall).
- **No rest number here.** How long the shoulder can wait depends on whether it waits in a cooler or out on the counter. The [rest calculator](/rest-calculator?pr=pork_shoulder) works that out for your hold.

If you want to see how much pulled pork you'll end up with or what it costs per cooked pound, the [pork shoulder calculator](/pork-shoulder-calculator?pr=pork_shoulder&w=8&c=bone_in&wr=paper) opens with this cook already filled in.
