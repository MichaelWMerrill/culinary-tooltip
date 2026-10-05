---
title: 'The Physics of the Stall: Why Your Smoked Meat Stops Cooking'
description: "My first overnight brisket parked at 158°F for two and a half hours and I was sure the thermometer had died. It hadn't — the meat was sweating, and the site's own stall constants explain exactly why."
pubDate: '2026-07-13'
updatedDate: '2026-08-23'
heroImage: '/blog/physics-of-the-stall.jpg'
pillar: science
protein: [beef_brisket]
---

First overnight brisket I ever ran, the probe climbed clean out of the fridge-cold 40s, and I felt good about it: on pace, nothing weird. Then somewhere around 155°F it just stopped. Sat there for two and a half hours while I circled the smoker convinced the probe battery had died or the coals had gone out. Neither. I'd hit the stall, and at the time I had no idea what that even was.

Backyard lore used to blame it on fat suddenly rendering or collagen breaking down all at once. It's neither. The stall is evaporative cooling, and it's the same physics as sweating.

## The meat is sweating, not stalling

Raw meat is roughly 70% water. As the smoker's heat pushes into it, that moisture migrates to the surface and starts evaporating, and evaporation isn't free. Turning liquid into vapor consumes energy, and that energy comes out of the meat itself, exactly the way sweat cools your skin on a hot day.

> Once the surface is evaporating fast enough to carry away heat at the same rate the smoker is delivering it, the internal temperature stops climbing. Not because the meat stopped cooking, because it hit a balance point.

The site's own thermal model puts a real number on where that balance point lands: at a 225°F pit, brisket's stall threshold sits at 155°F, which is almost exactly where mine parked. Push the pit hotter and the threshold moves too (162°F at 250°F, 170°F at 275°F) because a hotter pit needs a hotter surface before evaporation can keep pace with it.

## Airflow, humidity, and surface area move the plateau

None of those three variables changes *whether* you stall. They change how long you're stuck there. More airflow across the meat's surface pulls moisture off faster, which sounds like it should shorten the stall but does the opposite: faster evaporation means stronger cooling, which holds the balance point longer. A fan-forced pellet cooker or a well-drafted offset stalls harder than a sealed, low-airflow kamado for exactly that reason. Humid cooker air shrinks the vapor-pressure gap the moisture is evaporating into, so it evaporates (and cools) less, which is a shorter, milder stall. A flat, wide brisket has more surface to evaporate from than a compact pork butt, so the two cuts don't stall quite the same way even side by side on the same pit.

I've gone deep on each of these separately since: [climate humidity](/blog/climate-stall-paradox) moves the stall's onset temperature and duration in opposite directions depending on which way the air is drying, and [cooker type](/blog/pit-type-climb-vs-stall-tradeoff) trades climb speed for stall length in a way that isn't where you'd guess. This post is the primer; those are the arithmetic.

## Wrapping doesn't slow the stall down: it stops it

There are exactly two ways out, and the site's wrap constants describe both. Foil creates a sealed, 100%-humidity environment around the meat. No more evaporation possible, so the stall ends immediately and the climb resumes at a sharply accelerated rate. Butcher paper is semi-permeable: it slows evaporation without fully stopping it, so it shortens the stall without eliminating it outright. Riding it out naked means waiting for the surface to run out of easily accessible moisture on its own, which happens eventually but adds real hours to the total cook.

It turns out *when* you wrap matters as much as *what* you wrap in: wrap too late and you can lose almost the entire benefit, foil included. That's a big enough idea that it got [its own post](/blog/wrap-timing-not-just-what).

The **[stall predictor](/stall-predictor)** models all of this together (pit airflow, cooker humidity, wrap choice, and regional climate) and separates the length of the stall from the length of the whole cook, so you can see which lever is actually worth pulling before the next brisket goes on.
