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
  - text: "Take the shoulder out of the package and pat it dry. Weigh it before you trim anything, then set the slider above to that weight."
    why: "Every amount on this page is a percentage of the raw weight, so the scale reading sets the salt and the rub."
  - text: "Sprinkle the salt evenly over the whole shoulder. Set it on a rack over a pan and put it back in the fridge overnight."
    why: "Salt starts on the surface and needs hours to work its way deeper into the meat, which is why it goes on the night before."
  - text: "The next day, mix the brown sugar, pepper, paprika, and garlic powder, then press the rub onto every side."
    why: "Part of bark is a slow browning reaction between amino acids and sugars. Coarse pepper gives the smoke more rough surface to hold onto than fine pepper does."
  - text: "Put the shoulder on straight from the fridge with the smoker holding 250°F."
    why: "The time estimate starts from fridge-cold meat at about 40°F, so putting it on cold keeps your cook matched to the number here."
    timing: model
  - text: "Leave the lid closed until the probe reads 160°F, then wrap the shoulder snugly in butcher paper and put it back on."
    why: "At a 250°F pit the model's stall starts near 165°F. That's when moisture evaporating off the surface carries heat away as fast as the smoker adds it. Wrapping just before then gives the paper the whole stall to work on, and because paper slows evaporation without sealing it off, the stall gets shorter."
  - text: "Keep going until the probe slides in with almost no push, around 202°F. On a bone-in shoulder the bone should wiggle loose."
    why: "The model counts the cook as finished at 202°F, the point where a shoulder is tender enough to pull apart by hand."
  - text: "Take it off the smoker and let it rest in the paper before you shred it."
    why: "Once it leaves the heat the meat cools on a steady curve toward the air around it. How long it stays above the 140°F holding line depends on how you hold it, so the rest calculator gives you that number for your setup."
---

The first pork shoulder I smoked, I salted it right before it went on and wondered why the middle tasted flat next to the crust. This version moves the salt to the night before and scales every amount to your shoulder, so an 8 lb butt and a 10 lb butt get the right amount of salt instead of the same few tablespoons.

A few things to know before you start:

- **Weigh it yourself.** The amounts come from the raw weight, taken out of the package before you trim anything. Use a kitchen scale and read the ingredients in grams, since salt brands pack differently by the spoon.
- **Where the time comes from.** The smoker time is the output of our pork shoulder model (v2026.3), run for an offset smoker at 250°F on a moderate day and wrapped in butcher paper at 160°F. A different cooker or colder weather will move it, and you can run your own setup in the [pork shoulder stall predictor](/pork-shoulder-stall).
- **No rest number here.** How long the shoulder can wait depends on whether it waits in a cooler or out on the counter. The [rest calculator](/rest-calculator?pr=pork_shoulder) works that out for your hold.

If you want to see how much pulled pork you'll end up with or what it costs per cooked pound, the [pork shoulder calculator](/pork-shoulder-calculator?pr=pork_shoulder&w=8&c=bone_in&wr=paper) opens with this cook already filled in.
