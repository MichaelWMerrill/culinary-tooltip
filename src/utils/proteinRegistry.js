/*
 * Protein registry — the single source of truth for per-protein data blocks.
 *
 * Foundation for multi-protein support (see TODO.md #4). Each protein declares:
 *   - meta:    { id, name, slug, version }
 *   - yield:   loss matrices + market defaults + an `axes` array describing the
 *              yield calculator's inputs (so UI and engine cannot drift).
 *   - thermal: stall-engine constants (diffusivity, per-cook-temp stall
 *              thresholds, geometry, start/finish temps, whether it stalls).
 *   - serving: cooked-weight → guest conversion constants.
 *
 * The `beef_brisket` block below was MOVED (not copied) out of
 * `brisketEngine.js` and `stallEngine.js`; those engines now import from here.
 * Values are byte-for-byte identical to the legacy inline data so the golden
 * regression specs pass unmodified.
 */

export const PROTEINS = {
  beef_brisket: {
    meta: {
      id: 'beef_brisket',
      name: 'Beef Brisket',
      slug: 'brisket',
      version: '2026.1',
    },

    yield: {
      // Market defaults surfaced by the yield calculator.
      defaults: {
        currency: 'USD',
        mass_unit: 'lb',
        // USDA-graded packer-brisket retail price points (calibration
        // estimate — see METHODOLOGY; regional, updated per data version).
        market_prices: { PRIME: 5.49, CHOICE: 4.29, SELECT: 3.49 },
      },

      // Empirical loss matrix (decimal percentages = fraction of weight).
      // trim = fraction removed while trimming; cook = fraction lost in the pit.
      matrix: {
        PRIME: { trim: { commercial: 0.28, competition: 0.42 }, cook: { naked: 0.4, paper: 0.35, foil: 0.31 } },
        CHOICE: { trim: { commercial: 0.24, competition: 0.36 }, cook: { naked: 0.39, paper: 0.34, foil: 0.3 } },
        SELECT: { trim: { commercial: 0.19, competition: 0.3 }, cook: { naked: 0.38, paper: 0.33, foil: 0.29 } },
      },

      // Per-option help copy (HTML-entity strings, matching site convention).
      copy: {
        trim: {
          commercial: 'Light retail trim &mdash; more fat cap left on.',
          competition: 'Aggressive competition trim &mdash; squared &amp; defatted.',
        },
        wrap: {
          naked: 'No wrap &mdash; deepest bark, highest moisture loss.',
          paper: 'Balanced bark and moisture retention.',
          foil: 'Texas crutch &mdash; fastest cook, least shrinkage.',
        },
      },

      // Input axes for the yield calculator. Phase 2 renders the input panel
      // straight from this array; the engine keys off these ids.
      axes: [
        {
          id: 'grade',
          label: 'USDA Grade',
          type: 'enum',
          options: [
            { value: 'PRIME', label: 'Prime' },
            { value: 'CHOICE', label: 'Choice' },
            { value: 'SELECT', label: 'Select' },
          ],
        },
        {
          id: 'trim',
          label: 'Trim Style',
          type: 'enum',
          options: [
            { value: 'commercial', label: 'Commercial' },
            { value: 'competition', label: 'Competition' },
          ],
          copy: 'trim',
        },
        {
          id: 'wrap',
          label: 'Wrap Method',
          type: 'enum',
          options: [
            { value: 'naked', label: 'Naked' },
            { value: 'paper', label: 'Butcher Paper' },
            { value: 'foil', label: 'Foil' },
          ],
          copy: 'wrap',
        },
        {
          id: 'weight',
          label: 'Raw Weight',
          type: 'slider',
          range: { min: 4, max: 18, step: 0.5, unit: 'lb' },
        },
        {
          id: 'price',
          label: 'Price / lb',
          type: 'slider',
          range: { min: 1, max: 12, step: 0.1, unit: 'USD' },
        },
      ],
    },

    thermal: {
      // Bulk thermal properties of lean beef (data-matrix decoration; the phase
      // model scales empirically rather than solving the PDE directly).
      base_thermal_diffusivity_alpha: 0.0014, // m^2/hr, published lean-beef value
      latent_heat_vaporization_Lv: 2260000, // J/kg, water at 100°C
      start_temp: 40, // °F, fridge-cold meat
      finish_temp: 203, // °F, probe-tender packer target
      stalls: true,

      // Per-pit-temperature initial climb rate + stall onset temperature.
      cook_temperatures: {
        225: { target_fahrenheit: 225, base_hourly_climb_rate_initial: 25.0, stall_threshold_fahrenheit: 155.0 },
        250: { target_fahrenheit: 250, base_hourly_climb_rate_initial: 32.0, stall_threshold_fahrenheit: 162.0 },
        275: { target_fahrenheit: 275, base_hourly_climb_rate_initial: 40.0, stall_threshold_fahrenheit: 170.0 },
      },

      // Mass-scaling geometry: packer brisket ≈ thick cylinder, rate ∝ W^exponent.
      geometry: {
        shape: 'cylinder',
        beta: 0.42, // geometric constant
        exponent: -0.333, // W^(-1/3) heat-transfer scaling
        weight_bounds: { min: 4.0, max: 18.0 },
      },
    },

    serving: {
      lbPerGuestCooked: 0.5, // lb cooked brisket per guest
    },
  },
};
