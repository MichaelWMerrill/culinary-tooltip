/*
 * YieldCalculator controller — the client logic extracted verbatim from the
 * former inline script in brisket-calculator.astro, with one change: every
 * range clamp and enum whitelist is now derived from the protein registry's
 * `yield.axes` (keyed by axis id) instead of hard-coded literals, so the input
 * UI and the engine cannot drift. Exported as init() and invoked on
 * DOMContentLoaded by the component's <script>.
 */
import { PROTEINS } from '../../utils/proteinRegistry.js';
import { DATA, THRESHOLD_PER_GUEST, TRIM_COPY, WRAP_COPY, calcBrisket } from '../../utils/brisketEngine.js';
import { PitmasterAnalytics } from '../../utils/analytics.js';
import { clampNum, enumParam, getParams, writeParams, wireCopyButton } from '../../utils/shareLink.js';

export function initYieldCalculator(protein = PROTEINS.beef_brisket) {
  // Axis descriptors drive the wiring: ids, slider ranges, enum whitelists.
  const ax = Object.fromEntries(protein.yield.axes.map((a) => [a.id, a]));
  const wR = ax.weight.range;
  const pR = ax.price.range;
  const gradeVals = ax.grade.options.map((o) => o.value);
  const trimVals = ax.trim.options.map((o) => o.value);
  const wrapVals = ax.wrap.options.map((o) => o.value);

  /* State */
  const state = {
    weight: 14,
    price: 4.29,
    grade: 'CHOICE',
    trim: 'commercial',
    wrap: 'paper',
    guests: 12,
    priceTouched: false,
  };

  /* Helpers */
  const $ = (id) => document.getElementById(id);
  const fmt = (n, d = 1) => Number(n).toFixed(d);
  const money = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function setRangeFill(el) {
    const min = parseFloat(el.min),
      max = parseFloat(el.max),
      val = parseFloat(el.value);
    const pct = ((val - min) / (max - min)) * 100;
    el.style.setProperty('--fill', pct + '%');
  }

  /* Render */
  function render() {
    const r = calcBrisket(state);

    // Hero
    $('trueCost').textContent = money(r.trueCost);
    $('rawCost').textContent = '$' + money(r.rawCost);
    $('markup').textContent = '+' + Math.round(r.markup * 100) + '%';

    // Yield
    const yp = Math.round(r.totalYield * 100);
    $('yieldPct').textContent = yp;
    const bar = $('yieldBar');
    bar.style.width = Math.max(0, Math.min(100, r.totalYield * 100)) + '%';
    bar.parentElement.setAttribute('aria-valuenow', yp);

    // Weight cards
    $('trimmedWt').textContent = fmt(r.trimmedWt);
    $('trimWt').textContent = fmt(r.trimWt);
    $('cookLoss').textContent = fmt(r.cookLoss);
    $('cookedWt').textContent = fmt(r.cookedWt);

    // Descriptions
    $('trimDesc').innerHTML = TRIM_COPY[state.trim];
    $('wrapDesc').innerHTML = WRAP_COPY[state.wrap];

    // Market hint
    $('marketHint').textContent = '$' + money(DATA.defaults.market_prices[state.grade]);

    renderHoldingAdvice(r);
    renderServing(r);
    persist();
  }

  // Holding & resting guidance — small finished mass loses heat fast.
  function renderHoldingAdvice(r) {
    const box = $('holdingAdvice');
    const icon = $('holdingIcon');
    const text = $('holdingText');
    box.className = 'rounded-xl p-4 text-sm leading-relaxed ring-1 flex gap-3 transition-colors';

    if (r.cookedWt < 8) {
      box.classList.add('bg-ember-500/10', 'ring-ember-500/40');
      icon.textContent = '⚠️';
      text.className = 'flex-1 text-ember-200';
      text.textContent =
        'Small finished mass cools rapidly. To maintain food-safe holding temperatures above 140°F, execute an insulated faux-cambro hold (wrap in foil and towels inside a pre-warmed cooler) for a minimum of 2 hours.';
    } else {
      box.classList.add('bg-smoke-800/60', 'ring-smoke-700');
      icon.textContent = '🌡️';
      text.className = 'flex-1 text-smoke-300';
      text.textContent =
        'Substantial finished mass retains heat well. Rest loosely tented for at least 1 hour before slicing; a foil-and-towel cooler hold will keep it safely above 140°F for several hours if you need to stretch the timeline.';
    }
  }

  function renderServing(r) {
    const needed = state.guests * THRESHOLD_PER_GUEST;
    $('guestVal').textContent = state.guests;
    $('needed').textContent = fmt(needed);
    $('haveCooked').textContent = fmt(r.cookedWt);

    const box = $('servingVerdict');
    const icon = $('verdictIcon');
    const text = $('verdictText');
    const sub = $('verdictSub');
    const diff = r.cookedWt - needed;

    // reset classes
    box.className = 'rounded-xl p-5 text-center ring-1 transition-colors';

    if (diff >= 0) {
      box.classList.add('bg-emerald-500/10', 'ring-emerald-500/40');
      icon.textContent = '✅';
      text.textContent = "You're covered";
      text.className = 'mt-1.5 text-lg font-bold text-emerald-400';
      const extra = Math.floor(diff / THRESHOLD_PER_GUEST);
      sub.textContent = `+${fmt(diff)} lb spare (~${extra} extra plate${extra === 1 ? '' : 's'})`;
      sub.className = 'text-xs mt-0.5 text-emerald-300/70';
    } else {
      box.classList.add('bg-ember-500/10', 'ring-ember-500/50');
      icon.textContent = '⚠️';
      text.textContent = 'Come up short';
      text.className = 'mt-1.5 text-lg font-bold text-ember-400';
      const shortGuests = Math.ceil(-diff / THRESHOLD_PER_GUEST);
      sub.textContent = `${fmt(-diff)} lb short (~${shortGuests} guest${shortGuests === 1 ? '' : 's'} without)`;
      sub.className = 'text-xs mt-0.5 text-ember-300/80';
    }
  }

  /* Segmented control styling */
  const ACTIVE = ['bg-ember-500', 'text-white', 'shadow'];
  const INACTIVE = ['text-smoke-400', 'hover:text-smoke-300'];

  function paintGroup(selector, dataAttr, current) {
    document.querySelectorAll(selector).forEach((btn) => {
      const on = btn.dataset[dataAttr] === current;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      ACTIVE.forEach((c) => btn.classList.toggle(c, on));
      INACTIVE.forEach((c) => btn.classList.toggle(c, !on));
    });
  }

  /* Persistence — per-page state + shared cross-tool cook profile */
  const STORE_KEY = 'pitmaster.brisket';
  const SHARED_KEY = 'pitmaster.cook';
  // Shared wrap vocabulary across tools: none | paper | foil
  const WRAP_TO_CANON = { naked: 'none', paper: 'paper', foil: 'foil' };
  const CANON_TO_WRAP = { none: 'naked', paper: 'paper', foil: 'foil' };

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      const shared = JSON.parse(localStorage.getItem(SHARED_KEY) || '{}');
      shared.weight = state.weight;
      shared.wrap = WRAP_TO_CANON[state.wrap];
      localStorage.setItem(SHARED_KEY, JSON.stringify(shared));
    } catch (e) {
      /* storage unavailable — ignore */
    }
    updateShareUrl();
  }

  function loadState() {
    try {
      Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
      const shared = JSON.parse(localStorage.getItem(SHARED_KEY) || '{}');
      if (typeof shared.weight === 'number') state.weight = Math.min(wR.max, Math.max(wR.min, shared.weight));
      if (shared.wrap && CANON_TO_WRAP[shared.wrap]) state.wrap = CANON_TO_WRAP[shared.wrap];
    } catch (e) {
      /* ignore */
    }
  }

  // Shareable-link hydration. Runs after loadState so URL params win over
  // localStorage. Every value is validated (clamped / whitelisted).
  function hydrateFromParams() {
    const p = getParams();
    if (![...p.keys()].length) return;
    if (p.has('w')) state.weight = clampNum(p.get('w'), wR.min, wR.max, state.weight);
    if (p.has('p')) {
      state.price = clampNum(p.get('p'), pR.min, pR.max, state.price);
      state.priceTouched = true; // an explicit shared price should stick
    }
    if (p.has('g')) state.grade = enumParam(p.get('g'), gradeVals, state.grade);
    if (p.has('t')) state.trim = enumParam(p.get('t'), trimVals, state.trim);
    if (p.has('wr')) state.wrap = enumParam(p.get('wr'), wrapVals, state.wrap);
    if (p.has('gu')) state.guests = Math.round(clampNum(p.get('gu'), 1, 60, state.guests));
  }

  // Keep the URL in sync so it's always shareable.
  function updateShareUrl() {
    writeParams({
      w: state.weight,
      p: Number(state.price).toFixed(2),
      g: state.grade,
      t: state.trim,
      wr: state.wrap,
      gu: state.guests,
    });
  }

  function syncControls() {
    const weight = $('weight'),
      price = $('price'),
      grade = $('grade'),
      guests = $('guests');
    weight.value = state.weight;
    $('weightVal').textContent = fmt(state.weight);
    price.value = state.price;
    $('priceVal').textContent = money(state.price);
    grade.value = state.grade;
    guests.value = state.guests;
    paintGroup('.trim-opt', 'trim', state.trim);
    paintGroup('.wrap-opt', 'wrap', state.wrap);
    setRangeFill(weight);
    setRangeFill(price);
    setRangeFill(guests);
  }

  /* Wiring */
  function init() {
    const weight = $('weight'),
      price = $('price'),
      grade = $('grade'),
      guests = $('guests');

    // Weight slider
    weight.addEventListener('input', () => {
      state.weight = parseFloat(weight.value);
      $('weightVal').textContent = fmt(state.weight);
      setRangeFill(weight);
      PitmasterAnalytics.debounceSlider('brisket_weight_drag', weight.value);
      render();
    });

    // Price slider
    price.addEventListener('input', () => {
      state.price = parseFloat(price.value);
      state.priceTouched = true;
      $('priceVal').textContent = money(state.price);
      setRangeFill(price);
      render();
    });

    // "use market avg" button
    $('useMarket').addEventListener('click', () => {
      applyMarketPrice();
      state.priceTouched = false;
    });

    // Grade dropdown
    grade.addEventListener('change', (e) => {
      state.grade = grade.value;
      PitmasterAnalytics.emit('brisket_grade_selected', { grade: e.target.value });
      // Auto-sync price to grade's market average until user overrides
      if (!state.priceTouched) applyMarketPrice();
      render();
    });

    // Trim toggle
    $('trimToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.trim-opt');
      if (!btn) return;
      state.trim = btn.dataset.trim;
      paintGroup('.trim-opt', 'trim', state.trim);
      render();
    });

    // Wrap toggle
    $('wrapToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.wrap-opt');
      if (!btn) return;
      state.wrap = btn.dataset.wrap;
      paintGroup('.wrap-opt', 'wrap', state.wrap);
      render();
    });

    // Guests slider
    guests.addEventListener('input', () => {
      state.guests = parseInt(guests.value, 10);
      setRangeFill(guests);
      render();
    });

    // Serving estimator accordion
    const header = $('servingHeader');
    header.addEventListener('click', () => {
      const body = $('servingBody');
      const open = body.classList.toggle('hidden');
      header.setAttribute('aria-expanded', open ? 'false' : 'true');
      $('servingChevron').style.transform = open ? '' : 'rotate(180deg)';
    });

    // Affiliate click telemetry
    document.querySelectorAll('[data-affiliate]').forEach((a) => {
      a.addEventListener('click', () => {
        PitmasterAnalytics.emit('affiliate_click', { destination: a.dataset.affiliate });
      });
    });

    // Copy-share-link button
    wireCopyButton('shareBtn');

    // Restore persisted state, apply any shared-link params (params win), paint
    loadState();
    hydrateFromParams();
    syncControls();
    render();
  }

  function applyMarketPrice() {
    const mp = DATA.defaults.market_prices[state.grade];
    state.price = mp;
    const price = $('price');
    price.value = mp;
    $('priceVal').textContent = money(mp);
    setRangeFill(price);
    render();
  }

  init();
  return { state, render };
}
