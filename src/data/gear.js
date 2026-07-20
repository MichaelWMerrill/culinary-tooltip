/*
 * gear.js — the single catalog of affiliate gear + the state → product matching
 * rules that drive GearModule.astro.
 *
 * Every `url` here is a real Amazon Associates short link (amzn.to) carrying our
 * associate tag — the same links previously hardcoded in the calculator
 * components, now centralized. We do NOT fabricate links: a product with no live
 * affiliate URL is listed under ROADMAP_GEAR (below) as a stub for a human to
 * fill in, and is never rendered until it has a real `url`.
 *
 * Disclosure text is defined once and reused by every module, matching the
 * existing "As an Amazon Associate…" convention across the site.
 */

export const ASSOCIATE_DISCLOSURE = 'As an Amazon Associate I earn from qualifying purchases.';

// Live catalog — real associate links.
export const GEAR = {
  meat_probes: {
    id: 'meat_probes',
    name: 'Wireless Meat Probes',
    blurb: 'Track pit ambient and internal core temps live so you catch the stall the moment it forms.',
    url: 'https://amzn.to/4eY9t7J',
    cta: 'View Wireless Probes',
    icon: '🌡️',
  },
  wood_pellets: {
    id: 'wood_pellets',
    name: 'Hardwood Smoker Pellets',
    blurb: 'Consistent low-ash pellets keep the burn rate — and your fuel math — predictable.',
    url: 'https://amzn.to/4wuM3N2',
    cta: 'View Smoker Pellets',
    icon: '🪵',
  },
  smoker_charcoal: {
    id: 'smoker_charcoal',
    name: 'Lump Charcoal & Briquettes',
    blurb: 'Clean-burning charcoal for kettles, kamados, and offsets running on coals.',
    url: 'https://amzn.to/4vuiMBs',
    cta: 'View Smoker Charcoal',
    icon: '🔥',
  },
};

/*
 * ROADMAP_GEAR — products the matching rules WANT (see PLAN Phase 7) but that
 * don't yet have a live associate link. Give each a real amzn.to URL and move it
 * into GEAR above to light it up; the matcher already references these ids where
 * relevant, and GearModule skips any pick without a resolvable `url`.
 *
 *   peach_paper   → paper wrap selected      (yield / stall / scheduler)
 *   charcoal_baskets → offset/charcoal pit    (scheduler / fuel)
 *   rib_racks     → ribs                      (stall / scheduler)
 *   turkey_injector → turkey                  (yield / stall)
 */
export const ROADMAP_GEAR = {
  peach_paper: { id: 'peach_paper', name: 'Peach Butcher Paper', cta: 'View Butcher Paper', icon: '📦' },
  charcoal_baskets: { id: 'charcoal_baskets', name: 'Charcoal Baskets', cta: 'View Charcoal Baskets', icon: '🧺' },
  rib_racks: { id: 'rib_racks', name: 'Rib Roasting Racks', cta: 'View Rib Racks', icon: '🍖' },
  turkey_injector: { id: 'turkey_injector', name: 'Marinade Injector', cta: 'View Injector', icon: '💉' },
};

// Resolve an id to a renderable product (only if it has a live url).
export function resolveGear(id) {
  const g = GEAR[id];
  return g && g.url ? g : null;
}

/*
 * gearFor(tool, state) — map a calculator's tool + current state to up to 3
 * product ids, most-relevant first. `state` is optional so a server render can
 * pass the initial state and the client can re-query as controls change.
 * Only ids that resolve to a live url are returned.
 */
export function gearFor(tool, state = {}) {
  const picks = [];
  const add = (id) => {
    if (!picks.includes(id)) picks.push(id);
  };

  switch (tool) {
    case 'fuel': {
      // Flagship state → product case: match the selected fuel type. Accepts the
      // fuel controller's enum values (wood_pellets / charcoal_briquettes /
      // hardwood_splits) as well as the short forms pellets / charcoal.
      const fuel = state.fuel || state.fuelType;
      if (fuel === 'wood_pellets' || fuel === 'pellets') add('wood_pellets');
      else if (fuel === 'charcoal_briquettes' || fuel === 'hardwood_splits' || fuel === 'charcoal') add('smoker_charcoal');
      else {
        add('wood_pellets');
        add('smoker_charcoal');
      }
      break;
    }
    case 'stall':
    case 'scheduler':
      // A live probe is the universally relevant gear for a temperature cook.
      add('meat_probes');
      // A charcoal/offset pit benefits from baskets (roadmap link).
      if (state.pit === 'offset_smoker' || state.pit === 'charcoal_kettle') add('charcoal_baskets');
      if (state.protein === 'pork_ribs' || state.cut) add('rib_racks');
      break;
    case 'yield':
      add('meat_probes');
      if (state.protein === 'turkey' || state.preparation) add('turkey_injector');
      break;
    default:
      add('meat_probes');
  }

  return picks.map((id) => resolveGear(id)).filter(Boolean).slice(0, 3).map((g) => g.id);
}
