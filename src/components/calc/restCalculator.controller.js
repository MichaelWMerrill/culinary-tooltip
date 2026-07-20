/*
 * RestCalculator controller — drives the rest & hold cooling model. Reads the
 * chosen protein's finish temp as the default pull temperature, runs
 * restEngine.restCurve, and plots the Newtonian cooling curve with the 140°F
 * safety floor and the serve-time marker.
 */
import { PROTEINS } from '../../utils/proteinRegistry.js';
import { restCurve, HOLD_PROFILES, SAFE_TEMP } from '../../utils/restEngine.js';
import { clampNum, enumParam, getParams, writeParams, wireCopyButton } from '../../utils/shareLink.js';

const PULL_MIN = 120;
const PULL_MAX = 215;
const HOLD_MAX = 12; // hours

export function initRestCalculator() {
  const proteinIds = Object.keys(PROTEINS);
  const holdKeys = Object.keys(HOLD_PROFILES);

  const state = {
    protein: 'beef_brisket',
    pullTemp: PROTEINS.beef_brisket.thermal.finish_temp,
    hold: 'faux_cambro',
    holdHours: 2,
    pullTouched: false,
  };

  const $ = (id) => document.getElementById(id);
  const fmtHrs = (h) => {
    if (!isFinite(h)) return 'Indefinite';
    if (h <= 0) return 'None';
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return (hh ? hh + 'h ' : '') + String(mm).padStart(2, '0') + 'm';
  };
  const setFill = (el) => {
    const min = parseFloat(el.min),
      max = parseFloat(el.max),
      val = parseFloat(el.value);
    el.style.setProperty('--fill', ((val - min) / (max - min)) * 100 + '%');
  };

  /* ---- SVG chart ---- */
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs, text) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  };

  function renderChart(r) {
    const svg = $('chart');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const W = 900,
      H = 440;
    const ml = 52,
      mr = 20,
      mt = 20,
      mb = 44;
    const pw = W - ml - mr,
      ph = H - mt - mb;
    const yMin = 60,
      yMax = 215;
    const xMax = Math.max(...r.pts.map((p) => p.t), 1);
    const xS = (t) => ml + (t / xMax) * pw;
    const yS = (v) => mt + (1 - (v - yMin) / (yMax - yMin)) * ph;

    const defs = el('defs', {});
    const g = el('linearGradient', { id: 'restGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
    g.appendChild(el('stop', { offset: '0%', 'stop-color': '#0ea5e9', 'stop-opacity': '0.30' }));
    g.appendChild(el('stop', { offset: '100%', 'stop-color': '#0ea5e9', 'stop-opacity': '0' }));
    defs.appendChild(g);
    svg.appendChild(defs);

    for (let v = yMin; v <= yMax; v += 20) {
      const y = yS(v);
      svg.appendChild(el('line', { x1: ml, y1: y, x2: W - mr, y2: y, stroke: '#1e293b', 'stroke-width': '1' }));
      svg.appendChild(el('text', { x: ml - 8, y: y + 4, 'text-anchor': 'end', 'font-size': '11', fill: '#64748b', 'font-family': 'ui-monospace, monospace' }, v + '°'));
    }
    const xStep = xMax > 8 ? 2 : 1;
    for (let hh = 0; hh <= xMax; hh += xStep) {
      const x = xS(hh);
      svg.appendChild(el('line', { x1: x, y1: mt, x2: x, y2: mt + ph, stroke: '#141f38', 'stroke-width': '1' }));
      svg.appendChild(el('text', { x, y: H - mb + 20, 'text-anchor': 'middle', 'font-size': '11', fill: '#64748b', 'font-family': 'ui-monospace, monospace' }, hh + 'h'));
    }
    svg.appendChild(el('text', { x: ml + pw / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': '12', fill: '#94a3b8', 'font-weight': '600' }, 'Hours Resting / Holding'));

    // 140°F safety floor
    const ySafe = yS(SAFE_TEMP);
    svg.appendChild(el('rect', { x: ml, y: ySafe, width: pw, height: mt + ph - ySafe, fill: '#ef4444', 'fill-opacity': '0.06' }));
    svg.appendChild(el('line', { x1: ml, y1: ySafe, x2: W - mr, y2: ySafe, stroke: '#ef4444', 'stroke-width': '1.25', 'stroke-dasharray': '5 4', 'stroke-opacity': '0.7' }));
    svg.appendChild(el('text', { x: W - mr - 4, y: ySafe - 6, 'text-anchor': 'end', 'font-size': '10', fill: '#f87171', 'font-weight': '600' }, 'Food-safe floor · 140°F'));

    const coords = r.pts.map((p) => [xS(p.t), yS(Math.min(Math.max(p.temp, yMin), yMax))]);
    let area = `M ${coords[0][0]} ${yS(yMin)} `;
    coords.forEach((c) => (area += `L ${c[0].toFixed(1)} ${c[1].toFixed(1)} `));
    area += `L ${coords[coords.length - 1][0]} ${yS(yMin)} Z`;
    svg.appendChild(el('path', { d: area, fill: 'url(#restGrad)' }));
    let line = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)} `;
    for (let i = 1; i < coords.length; i++) line += `L ${coords[i][0].toFixed(1)} ${coords[i][1].toFixed(1)} `;
    svg.appendChild(el('path', { d: line, fill: 'none', stroke: '#38bdf8', 'stroke-width': '3.25', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

    // serve-time marker
    const sx = xS(Math.min(state.holdHours, xMax));
    const sy = yS(Math.min(Math.max(r.tempAtServe, yMin), yMax));
    svg.appendChild(el('line', { x1: sx, y1: mt, x2: sx, y2: mt + ph, stroke: '#cbd5e1', 'stroke-width': '1', 'stroke-dasharray': '4 3', 'stroke-opacity': '0.55' }));
    svg.appendChild(el('circle', { cx: sx, cy: sy, r: '5', fill: r.safeAtServe ? '#22c55e' : '#ef4444', stroke: '#0f172a', 'stroke-width': '2' }));
  }

  function render() {
    const protein = PROTEINS[state.protein];
    const r = restCurve(state);

    $('safeWindow').textContent = fmtHrs(r.safeHours);
    $('serveTemp').textContent = Math.round(r.tempAtServe);

    const verdict = $('verdict');
    const vIcon = $('verdictIcon');
    const vText = $('verdictText');
    const vSub = $('verdictSub');
    verdict.className = 'rounded-xl p-4 ring-1 flex gap-3 items-start transition-colors';
    if (r.safeAtServe) {
      verdict.classList.add('bg-emerald-500/10', 'ring-emerald-500/40');
      vIcon.textContent = '✅';
      vText.textContent = 'Safe to serve';
      vText.className = 'text-sm font-bold text-emerald-300';
      vSub.textContent = `At ${fmtHrs(state.holdHours)} the ${protein.meta.shortName.toLowerCase()} is ${Math.round(r.tempAtServe)}°F — above the 140°F floor. Safe window ${fmtHrs(r.safeHours)}.`;
    } else {
      verdict.classList.add('bg-ember-500/10', 'ring-ember-500/50');
      vIcon.textContent = '⚠️';
      vText.textContent = 'Below the safety floor';
      vText.className = 'text-sm font-bold text-ember-300';
      vSub.textContent = `At ${fmtHrs(state.holdHours)} it drops to ${Math.round(r.tempAtServe)}°F. Serve within ${fmtHrs(r.safeHours)} or hold warmer.`;
    }
    vSub.className = 'text-[13px] text-slate-300/90 leading-relaxed';

    $('holdDesc').textContent = HOLD_PROFILES[state.hold].name;
    renderChart(r);
    persist();
  }

  /* ---- persistence / share ---- */
  const STORE_KEY = 'pitmaster.rest';
  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
    writeParams({ pr: state.protein, pl: state.pullTemp, ho: state.hold, hh: state.holdHours });
  }
  function loadState() {
    try {
      Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
    } catch (e) {
      /* ignore */
    }
  }
  function hydrateFromParams() {
    const p = getParams();
    if (![...p.keys()].length) return;
    if (p.has('pr')) state.protein = enumParam(p.get('pr'), proteinIds, state.protein);
    if (p.has('pl')) {
      state.pullTemp = Math.round(clampNum(p.get('pl'), PULL_MIN, PULL_MAX, state.pullTemp));
      state.pullTouched = true;
    }
    if (p.has('ho')) state.hold = enumParam(p.get('ho'), holdKeys, state.hold);
    if (p.has('hh')) state.holdHours = clampNum(p.get('hh'), 0, HOLD_MAX, state.holdHours);
  }

  const ACTIVE = ['bg-sky-500', 'text-white', 'shadow'];
  const INACTIVE = ['text-slate-400', 'hover:text-slate-300'];
  function paintHold() {
    document.querySelectorAll('.hold-opt').forEach((btn) => {
      const on = btn.dataset.value === state.hold;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      ACTIVE.forEach((c) => btn.classList.toggle(c, on));
      INACTIVE.forEach((c) => btn.classList.toggle(c, !on));
    });
  }

  function applyProteinPull() {
    state.pullTemp = PROTEINS[state.protein].thermal.finish_temp;
    $('pullTemp').value = state.pullTemp;
    $('pullTempVal').textContent = state.pullTemp;
    setFill($('pullTemp'));
  }

  function syncControls() {
    $('protein').value = state.protein;
    const pull = $('pullTemp');
    pull.value = state.pullTemp;
    $('pullTempVal').textContent = state.pullTemp;
    const hold = $('holdHours');
    hold.value = state.holdHours;
    $('holdHoursVal').textContent = Number(state.holdHours).toFixed(1);
    paintHold();
    setFill(pull);
    setFill(hold);
  }

  function init() {
    const proteinSel = $('protein');
    proteinSel.addEventListener('change', () => {
      state.protein = proteinSel.value;
      if (!state.pullTouched) applyProteinPull();
      render();
    });
    const pull = $('pullTemp');
    pull.addEventListener('input', () => {
      state.pullTemp = parseInt(pull.value, 10);
      state.pullTouched = true;
      $('pullTempVal').textContent = state.pullTemp;
      setFill(pull);
      render();
    });
    $('holdToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.hold-opt');
      if (!btn) return;
      state.hold = btn.dataset.value;
      paintHold();
      render();
    });
    const hold = $('holdHours');
    hold.addEventListener('input', () => {
      state.holdHours = parseFloat(hold.value);
      $('holdHoursVal').textContent = state.holdHours.toFixed(1);
      setFill(hold);
      render();
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
