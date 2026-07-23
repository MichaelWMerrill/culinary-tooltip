/*
 * Single source of truth for the version strings shown to users.
 *
 * There are THREE distinct, deliberately separate version concepts on the site.
 * They are different numbers because they track different things — collapsing
 * them into one would be wrong — so they are kept distinct and labelled
 * unambiguously wherever they surface:
 *
 *   1. SITE_VERSION   — the calendar release train of the whole site/content
 *                       (homepage badge + footer). Bumps on any site release.
 *   2. ENGINE_VERSION — the computational stall engine, frozen alongside the
 *                       golden regression tests. Sourced from the engine itself
 *                       (stallEngine DATA.simulation_metadata) so it cannot drift.
 *                       Surfaced as "stall engine v…" in the Stall Predictor.
 *   3. per-protein model version — lives in the protein registry
 *                       (PROTEINS.<id>.meta.version) and is surfaced as
 *                       "Model v…" in each calculator's results panel. This is
 *                       the number a shared link/screenshot is traceable to.
 *
 * Import the constant you need instead of hard-coding a literal, so these can
 * never drift out of sync across pages again.
 */
import { DATA } from './stallEngine.js';

/** Calendar release version of the whole site (homepage badge + footer). */
export const SITE_VERSION = '2026.3';

/** Computational stall-engine version (from the engine's own metadata). */
export const ENGINE_VERSION = DATA.simulation_metadata.engine_version;
