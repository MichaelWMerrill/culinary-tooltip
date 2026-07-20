/*
 * toolMatrix — the canonical protein × tool link lattice.
 *
 * Single source of truth for the homepage "Pitmaster Command Center" grid, the
 * nav, and the 404 page. Keeping every internal link in one place means the
 * cross-linking stays consistent and no protein × tool page is ever orphaned.
 *
 * The per-protein URLs mirror ProteinSelector.astro's canonical routes exactly;
 * a cell that is absent from a tool's `urls` map has no page for that protein
 * (e.g. ribs have no yield calculator, turkey isn't in the scheduler).
 */
import { PROTEINS } from './proteinRegistry.js';

// Row order for the matrix. Icons live here (not the registry) since they're a
// presentation concern for the command center, not engine data.
export const MATRIX_PROTEINS = [
  { id: 'beef_brisket', name: PROTEINS.beef_brisket.meta.name, icon: '🥩' },
  { id: 'pork_shoulder', name: PROTEINS.pork_shoulder.meta.name, icon: '🐖' },
  { id: 'pork_ribs', name: PROTEINS.pork_ribs.meta.name, icon: '🍖' },
  { id: 'turkey', name: PROTEINS.turkey.meta.name, icon: '🦃' },
];

// Column order for the matrix. Each tool maps protein id → canonical URL.
export const MATRIX_TOOLS = [
  {
    key: 'yield',
    label: 'Yield & Cost',
    icon: '⚖️',
    blurb: 'Trim, shrinkage & true $/cooked-lb',
    urls: {
      beef_brisket: '/brisket-calculator',
      pork_shoulder: '/pork-shoulder-calculator',
      turkey: '/turkey-calculator',
    },
  },
  {
    key: 'stall',
    label: 'Stall & Cook Time',
    icon: '📈',
    blurb: 'Internal-temp curve & the stall',
    urls: {
      beef_brisket: '/stall-predictor',
      pork_shoulder: '/pork-shoulder-stall',
      pork_ribs: '/ribs-stall',
      turkey: '/turkey-stall',
    },
  },
  {
    key: 'scheduler',
    label: 'Cook Scheduler',
    icon: '🗓️',
    blurb: 'Back-timed fire-up, wrap & rest',
    urls: {
      beef_brisket: '/cook-scheduler?pr=beef_brisket',
      pork_shoulder: '/cook-scheduler?pr=pork_shoulder',
      pork_ribs: '/cook-scheduler?pr=pork_ribs',
    },
  },
];

// Cross-protein / single-protein utilities that aren't a per-protein matrix
// cell. They round out the command center and the 404 links.
export const STANDALONE_TOOLS = [
  { key: 'fuel', href: '/fuel-estimator', icon: '🪵', label: 'Fuel & Cost Estimator', blurb: 'Fuel weight, bags & cost of the burn' },
  { key: 'party', href: '/party-planner', icon: '🧮', label: 'Party Planner', blurb: 'How much raw meat to buy per crowd' },
  { key: 'rest', href: '/rest-calculator', icon: '🧊', label: 'Rest & Hold', blurb: 'Safe hold window above the 140°F floor' },
  { key: 'size', href: '/brisket-size-calculator', icon: '📐', label: 'Brisket Size', blurb: 'Raw packer weight to buy per guest' },
];

// Total distinct calculator pages, for accurate hero copy.
export const TOOL_COUNT =
  MATRIX_TOOLS.reduce((n, t) => n + Object.keys(t.urls).length, 0) -
  // the scheduler is one route (?pr=), not three pages
  (Object.keys(MATRIX_TOOLS.find((t) => t.key === 'scheduler').urls).length - 1) +
  STANDALONE_TOOLS.length;
