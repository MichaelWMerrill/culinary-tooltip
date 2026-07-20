/*
 * YieldCalculator controller — protein-generic. All state, wiring, clamps, and
 * enum whitelists come from the protein's `yield` registry block (axes,
 * lossKeys, initialState, defaults, copy) so a new protein needs no controller
 * changes. For beef_brisket the computed numbers are byte-for-byte identical to
 * the legacy inline script (calcYield reproduces calcBrisket exactly).
 */
import { PROTEINS } from '../../utils/proteinRegistry.js';
import { calcYield } from '../../utils/brisketEngine.js';
import { PitmasterAnalytics } from '../../utils/analytics.js';
import { clampNum, enumParam, getParams, writeParams, wireCopyButton } from '../../utils/shareLink.js';

// Stable share-link param keys per axis id (keeps existing brisket links valid).
const PARAM = { weight: 'w', price: 'p', grade: 'g', trim: 't', wrap: 'wr', cut: 'c', guests: 'gu' };
// Canonical cross-tool wrap vocabulary: naked | paper | foil <-> none | paper | foil.
const WRAP_TO_CANON = { naked: 'none', paper: 'paper', foil: 'foil' };
const CANON_TO_WRAP = { none: 'naked', paper: 'paper', foil: 'foil' };

export function initYieldCalculator(protein = PROTEINS.beef_brisket) {
  const y = protein.yield;
  const axes = y.axes;
  const ax = Object.fromEntries(axes.map((a) => [a.id, a]));
  const primaryKey = y.lossKeys.primary; // enum axis that indexes market price
  const market = y.defaults.market_prices;
  const copy = y.copy;
  const threshold = protein.serving.lbPerGuestCooked;
  const wR = ax.weight.range;
  const sliderAxes = axes.filter((a) => a.type === 'slider');
  const enumAxes = axes.filter((a) => a.type === 'enum');
  const segAxes = enumAxes.filter((a) => a.control === 'segmented');
  const selectAxes = enumAxes.filter((a) => a.control === 'select');
  const priceAxis = axes.find((a) => a.control === 'price-market');

  const state = { ...y.initialState, priceTouched: false };

  const $ = (id) => document.getElementById(id);
  const fmt = (n, d = 1) => Number(n).toFixed(d);
  const money = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtSlider = (a, v) => (a.control === 'price-market' ? money(v) : fmt(v));

  function setRangeFill(el) {
    const min = parseFloat(el.min),
      max = parseFloat(el.max),
      val = parseFloat(el.value);
    el.style.setProperty('--fill', ((val - min) / (max - min)) * 100 + '%');
  }

  /* Render */
  function render() {
    const r = calcYield(protein, state);

    $('trueCost').textContent = money(r.trueCost);
    $('rawCost').textContent = '$' + money(r.rawCost);
    $('markup').textContent = '+' + Math.round(r.markup * 100) + '%';

    const yp = Math.round(r.totalYield * 100);
    $('yieldPct').textContent = yp;
    const bar = $('yieldBar');
    bar.style.width = Math.max(0, Math.min(100, r.totalYield * 100)) + '%';
    bar.parentElement.setAttribute('aria-valuenow', yp);

    $('trimmedWt').textContent = fmt(r.trimmedWt);
    $('trimWt').textContent = fmt(r.trimWt);
    $('cookLoss').textContent = fmt(r.cookLoss);
    $('cookedWt').textContent = fmt(r.cookedWt);

    // Segmented-axis help copy (HTML-entity strings).
    for (const a of segAxes) {
      if (a.copy && $(`${a.id}Desc`)) $(`${a.id}Desc`).innerHTML = copy[a.copy][state[a.id]];
    }

    if ($('marketHint')) $('marketHint').textContent = '$' + money(market[state[primaryKey]]);

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
    const needed = state.guests * threshold;
    $('guestVal').textContent = state.guests;
    $('needed').textContent = fmt(needed);
    $('haveCooked').textContent = fmt(r.cookedWt);

    const box = $('servingVerdict');
    const icon = $('verdictIcon');
    const text = $('verdictText');
    const sub = $('verdictSub');
    const diff = r.cookedWt - needed;

    box.className = 'rounded-xl p-5 text-center ring-1 transition-colors';

    if (diff >= 0) {
      box.classList.add('bg-emerald-500/10', 'ring-emerald-500/40');
      icon.textContent = '✅';
      text.textContent = "You're covered";
      text.className = 'mt-1.5 text-lg font-bold text-emerald-400';
      const extra = Math.floor(diff / threshold);
      sub.textContent = `+${fmt(diff)} lb spare (~${extra} extra plate${extra === 1 ? '' : 's'})`;
      sub.className = 'text-xs mt-0.5 text-emerald-300/70';
    } else {
      box.classList.add('bg-ember-500/10', 'ring-ember-500/50');
      icon.textContent = '⚠️';
      text.textContent = 'Come up short';
      text.className = 'mt-1.5 text-lg font-bold text-ember-400';
      const shortGuests = Math.ceil(-diff / threshold);
      sub.textContent = `${fmt(-diff)} lb short (~${shortGuests} guest${shortGuests === 1 ? '' : 's'} without)`;
      sub.className = 'text-xs mt-0.5 text-ember-300/80';
    }
  }

  /* Segmented control styling */
  const ACTIVE = ['bg-ember-500', 'text-white', 'shadow'];
  const INACTIVE = ['text-smoke-400', 'hover:text-smoke-300'];

  function paintGroup(axisId, current) {
    document.querySelectorAll(`.${axisId}-opt`).forEach((btn) => {
      const on = btn.dataset.value === current;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      ACTIVE.forEach((c) => btn.classList.toggle(c, on));
      INACTIVE.forEach((c) => btn.classList.toggle(c, !on));
    });
  }

  /* Persistence — per-protein state + shared cross-tool cook profile */
  const STORE_KEY = `pitmaster.${protein.meta.slug}`;
  const SHARED_KEY = 'pitmaster.cook';
  const wrapAxis = ax.wrap;

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      const shared = JSON.parse(localStorage.getItem(SHARED_KEY) || '{}');
      shared.weight = state.weight;
      if (wrapAxis && WRAP_TO_CANON[state.wrap]) shared.wrap = WRAP_TO_CANON[state.wrap];
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
      if (wrapAxis && shared.wrap && CANON_TO_WRAP[shared.wrap]) state.wrap = CANON_TO_WRAP[shared.wrap];
    } catch (e) {
      /* ignore */
    }
  }

  // Shareable-link hydration — runs after loadState so URL params win. Every
  // value is validated (clamped / whitelisted) off the axis descriptors.
  function hydrateFromParams() {
    const p = getParams();
    if (![...p.keys()].length) return;
    for (const a of sliderAxes) {
      const key = PARAM[a.id];
      if (p.has(key)) {
        state[a.id] = clampNum(p.get(key), a.range.min, a.range.max, state[a.id]);
        if (a.control === 'price-market') state.priceTouched = true;
      }
    }
    for (const a of enumAxes) {
      const key = PARAM[a.id];
      if (p.has(key)) state[a.id] = enumParam(p.get(key), a.options.map((o) => o.value), state[a.id]);
    }
    if (p.has(PARAM.guests)) state.guests = Math.round(clampNum(p.get(PARAM.guests), 1, 60, state.guests));
  }

  function updateShareUrl() {
    const params = { pr: protein.meta.id };
    for (const a of axes) {
      params[PARAM[a.id]] = a.control === 'price-market' ? Number(state[a.id]).toFixed(2) : state[a.id];
    }
    params[PARAM.guests] = state.guests;
    writeParams(params);
  }

  function syncControls() {
    for (const a of sliderAxes) {
      const el = $(a.id);
      el.value = state[a.id];
      $(`${a.id}Val`).textContent = fmtSlider(a, state[a.id]);
      setRangeFill(el);
    }
    for (const a of selectAxes) $(a.id).value = state[a.id];
    for (const a of segAxes) paintGroup(a.id, state[a.id]);
    const guests = $('guests');
    guests.value = state.guests;
    setRangeFill(guests);
  }

  function applyMarketPrice() {
    if (!priceAxis) return;
    const mp = market[state[primaryKey]];
    state.price = mp;
    const el = $(priceAxis.id);
    el.value = mp;
    $(`${priceAxis.id}Val`).textContent = money(mp);
    setRangeFill(el);
    render();
  }

  /* Wiring */
  function init() {
    // Sliders (weight, price)
    for (const a of sliderAxes) {
      const el = $(a.id);
      el.addEventListener('input', () => {
        state[a.id] = parseFloat(el.value);
        $(`${a.id}Val`).textContent = fmtSlider(a, state[a.id]);
        setRangeFill(el);
        if (a.control === 'price-market') state.priceTouched = true;
        if (a.id === 'weight') PitmasterAnalytics.debounceSlider(`${protein.meta.id}_weight_drag`, el.value);
        render();
      });
    }

    // "use market avg" button
    if ($('useMarket')) {
      $('useMarket').addEventListener('click', () => {
        applyMarketPrice();
        state.priceTouched = false;
      });
    }

    // Enum selects (e.g. grade)
    for (const a of selectAxes) {
      const el = $(a.id);
      el.addEventListener('change', () => {
        state[a.id] = el.value;
        PitmasterAnalytics.emit(`${protein.meta.id}_${a.id}_selected`, { [a.id]: el.value });
        if (a.id === primaryKey && !state.priceTouched) applyMarketPrice();
        render();
      });
    }

    // Segmented enums (trim / cut / wrap)
    for (const a of segAxes) {
      $(`${a.id}Toggle`).addEventListener('click', (e) => {
        const btn = e.target.closest(`.${a.id}-opt`);
        if (!btn) return;
        state[a.id] = btn.dataset.value;
        paintGroup(a.id, state[a.id]);
        if (a.id === primaryKey && !state.priceTouched) applyMarketPrice();
        render();
      });
    }

    // Guests slider (serving estimator)
    const guests = $('guests');
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
    document.querySelectorAll('[data-affiliate]').forEach((anchor) => {
      anchor.addEventListener('click', () => {
        PitmasterAnalytics.emit('affiliate_click', { destination: anchor.dataset.affiliate });
      });
    });

    wireCopyButton('shareBtn');

    // Restore persisted state, apply any shared-link params (params win), paint.
    loadState();
    hydrateFromParams();
    syncControls();
    render();
  }

  init();
  return { state, render };
}
