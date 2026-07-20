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
      shortName: 'Brisket', // used in calculator H1s ("<shortName> Yield & Cost Calculator")
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

      // How calcYield indexes the matrix for this protein. `primary` selects the
      // matrix row from state; `trim`/`cook` name the state fields that index the
      // trim (prep) and cook loss sub-maps (a field of null means the level is a
      // scalar rather than a keyed map).
      lossKeys: { primary: 'grade', trim: 'trim', cook: 'wrap' },

      // Default control values the calculator seeds before localStorage / share
      // params override them (the component renders these as the initial markup).
      initialState: { weight: 14, price: 4.29, grade: 'CHOICE', trim: 'commercial', wrap: 'paper', guests: 12 },

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

      // Input axes for the yield calculator, in panel order. Phase 2 renders
      // the input panel straight from this array and the script keys its wiring
      // (element ids, enum whitelists, slider clamps) off these descriptors, so
      // the UI and engine cannot drift.
      axes: [
        {
          id: 'weight',
          label: 'Raw Brisket Weight',
          type: 'slider',
          range: { min: 4, max: 30, step: 0.5, unit: 'lb' },
        },
        {
          id: 'price',
          label: 'Price Per Pound',
          type: 'slider',
          control: 'price-market', // adds the "use market avg" affordance
          range: { min: 1.5, max: 9, step: 0.05, unit: 'USD' },
        },
        {
          id: 'grade',
          label: 'USDA Grade',
          type: 'enum',
          control: 'select',
          options: [
            { value: 'PRIME', label: 'USDA Prime' },
            { value: 'CHOICE', label: 'USDA Choice' },
            { value: 'SELECT', label: 'USDA Select' },
          ],
        },
        {
          id: 'trim',
          label: 'Trim Style',
          type: 'enum',
          control: 'segmented',
          cols: 2,
          copy: 'trim',
          options: [
            { value: 'commercial', label: 'Commercial' },
            { value: 'competition', label: 'Aggressive' },
          ],
        },
        {
          id: 'wrap',
          label: 'Cook Wrap Method',
          type: 'enum',
          control: 'segmented',
          cols: 3,
          copy: 'wrap',
          options: [
            { value: 'naked', label: 'Naked' },
            { value: 'paper', label: 'Butcher Paper' },
            { value: 'foil', label: 'Foil' },
          ],
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
      // Base naked-cook stall length (hours) before mass/pit/climate scaling.
      // Calibrated so a 10 lb packer on an offset smoker stalls ~1.5–2 h
      // (calibration estimate — see METHODOLOGY).
      stall_hours_base: 1.9,

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

      // Protein-specific input axis for the stall/scheduler tools. Only weight is
      // protein-driven here; wrap/pit/climate are equipment/environment and stay
      // component-local. The slider UI range is wider than the physics
      // weight_bounds above (which only clamps the mass-scaling term).
      axes: [
        {
          id: 'weight',
          label: 'Meat Weight',
          type: 'slider',
          range: { min: 4, max: 20, step: 0.5, unit: 'lb' },
        },
      ],
    },

    serving: {
      lbPerGuestCooked: 0.5, // lb cooked brisket per guest
    },
  },

  pork_shoulder: {
    meta: {
      id: 'pork_shoulder',
      name: 'Pork Shoulder',
      shortName: 'Pork Shoulder',
      slug: 'pork-shoulder',
      version: '2026.1',
    },

    yield: {
      defaults: {
        currency: 'USD',
        mass_unit: 'lb',
        // Retail Boston-butt price points; boneless carries a deboning premium
        // (calibration estimate — see METHODOLOGY; regional, per data version).
        market_prices: { bone_in: 1.99, boneless: 2.99 },
      },

      // Loss matrix keyed by cut. trim = prep loss (fat-cap trim, plus the blade
      // bone that never becomes pulled meat on a bone-in butt); cook = fraction
      // of the trimmed weight lost to rendering + evaporation over a long cook.
      // Pulled-pork yields land ~50% (bone-in) to ~58% (boneless) of raw
      // (calibration estimate — see METHODOLOGY; USDA fresh-pork yield data).
      matrix: {
        bone_in: { trim: 0.12, cook: { naked: 0.42, paper: 0.38, foil: 0.34 } },
        boneless: { trim: 0.06, cook: { naked: 0.42, paper: 0.38, foil: 0.34 } },
      },

      lossKeys: { primary: 'cut', trim: null, cook: 'wrap' },

      initialState: { weight: 8, price: 1.99, cut: 'bone_in', wrap: 'paper', guests: 12 },

      copy: {
        cut: {
          bone_in: 'Bone-in butt &mdash; more forgiving, richer bark; the blade bone is not pulled meat.',
          boneless: 'Boneless &mdash; higher usable yield and faster to pull, at a price premium.',
        },
        wrap: {
          naked: 'No wrap &mdash; deepest bark, highest moisture loss.',
          paper: 'Balanced bark and moisture retention.',
          foil: 'Foil boat/crutch &mdash; fastest cook, least shrinkage.',
        },
      },

      axes: [
        {
          id: 'weight',
          label: 'Raw Shoulder Weight',
          type: 'slider',
          range: { min: 4, max: 12, step: 0.5, unit: 'lb' },
        },
        {
          id: 'price',
          label: 'Price Per Pound',
          type: 'slider',
          control: 'price-market',
          range: { min: 1, max: 6, step: 0.05, unit: 'USD' },
        },
        {
          id: 'cut',
          label: 'Cut',
          type: 'enum',
          control: 'segmented',
          cols: 2,
          copy: 'cut',
          options: [
            { value: 'bone_in', label: 'Bone-In' },
            { value: 'boneless', label: 'Boneless' },
          ],
        },
        {
          id: 'wrap',
          label: 'Cook Wrap Method',
          type: 'enum',
          control: 'segmented',
          cols: 3,
          copy: 'wrap',
          options: [
            { value: 'naked', label: 'Naked' },
            { value: 'paper', label: 'Butcher Paper' },
            { value: 'foil', label: 'Foil' },
          ],
        },
      ],
    },

    thermal: {
      base_thermal_diffusivity_alpha: 0.0015, // m^2/hr, fatty pork ≈ lean beef order
      latent_heat_vaporization_Lv: 2260000, // J/kg, water at 100°C
      start_temp: 40, // °F, fridge-cold meat
      finish_temp: 202, // °F, probe-tender / bone wobbles for pulling
      stalls: true,
      // Shorter, softer plateau than brisket — a fattier, more compact cut renders
      // through the stall faster (calibration estimate — see METHODOLOGY).
      stall_hours_base: 1.3,

      cook_temperatures: {
        225: { target_fahrenheit: 225, base_hourly_climb_rate_initial: 24.0, stall_threshold_fahrenheit: 158.0 },
        250: { target_fahrenheit: 250, base_hourly_climb_rate_initial: 30.0, stall_threshold_fahrenheit: 165.0 },
        275: { target_fahrenheit: 275, base_hourly_climb_rate_initial: 38.0, stall_threshold_fahrenheit: 172.0 },
      },

      // Boston butt ≈ a squat, thick cylinder; a touch blockier than a packer.
      geometry: {
        shape: 'cylinder',
        beta: 0.45, // geometric constant (calibration estimate — see METHODOLOGY)
        exponent: -0.333, // W^(-1/3) heat-transfer scaling
        weight_bounds: { min: 4.0, max: 12.0 },
      },

      axes: [
        {
          id: 'weight',
          label: 'Shoulder Weight',
          type: 'slider',
          range: { min: 4, max: 12, step: 0.5, unit: 'lb' },
        },
      ],
    },

    serving: {
      lbPerGuestCooked: 0.333, // lb pulled pork per guest (~1/3 lb sandwich portion)
    },
  },

  pork_ribs: {
    meta: {
      id: 'pork_ribs',
      name: 'Pork Ribs',
      shortName: 'Ribs',
      slug: 'ribs',
      version: '2026.1',
    },

    // No yield/cost calculator: ribs are planned and served by the rack/bone,
    // not by trim-and-shrinkage weight — so this protein has no `yield` block.
    thermal: {
      base_thermal_diffusivity_alpha: 0.0015, // m^2/hr
      latent_heat_vaporization_Lv: 2260000, // J/kg
      start_temp: 40, // °F
      finish_temp: 203, // °F, bend/probe-tender
      stalls: true,
      // Ribs barely stall — thin cuts blow through the plateau (calibration
      // estimate — see METHODOLOGY).
      stall_hours_base: 0.12,

      // Fixed 3-2-1 method block hours per cut (unwrapped smoke / wrapped /
      // unwrapped-and-sauced); baby backs use the shorter 2-2-1. The scheduler
      // uses these instead of the stall model to lay out the rib timeline.
      method_321: { spare: [3, 2, 1], st_louis: [3, 2, 1], baby_back: [2, 2, 1] },

      cook_temperatures: {
        225: { target_fahrenheit: 225, base_hourly_climb_rate_initial: 30.0, stall_threshold_fahrenheit: 150.0 },
        250: { target_fahrenheit: 250, base_hourly_climb_rate_initial: 38.0, stall_threshold_fahrenheit: 155.0 },
        275: { target_fahrenheit: 275, base_hourly_climb_rate_initial: 46.0, stall_threshold_fahrenheit: 160.0 },
      },

      // Slab geometry: heat transfer is set by the (thin) rack thickness, so the
      // cook time is independent of rack count — see stallEngine's shape branch.
      geometry: {
        shape: 'slab',
        beta: 0.3, // nominal (unused for slabs)
        exponent: -0.333,
        weight_bounds: { min: 1, max: 8 }, // racks
      },

      // Cut sets the thin-dimension thickness, which drives the cook rate: baby
      // backs are thinner/faster, spares thicker/slower (calibration estimate).
      rate_modifiers: {
        cut: { spare: 0.82, st_louis: 0.9, baby_back: 1.05 },
      },

      copy: {
        cut: {
          spare: 'Full spare rack &mdash; thickest, meatiest, longest cook.',
          st_louis: 'St. Louis trim &mdash; squared spare, even cooking.',
          baby_back: 'Baby back (loin) &mdash; thinnest and quickest.',
        },
      },

      initialState: { cut: 'spare', racks: 3 },

      // Stall-tool inputs: rib cut (drives the cook rate) and rack count (does
      // not change the cook time — only servings/fuel).
      axes: [
        {
          id: 'cut',
          label: 'Rib Cut',
          type: 'enum',
          control: 'segmented',
          cols: 3,
          copy: 'cut',
          param: 'ct',
          options: [
            { value: 'spare', label: 'Spare' },
            { value: 'st_louis', label: 'St. Louis' },
            { value: 'baby_back', label: 'Baby Back' },
          ],
        },
        {
          id: 'racks',
          label: 'Racks',
          type: 'slider',
          param: 'rk',
          range: { min: 1, max: 8, step: 1, unit: 'racks' },
        },
      ],
    },

    serving: {
      bonesPerGuest: 4, // ~4 bones per guest as a main (calibration estimate)
    },
  },

  turkey: {
    meta: {
      id: 'turkey',
      name: 'Turkey',
      shortName: 'Turkey',
      slug: 'turkey',
      version: '2026.1',
    },

    yield: {
      defaults: {
        currency: 'USD',
        mass_unit: 'lb',
        // Retail whole-turkey price (calibration estimate — see METHODOLOGY).
        market_prices: { whole: 1.49, spatchcock: 1.49 },
      },

      // Loss matrix keyed by preparation. trim = giblets/neck (and, for
      // spatchcock, the removed backbone) that are not carved meat; cook =
      // fraction of trimmed weight lost to evaporation, lower when brined
      // (retained moisture). Carved yields land ~65–75% of raw (calibration
      // estimate — see METHODOLOGY; USDA poultry yield data).
      matrix: {
        whole: { trim: 0.05, cook: { no: 0.28, yes: 0.2 } },
        spatchcock: { trim: 0.07, cook: { no: 0.28, yes: 0.2 } },
      },

      lossKeys: { primary: 'preparation', trim: null, cook: 'brined' },

      initialState: { weight: 14, price: 1.49, preparation: 'whole', brined: 'no', guests: 12 },

      copy: {
        preparation: {
          whole: 'Whole bird &mdash; classic presentation, slower cook.',
          spatchcock: 'Spatchcock &mdash; backbone out, laid flat; cooks faster and more evenly.',
        },
        brined: {
          no: 'No brine &mdash; more evaporative loss during the cook.',
          yes: 'Brined &mdash; retains moisture, higher finished yield.',
        },
      },

      axes: [
        {
          id: 'weight',
          label: 'Turkey Weight',
          type: 'slider',
          range: { min: 8, max: 24, step: 0.5, unit: 'lb' },
        },
        {
          id: 'price',
          label: 'Price Per Pound',
          type: 'slider',
          control: 'price-market',
          range: { min: 0.75, max: 4, step: 0.05, unit: 'USD' },
        },
        {
          id: 'preparation',
          label: 'Preparation',
          type: 'enum',
          control: 'segmented',
          cols: 2,
          copy: 'preparation',
          options: [
            { value: 'whole', label: 'Whole' },
            { value: 'spatchcock', label: 'Spatchcock' },
          ],
        },
        {
          id: 'brined',
          label: 'Brine',
          type: 'enum',
          control: 'segmented',
          cols: 2,
          copy: 'brined',
          options: [
            { value: 'no', label: 'No Brine' },
            { value: 'yes', label: 'Brined' },
          ],
        },
      ],
    },

    thermal: {
      base_thermal_diffusivity_alpha: 0.0016, // m^2/hr
      latent_heat_vaporization_Lv: 2260000, // J/kg
      start_temp: 40, // °F
      finish_temp: 160, // °F breast pull; carryover carries it to a safe 165°F
      stalls: false, // poultry climbs monotonically — no evaporative plateau
      stall_hours_base: 0, // unused (no stall)

      cook_temperatures: {
        225: { target_fahrenheit: 225, base_hourly_climb_rate_initial: 26.0, stall_threshold_fahrenheit: 160.0 },
        250: { target_fahrenheit: 250, base_hourly_climb_rate_initial: 32.0, stall_threshold_fahrenheit: 160.0 },
        275: { target_fahrenheit: 275, base_hourly_climb_rate_initial: 40.0, stall_threshold_fahrenheit: 160.0 },
      },

      geometry: {
        shape: 'cylinder',
        beta: 0.4,
        exponent: -0.333,
        weight_bounds: { min: 8, max: 24 },
      },

      // Spatchcocking opens the bird up for faster, more even heating.
      rate_modifiers: {
        preparation: { whole: 1.0, spatchcock: 1.35 },
      },

      // Food-safety note surfaced in the stall results (sourced).
      safetyNote:
        'Pull the breast at 160°F — carryover heat carries it to a safe 165°F. 165°F is the instant pasteurization point, but the USDA also recognizes equivalent time-at-temperature (e.g. ~3.7 min held at 160°F). Cook dark meat/thighs toward 175°F for texture. (USDA FSIS Appendix A / poultry guidance.)',

      copy: {
        preparation: {
          whole: 'Whole bird &mdash; slower, more even climb.',
          spatchcock: 'Spatchcock &mdash; flattened, so it heats faster.',
        },
      },

      initialState: { preparation: 'whole', weight: 12 },

      axes: [
        {
          id: 'preparation',
          label: 'Preparation',
          type: 'enum',
          control: 'segmented',
          cols: 2,
          copy: 'preparation',
          param: 'pp',
          options: [
            { value: 'whole', label: 'Whole' },
            { value: 'spatchcock', label: 'Spatchcock' },
          ],
        },
        {
          id: 'weight',
          label: 'Turkey Weight',
          type: 'slider',
          param: 'w',
          range: { min: 8, max: 24, step: 0.5, unit: 'lb' },
        },
      ],
    },

    serving: {
      lbPerGuestCooked: 0.5, // lb carved turkey per guest
    },
  },
};
