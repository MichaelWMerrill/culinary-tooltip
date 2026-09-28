---
title: "Dry-Brined Pulled Pork"
description: "A pork shoulder you salt the night before, with every amount scaled to the weight of your own shoulder and a smoker time from the same model behind our stall predictor."
pubDate: 2026-09-28
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
# Every ratio is a fraction of raw weight as purchased, weighed out of the
# package before trimming. All pending science-editor review.
ratios:
  - { id: salt, label: "Kosher salt", pct: 0.0075, review: pending }
  - { id: sugar, label: "Brown sugar", pct: 0.005, review: pending }
  - { id: pepper, label: "Coarse black pepper", pct: 0.003, review: pending }
  - { id: paprika, label: "Paprika", pct: 0.003, review: pending }
  - { id: garlic, label: "Garlic powder", pct: 0.0015, review: pending }
guidance:
  - id: dry-brine-hold
    text: "Give the salted shoulder at least one night in the fridge before it goes on the smoker. A lot of cooks stretch that to a full day. That timing comes from common practice, and we haven't measured it ourselves."
    review: pending
steps:
  - text: "Take the shoulder out of the package and pat it dry. Weigh it before you trim anything, and use that weight for every amount below."
    why: "Every amount on this page is a percentage of the raw weight, so the scale reading sets the salt and the rub."
  - text: "Sprinkle the salt evenly over the whole shoulder. Set it on a rack over a pan on the bottom shelf of the fridge, away from any food that's ready to eat, and leave it overnight."
    why: "Salt starts on the surface and moves inward slowly from there. We haven't measured how far it gets in one night, so treat the overnight hold as common practice, not a measured result."
  - text: "The next day, mix the brown sugar, pepper, paprika, and garlic powder, then press the rub onto every side."
    why: "Part of bark is a slow browning reaction between amino acids and sugars. Coarse pepper gives the smoke more rough surface to hold onto than fine pepper does."
  - text: "Put the shoulder on straight from the fridge with the smoker holding 250°F."
    why: "The time estimate starts from fridge-cold meat at about 40°F, so putting it on cold keeps your cook matched to the number here."
    timing: model
  - text: "Leave the lid closed until the probe reads 160°F, then wrap the shoulder snugly in butcher paper and put it back on."
    why: "At a 250°F pit in moderate weather, the model's stall starts near 165°F. That's when moisture evaporating off the surface carries heat away as fast as the smoker adds it. On a moderate day, wrapping just before then gives the paper the whole stall to work on, and because paper slows evaporation without sealing it off, the stall gets shorter. Drier or more humid air moves the onset temperature, so the same wrap point won't always land at the very start of the stall."
  - text: "Keep going until the probe slides in with almost no push, around 202°F. On a bone-in shoulder the bone should wiggle loose."
    why: "The model counts the cook as finished at 202°F. Cooks commonly use easy probing and a loose bone as signs the shoulder has gotten there, though we haven't measured either one ourselves. If the timing between 40°F and 140°F runs long on your cook, that's expected for a shoulder this size; [here's why that's not a warning sign](/blog/danger-zone-guideline-vs-real-cook)."
  - text: "Take it off the smoker and let it rest in the paper before you shred it."
    why: "Once it leaves the heat the meat cools on a steady curve toward the air around it. Left loosely tented on the counter that curve drops fast, so don't let it sit long there. How long it actually stays above the 140°F holding line depends on how you hold it, so the rest calculator gives you that number for your setup."
---

The first pork shoulder I smoked, I salted it right before it went on. This version moves the salt to the night before and scales every amount to your shoulder, so an 8 lb butt and a 10 lb butt get the right amount of salt instead of the same few tablespoons.

A few things to know before you start:

- **Weigh it yourself.** The amounts come from the raw weight, taken out of the package before you trim anything. Use a kitchen scale and read the ingredients in grams. A spoonful of salt can weigh a different amount from one brand to the next, and we haven't measured that ourselves, so grams keep the ratio steady no matter what's in your pantry.
- **Where the time comes from.** The smoker time is the output of our pork shoulder model (v2026.3), run for an offset smoker at 250°F in moderate weather and wrapped in butcher paper at 160°F. A different cooker, or drier or more humid air, will move it, and you can run your own setup in the [pork shoulder stall predictor](/pork-shoulder-stall).
- **No rest number here.** How long the shoulder can wait depends on whether it waits in a cooler or out on the counter. The [rest calculator](/rest-calculator?pr=pork_shoulder) works that out for your hold.

If you want to see how much pulled pork you'll end up with or what it costs per cooked pound, the [pork shoulder calculator](/pork-shoulder-calculator?pr=pork_shoulder&w=8&c=bone_in&wr=paper) opens with this cook already filled in.
