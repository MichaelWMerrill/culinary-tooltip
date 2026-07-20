/*
 * PartyPlanner controller — the yield engine run backward. Given a guest count,
 * a protein (+ its yield options), and an appetite, it inverts calcYield to
 * recommend the RAW weight to buy and the budget: needed cooked =
 * guests · serving · appetite; raw = needed / yield-fraction; budget = raw ·
 * price. The protein is chosen client-side, so the page renders the union of
 * every yield protein's enum axes and this shows the active set.
 */
import { PROTEINS } from '../../utils/proteinRegistry.js';
import { calcYield } from '../../utils/brisketEngine.js';
import { clampNum, enumParam, getParams, writeParams, wireCopyButton } from '../../utils/shareLink.js';

// Appetite multipliers applied to the protein's standard cooked-lb-per-guest.
const APPETITE = { light: 0.7, standard: 1.0, hearty: 1.35 };
const PRICE_RANGE = { min: 0.75, max: 12 };
// Share-link keys per enum axis (distinct from the price key 'p').
const AXIS_PARAM = { grade: 'g', trim: 't', wrap: 'wr', cut: 'c', preparation: 'pp', brined: 'br' };

export function initPartyPlanner() {
  const yieldProteinIds = Object.values(PROTEINS)
    .filter((p) => p.yield)
    .map((p) => p.meta.id);

  // Seed every possible enum field from each protein's initialState so switching
  // protein always has a valid value for its axes.
  const seed = { guests: 12, appetite: 'standard', priceTouched: false };
  for (const id of yieldProteinIds) Object.assign(seed, PROTEINS[id].yield.initialState);
  const state = { protein: 'beef_brisket', ...seed };
  state.price = market(state.protein);

  const $ = (id) => document.getElementById(id);
  const fmt = (n, d = 1) => Number(n).toFixed(d);
  const money = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function protein() {
    return PROTEINS[state.protein];
  }
  function market(pid) {
    const p = PROTEINS[pid];
    return p.yield.defaults.market_prices[state ? state[p.yield.lossKeys.primary] : p.yield.initialState[p.yield.lossKeys.primary]];
  }
  function enumAxes() {
    return protein().yield.axes.filter((a) => a.type === 'enum');
  }
  function setFill(el) {
    const min = parseFloat(el.min),
      max = parseFloat(el.max),
      val = parseFloat(el.value);
    el.style.setProperty('--fill', ((val - min) / (max - min)) * 100 + '%');
  }

  const ACTIVE = ['bg-ember-500', 'text-white', 'shadow'];
  const INACTIVE = ['text-smoke-400', 'hover:text-smoke-300'];
  function paint(axisId) {
    document.querySelectorAll(`.${axisId}-opt`).forEach((btn) => {
      const on = btn.dataset.value === state[axisId];
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      ACTIVE.forEach((c) => btn.classList.toggle(c, on));
      INACTIVE.forEach((c) => btn.classList.toggle(c, !on));
    });
  }
  function paintAppetite() {
    document.querySelectorAll('.appetite-opt').forEach((btn) => {
      const on = btn.dataset.value === state.appetite;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      ACTIVE.forEach((c) => btn.classList.toggle(c, on));
      INACTIVE.forEach((c) => btn.classList.toggle(c, !on));
    });
  }

  function render() {
    const p = protein();
    const yieldFraction = calcYield(p, { ...state, weight: 1, price: 1 }).totalYield;
    const perGuest = p.serving.lbPerGuestCooked * APPETITE[state.appetite];
    const neededCooked = state.guests * perGuest;
    const rawNeeded = yieldFraction > 0 ? neededCooked / yieldFraction : 0;
    const budget = rawNeeded * state.price;

    $('rawWeight').textContent = fmt(rawNeeded);
    $('cookedWeight').textContent = fmt(neededCooked);
    $('budget').textContent = money(budget);
    $('yieldPct').textContent = Math.round(yieldFraction * 100);
    $('perGuest').textContent = fmt(perGuest, 2);
    $('costPerGuest').textContent = money(state.guests > 0 ? budget / state.guests : 0);
    $('marketHint').textContent = '$' + money(market(state.protein));

    // Enum-axis help copy.
    for (const a of enumAxes()) if (a.copy && $(`${a.id}Desc`)) $(`${a.id}Desc`).innerHTML = p.yield.copy[a.copy][state[a.id]];

    persist();
  }

  /* persistence / share */
  const STORE_KEY = 'pitmaster.party';
  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
    const params = { pr: state.protein, gu: state.guests, ap: state.appetite, p: Number(state.price).toFixed(2) };
    for (const a of enumAxes()) params[AXIS_PARAM[a.id]] = state[a.id];
    writeParams(params);
  }
  function loadState() {
    try {
      Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
    } catch (e) {
      /* ignore */
    }
  }
  function hydrateFromParams() {
    const q = getParams();
    if (![...q.keys()].length) return;
    if (q.has('pr')) state.protein = enumParam(q.get('pr'), yieldProteinIds, state.protein);
    if (q.has('gu')) state.guests = Math.round(clampNum(q.get('gu'), 1, 100, state.guests));
    if (q.has('ap')) state.appetite = enumParam(q.get('ap'), Object.keys(APPETITE), state.appetite);
    if (q.has('p')) {
      state.price = clampNum(q.get('p'), PRICE_RANGE.min, PRICE_RANGE.max, state.price);
      state.priceTouched = true;
    }
    for (const a of enumAxes()) {
      const key = AXIS_PARAM[a.id];
      if (key && q.has(key)) state[a.id] = enumParam(q.get(key), a.options.map((o) => o.value), state[a.id]);
    }
  }

  function showActiveAxes() {
    const active = new Set(enumAxes().map((a) => a.id));
    document.querySelectorAll('[data-yield-axis]').forEach((c) => {
      c.hidden = !active.has(c.dataset.yieldAxis);
    });
  }
  function applyMarketPrice() {
    state.price = market(state.protein);
    $('price').value = state.price;
    $('priceVal').textContent = money(state.price);
    setFill($('price'));
  }
  function syncControls() {
    $('protein').value = state.protein;
    const price = $('price'),
      guests = $('guests');
    price.value = state.price;
    $('priceVal').textContent = money(state.price);
    guests.value = state.guests;
    $('guestVal').textContent = state.guests;
    for (const a of enumAxes()) {
      if (a.control === 'select') $(a.id).value = state[a.id];
      else paint(a.id);
    }
    paintAppetite();
    setFill(price);
    setFill(guests);
  }

  function init() {
    $('protein').addEventListener('change', () => {
      state.protein = $('protein').value;
      showActiveAxes();
      if (!state.priceTouched) applyMarketPrice();
      syncControls();
      render();
    });
    $('price').addEventListener('input', () => {
      state.price = parseFloat($('price').value);
      state.priceTouched = true;
      $('priceVal').textContent = money(state.price);
      setFill($('price'));
      render();
    });
    $('useMarket').addEventListener('click', () => {
      applyMarketPrice();
      state.priceTouched = false;
      render();
    });
    $('guests').addEventListener('input', () => {
      state.guests = parseInt($('guests').value, 10);
      $('guestVal').textContent = state.guests;
      setFill($('guests'));
      render();
    });
    $('appetiteToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.appetite-opt');
      if (!btn) return;
      state.appetite = btn.dataset.value;
      paintAppetite();
      render();
    });
    // Delegated enum-axis clicks (segmented) + selects.
    document.querySelectorAll('[data-yield-axis]').forEach((container) => {
      const axisId = container.dataset.yieldAxis;
      const toggle = container.querySelector('[role="group"]');
      if (toggle) {
        toggle.addEventListener('click', (e) => {
          const btn = e.target.closest(`.${axisId}-opt`);
          if (!btn) return;
          state[axisId] = btn.dataset.value;
          paint(axisId);
          if (axisId === protein().yield.lossKeys.primary && !state.priceTouched) applyMarketPrice();
          render();
        });
      }
      const sel = container.querySelector('select');
      if (sel) {
        sel.addEventListener('change', () => {
          state[axisId] = sel.value;
          if (axisId === protein().yield.lossKeys.primary && !state.priceTouched) applyMarketPrice();
          render();
        });
      }
    });
    wireCopyButton('shareBtn');

    loadState();
    hydrateFromParams();
    showActiveAxes();
    syncControls();
    render();
  }

  init();
  return { state, render };
}
