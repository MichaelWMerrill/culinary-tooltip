/*
 * FuelEstimator controller — client logic extracted verbatim from the former
 * inline script in fuel-estimator.astro. This tool has no protein-specific
 * inputs (fuel type, insulation, wind, ambient are all equipment/environment),
 * so nothing is registry-driven here; the component still accepts a `protein`
 * prop for API consistency with the other calculators.
 */
import { CONFIG, estimate } from '../../utils/fuelEngine.js';
import { PitmasterAnalytics } from '../../utils/analytics.js';
import { clampNum, enumParam, boolParam, getParams, writeParams, wireCopyButton } from '../../utils/shareLink.js';

export function initFuelEstimator() {
  const state = {
    fuel: 'wood_pellets',
    duration: 12,
    insulation: 'single_wall_steel',
    ambientTemp: 70,
    wind: 'calm_0_5mph',
    bagCost: 18,
    bagWeight: 20,
    whatif: false,
  };

  const $ = (id) => document.getElementById(id);
  const money = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function render() {
    const r = estimate(state, state.insulation);

    $('fuelLbs').textContent = r.lbs.toFixed(1);
    $('burnRate').textContent = r.effRate.toFixed(2) + ' lb/hr effective';
    $('bags').textContent = r.bags.toFixed(1);
    $('wholeBags').textContent = Math.max(1, Math.ceil(r.bags));
    $('cost').textContent = money(r.cost);
    $('costPerHr').textContent = '$' + money(state.duration > 0 ? r.cost / state.duration : 0);

    const fm = CONFIG.fuel_metrics[state.fuel];
    $('fuelDesc').textContent = fm.btu_per_lb.toLocaleString() + ' BTU/lb · ~' + fm.base_burn_ideal + ' lb/hr ideal burn';

    const ins = CONFIG.insulation_profiles[state.insulation];
    $('insDesc').textContent = 'η ' + Math.round(ins.efficiency_eta * 100) + '% efficiency · U-loss ' + ins.loss_coefficient_u;

    $('heatBadge').classList.toggle('hidden', state.ambientTemp < 110);

    // State-aware gear: show the pellet or charcoal pick to match the fuel type.
    const isPellet = state.fuel === 'wood_pellets';
    const pelletPick = document.querySelector('[data-gear-pick="wood_pellets"]');
    const charcoalPick = document.querySelector('[data-gear-pick="smoker_charcoal"]');
    if (pelletPick) pelletPick.hidden = !isPellet;
    if (charcoalPick) charcoalPick.hidden = isPellet;

    renderWhatIf(r);
    renderFuelComparison();
    persist();
  }

  // Compare how much of each fuel this exact cook burns (same insulation, weather,
  // and duration). Only base_burn_ideal differs across fuels, so this contextualizes
  // the fuel choice in real pounds for the current setup. Pure — reuses estimate().
  function renderFuelComparison() {
    const fuels = [
      { key: 'wood_pellets', bar: 'barFuelP', val: 'valFuelP', lbl: 'lblFuelP', name: 'Pellets' },
      { key: 'charcoal_briquettes', bar: 'barFuelC', val: 'valFuelC', lbl: 'lblFuelC', name: 'Charcoal' },
      { key: 'hardwood_splits', bar: 'barFuelS', val: 'valFuelS', lbl: 'lblFuelS', name: 'Wood Splits' },
    ];
    const rows = fuels.map((f) => ({ ...f, lbs: estimate({ ...state, fuel: f.key }, state.insulation).lbs }));
    const maxLbs = Math.max(...rows.map((r) => r.lbs), 0.0001);
    const minLbs = Math.min(...rows.map((r) => r.lbs));

    rows.forEach((r) => {
      const bar = $(r.bar),
        val = $(r.val),
        lbl = $(r.lbl);
      const active = r.key === state.fuel;
      bar.style.width = (r.lbs / maxLbs) * 100 + '%';
      val.textContent = r.lbs.toFixed(1) + ' lb';
      bar.classList.toggle('bg-flame-500', active);
      bar.classList.toggle('bg-charcoal-500', !active);
      val.classList.toggle('text-charcoal-950', active);
      val.classList.toggle('text-white', !active);
      lbl.classList.toggle('text-white', active);
      lbl.classList.toggle('font-semibold', active);
      lbl.classList.toggle('text-charcoal-400', !active);
    });

    const winner = rows.find((r) => r.lbs === minLbs);
    $('fuelWinner').textContent = winner ? `${winner.name} (${winner.lbs.toFixed(1)} lb)` : '—';
  }

  function renderWhatIf(current) {
    const body = $('whatifBody');
    if (!state.whatif) {
      body.classList.add('hidden');
      return;
    }
    body.classList.remove('hidden');

    let baseData, altData;
    let labelCur = '',
      labelAlt = '';

    const uninsulated = estimate(state, 'single_wall_steel');
    const blanket = estimate(state, 'insulated_blanket');
    const ceramic = estimate(state, 'ceramic_double_wall');

    // Dynamic switching based on active state insulation profile
    if (state.insulation === 'single_wall_steel') {
      baseData = uninsulated;
      altData = blanket;
      labelCur = 'Single-Wall';
      labelAlt = '+ Blanket Upgrade';
      $('whatifTitle').textContent = 'Simulate Adding an Insulation Blanket';
      $('lbsSavedTitle').textContent = 'Potential Fuel Saved';
      $('costSavedTitle').textContent = 'Potential Money Saved';
      $('savingsSubtext').textContent = 'by upgrading pit setup';
    } else if (state.insulation === 'insulated_blanket') {
      baseData = uninsulated;
      altData = blanket;
      labelCur = 'Uninsulated Base';
      labelAlt = 'Your Blanket (Active)';
      $('whatifTitle').textContent = 'Active Thermal Blanket Analysis';
      $('lbsSavedTitle').textContent = 'Current Fuel Saved';
      $('costSavedTitle').textContent = 'Current Money Saved';
      $('savingsSubtext').textContent = 'vs uninsulated steel';
    } else {
      baseData = uninsulated;
      altData = ceramic;
      labelCur = 'Uninsulated Base';
      labelAlt = 'Your Ceramic (Active)';
      $('whatifTitle').textContent = 'Active Ceramic Core Analysis';
      $('lbsSavedTitle').textContent = 'Current Fuel Saved';
      $('costSavedTitle').textContent = 'Current Money Saved';
      $('savingsSubtext').textContent = 'vs uninsulated steel';
    }

    const lbsSaved = Math.max(0, baseData.lbs - altData.lbs);
    const costSaved = Math.max(0, baseData.cost - altData.cost);
    const pctSaved = baseData.lbs > 0 ? (lbsSaved / baseData.lbs) * 100 : 0;

    $('lbsSaved').textContent = lbsSaved.toFixed(1);
    $('pctLbsSaved').textContent = Math.round(pctSaved);
    $('costSaved').textContent = money(costSaved);

    $('lblFuelCur').textContent = labelCur;
    $('lblFuelNew').textContent = labelAlt;
    $('lblCostCur').textContent = labelCur;
    $('lblCostNew').textContent = labelAlt;

    const maxLbs = Math.max(baseData.lbs, altData.lbs, 0.0001);
    $('barFuelCur').style.width = (baseData.lbs / maxLbs) * 100 + '%';
    $('barFuelNew').style.width = (altData.lbs / maxLbs) * 100 + '%';
    $('barFuelCurLbl').textContent = baseData.lbs.toFixed(1) + ' lb';
    $('barFuelNewLbl').textContent = altData.lbs.toFixed(1) + ' lb';

    const maxCost = Math.max(baseData.cost, altData.cost, 0.0001);
    $('barCostCur').style.width = (baseData.cost / maxCost) * 100 + '%';
    $('barCostNew').style.width = (altData.cost / maxCost) * 100 + '%';
    $('barCostCurLbl').textContent = '$' + money(baseData.cost);
    $('barCostNewLbl').textContent = '$' + money(altData.cost);
  }

  const ACTIVE = ['bg-flame-500', 'text-charcoal-950', 'shadow', 'font-semibold'];
  const INACTIVE = ['text-charcoal-400', 'hover:text-charcoal-300'];

  function paintGroup(selector, dataAttr, current) {
    document.querySelectorAll(selector).forEach((btn) => {
      const on = btn.dataset[dataAttr] === current;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      ACTIVE.forEach((c) => btn.classList.toggle(c, on));
      INACTIVE.forEach((c) => btn.classList.toggle(c, !on));
    });
  }

  function setFill(el) {
    const min = parseFloat(el.min),
      max = parseFloat(el.max),
      val = parseFloat(el.value);
    el.style.setProperty('--fill', ((val - min) / (max - min)) * 100 + '%');
  }

  const STORE_KEY = 'pitmaster.fuel';
  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
    updateShareUrl();
  }

  // Shareable-link hydration (validated) — runs after loadState so params win.
  function hydrateFromParams() {
    const p = getParams();
    if (![...p.keys()].length) return;
    if (p.has('f'))
      state.fuel = enumParam(p.get('f'), ['wood_pellets', 'charcoal_briquettes', 'hardwood_splits'], state.fuel);
    if (p.has('d')) state.duration = Math.round(clampNum(p.get('d'), 1, 24, state.duration));
    if (p.has('ins'))
      state.insulation = enumParam(p.get('ins'), ['single_wall_steel', 'insulated_blanket', 'ceramic_double_wall'], state.insulation);
    if (p.has('amb')) state.ambientTemp = Math.round(clampNum(p.get('amb'), 20, 125, state.ambientTemp));
    if (p.has('wd'))
      state.wind = enumParam(p.get('wd'), ['calm_0_5mph', 'breezy_5_15mph', 'high_wind_15mph'], state.wind);
    if (p.has('bc')) state.bagCost = clampNum(p.get('bc'), 0, 1000, state.bagCost);
    if (p.has('bw')) state.bagWeight = clampNum(p.get('bw'), 0.1, 1000, state.bagWeight);
    if (p.has('wi')) state.whatif = boolParam(p.get('wi'), state.whatif);
  }

  function updateShareUrl() {
    writeParams({
      f: state.fuel,
      d: state.duration,
      ins: state.insulation,
      amb: state.ambientTemp,
      wd: state.wind,
      bc: state.bagCost,
      bw: state.bagWeight,
      wi: state.whatif ? 1 : 0,
    });
  }
  // Seed fuel type from the hub "Save My Setup" rig profile (used as a first-visit default).
  function applyGlobalSetup() {
    try {
      const rig = localStorage.getItem('pitmaster_smoker');
      const RIG_TO_FUEL = {
        'Pit Boss Pellet Smoker': 'wood_pellets',
        'Traeger Pellet Smoker': 'wood_pellets',
        'Weber Kettle Charcoal Grill': 'charcoal_briquettes',
        'Custom Offset Smoker': 'hardwood_splits',
      };
      if (rig && RIG_TO_FUEL[rig]) state.fuel = RIG_TO_FUEL[rig];

      // pitmaster_target_temp is intentionally NOT applied here: this tool's only
      // temperature input is Ambient Outdoor Temp (weather), which is a different
      // quantity from the saved pit target temperature (225/250/275). Mapping one
      // to the other would be misleading, so we leave ambient at its own default.

      // pitmaster_wood is intentionally NOT mapped to a fuel type: wood *species*
      // (Apple, Cherry, Oak, Hickory) is ambiguous w.r.t. burn medium — any of them
      // can be pellets, chunks, or splits — so there is no unambiguous fuel mapping.
    } catch (e) {
      /* ignore */
    }
  }
  function loadState() {
    try {
      applyGlobalSetup(); // hub profile seeds defaults; per-page state overrides below
      Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
    } catch (e) {
      /* ignore */
    }
  }

  function syncControls() {
    const duration = $('duration'),
      insulation = $('insulation'),
      ambient = $('ambient'),
      bagCost = $('bagCost'),
      bagWeight = $('bagWeight');
    duration.value = state.duration;
    $('durationVal').textContent = state.duration;
    insulation.value = state.insulation;
    ambient.value = state.ambientTemp;
    $('ambientVal').textContent = state.ambientTemp;
    bagCost.value = state.bagCost;
    bagWeight.value = state.bagWeight;
    paintGroup('.fuel-opt', 'fuel', state.fuel);
    paintGroup('.wind-opt', 'wind', state.wind);
    const sw = $('whatifSwitch'),
      knob = sw.querySelector('.switch-knob');
    sw.setAttribute('aria-checked', state.whatif ? 'true' : 'false');
    sw.classList.toggle('bg-emerald-500', state.whatif);
    sw.classList.toggle('bg-charcoal-700', !state.whatif);
    knob.style.transform = state.whatif ? 'translateX(22px)' : 'translateX(4px)';
    setFill(duration);
    setFill(ambient);
  }

  function init() {
    const duration = $('duration'),
      insulation = $('insulation'),
      ambient = $('ambient'),
      bagCost = $('bagCost'),
      bagWeight = $('bagWeight');

    $('fuelToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.fuel-opt');
      if (!btn) return;
      state.fuel = btn.dataset.fuel;
      paintGroup('.fuel-opt', 'fuel', state.fuel);
      render();
    });

    duration.addEventListener('input', () => {
      state.duration = parseInt(duration.value, 10);
      $('durationVal').textContent = state.duration;
      setFill(duration);
      render();
    });

    insulation.addEventListener('change', (e) => {
      state.insulation = insulation.value;
      PitmasterAnalytics.emit('fuel_rig_selected', { rig: e.target.value });
      render();
    });

    ambient.addEventListener('input', (e) => {
      state.ambientTemp = parseInt(ambient.value, 10);
      $('ambientVal').textContent = state.ambientTemp;
      PitmasterAnalytics.debounceSlider('fuel_ambient_temp_drag', e.target.value);
      setFill(ambient);
      render();
    });

    $('windToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.wind-opt');
      if (!btn) return;
      state.wind = btn.dataset.wind;
      paintGroup('.wind-opt', 'wind', state.wind);
      render();
    });

    const onCost = () => {
      state.bagCost = Math.max(0, parseFloat(bagCost.value) || 0);
      state.bagWeight = Math.max(0.1, parseFloat(bagWeight.value) || 0.1);
      render();
    };
    bagCost.addEventListener('input', onCost);
    bagWeight.addEventListener('input', onCost);

    // Presets wiring
    $('presetPellet').addEventListener('click', () => {
      state.fuel = 'wood_pellets';
      state.bagWeight = 20;
      state.bagCost = 18;
      syncControls();
      render();
    });

    $('presetCharcoal').addEventListener('click', () => {
      state.fuel = 'charcoal_briquettes';
      state.bagWeight = 16;
      state.bagCost = 12;
      syncControls();
      render();
    });

    // What-if dashboard toggle switch
    const sw = $('whatifSwitch'),
      knob = sw.querySelector('.switch-knob');
    sw.addEventListener('click', () => {
      state.whatif = !state.whatif;
      sw.setAttribute('aria-checked', state.whatif ? 'true' : 'false');
      sw.classList.toggle('bg-emerald-500', state.whatif);
      sw.classList.toggle('bg-charcoal-700', !state.whatif);
      knob.style.transform = state.whatif ? 'translateX(22px)' : 'translateX(4px)';
      PitmasterAnalytics.emit('fuel_insulation_toggle', { is_insulated: state.whatif });
      render();
    });

    // Affiliate click telemetry
    document.querySelectorAll('[data-affiliate]').forEach((a) => {
      a.addEventListener('click', () => {
        PitmasterAnalytics.emit('affiliate_click', { destination: a.dataset.affiliate });
      });
    });

    wireCopyButton('shareBtn');

    loadState();
    hydrateFromParams();
    syncControls();
    render();
  }

  init();
  return { state, render };
}
