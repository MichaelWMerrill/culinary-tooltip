/*
 * StallPredictor controller — protein-generic. The protein-specific inputs come
 * from `thermal.axes` (weight, or ribs cut+racks, or turkey preparation+weight)
 * and are rendered/wired generically off axis ids. Pit / wrap / climate are
 * equipment/environment and stay component-local. No-stall proteins (poultry)
 * hide the wrap/climate controls and show a steady-climb summary. For
 * beef_brisket the behavior is identical to the prior version.
 */
import { PROTEINS } from '../../utils/proteinRegistry.js';
import { DATA, START_TEMP, FINISH_TEMP, WRAP_COPY, CLIMATE_COPY, computeModel, buildPath } from '../../utils/stallEngine.js';
import { PitmasterAnalytics } from '../../utils/analytics.js';
import { clampNum, enumParam, getParams, writeParams, wireCopyButton } from '../../utils/shareLink.js';

// Share-link param keys per axis id (existing brisket keys unchanged).
const PARAM = { weight: 'w', racks: 'rk', cut: 'ct', preparation: 'pp' };

export function initStallPredictor(protein = PROTEINS.beef_brisket) {
  const thermal = protein.thermal;
  const stalls = thermal.stalls !== false;
  const finishTemp = thermal.finish_temp;
  const pitTemps = Object.keys(thermal.cook_temperatures); // registry-driven, per-protein
  const tAxes = thermal.axes;
  const tCopy = thermal.copy || {};
  const tSliders = tAxes.filter((a) => a.type === 'slider');
  const tSegs = tAxes.filter((a) => a.type === 'enum' && a.control === 'segmented');
  const tSelects = tAxes.filter((a) => a.type === 'enum' && a.control === 'select');

  /* State: protein thermal inputs + equipment defaults. */
  const state = {
    ...(thermal.initialState ?? { weight: 12 }),
    pitTemp: '225',
    pit: 'offset_smoker',
    wrap: stalls ? 'peach_butcher_paper' : 'none',
    wrapTemp: 160,
    climate: 'moderate',
  };

  const $ = (id) => document.getElementById(id);

  /* Formatting */
  function fmtHrs(h) {
    if (!isFinite(h) || h <= 0) return '0h 00m';
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    if (mins === 60) return hours + 1 + 'h 00m';
    return hours + 'h ' + String(mins).padStart(2, '0') + 'm';
  }
  function fmtHrsShort(h) {
    if (!isFinite(h) || h <= 0) return '0.0 h';
    return h.toFixed(1) + ' h';
  }
  // Confidence band around the point estimate — honest imprecision without
  // losing the underlying number (which stays in the share link via the input
  // params). Real spread across cut variation, probe placement, pit behavior,
  // and ambient conditions is wide, and it is wrap-dependent: foil crushes the
  // stall and is the most predictable; an unwrapped cook spreads the widest.
  function bandFraction(wrap) {
    if (wrap === 'aluminum_foil') return 0.15;
    if (wrap === 'peach_butcher_paper') return 0.2;
    return 0.25; // no wrap, or proteins without a wrap variable (e.g. turkey)
  }
  function fmtHrsRange(h, frac) {
    if (!isFinite(h) || h <= 0) return fmtHrs(h);
    return fmtHrs(h * (1 - frac)) + '–' + fmtHrs(h * (1 + frac));
  }

  /* SVG chart rendering */
  const NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, text) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  let chartSamples = [];
  let chartPlot = null;

  function renderChart(m, pts) {
    const svg = $('chart');
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const W = 900,
      H = 470;
    const ml = 58,
      mr = 24,
      mt = 20,
      mb = 48;
    const pw = W - ml - mr,
      ph = H - mt - mb;

    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent', 'pointer-events': 'all' }));

    const yMin = 40,
      yMax = 210;
    const xMax = Math.max(2, Math.ceil(m.totalTime));

    const xScale = (t) => ml + (t / xMax) * pw;
    const yScale = (v) => mt + (1 - (v - yMin) / (yMax - yMin)) * ph;

    const defs = el('defs', {});
    const lg = el('linearGradient', { id: 'lineGrad', x1: '0', y1: '0', x2: '1', y2: '0' });
    lg.appendChild(el('stop', { offset: '0%', 'stop-color': '#f59e0b' }));
    lg.appendChild(el('stop', { offset: '60%', 'stop-color': '#f97316' }));
    lg.appendChild(el('stop', { offset: '100%', 'stop-color': '#fb923c' }));
    defs.appendChild(lg);
    const ag = el('linearGradient', { id: 'areaGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
    ag.appendChild(el('stop', { offset: '0%', 'stop-color': '#f97316', 'stop-opacity': '0.28' }));
    ag.appendChild(el('stop', { offset: '100%', 'stop-color': '#f97316', 'stop-opacity': '0' }));
    defs.appendChild(ag);
    svg.appendChild(defs);

    for (let v = yMin; v <= yMax; v += 20) {
      const y = yScale(v);
      svg.appendChild(el('line', { x1: ml, y1: y, x2: W - mr, y2: y, stroke: '#1e293b', 'stroke-width': '1' }));
      svg.appendChild(el('text', { x: ml - 10, y: y + 4, 'text-anchor': 'end', 'font-size': '11', fill: '#64748b', 'font-family': 'ui-monospace, monospace' }, v + '°'));
    }
    const xStep = xMax > 12 ? 2 : 1;
    for (let hh = 0; hh <= xMax; hh += xStep) {
      const x = xScale(hh);
      svg.appendChild(el('line', { x1: x, y1: mt, x2: x, y2: mt + ph, stroke: '#141f38', 'stroke-width': '1' }));
      svg.appendChild(el('text', { x: x, y: H - mb + 20, 'text-anchor': 'middle', 'font-size': '11', fill: '#64748b', 'font-family': 'ui-monospace, monospace' }, hh + 'h'));
    }

    svg.appendChild(el('text', { x: ml + pw / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': '12', fill: '#94a3b8', 'font-weight': '600' }, 'Hours of Cook Time'));
    const yTitle = el('text', { x: 16, y: mt + ph / 2, 'text-anchor': 'middle', 'font-size': '12', fill: '#94a3b8', 'font-weight': '600', transform: `rotate(-90 16 ${mt + ph / 2})` }, 'Internal Meat Temp (°F)');
    svg.appendChild(yTitle);

    if (m.stallDuration > 0.04) {
      const x0 = xScale(m.t1),
        x1 = xScale(m.t1 + m.stallDuration);
      svg.appendChild(el('rect', { x: x0, y: mt, width: Math.max(1, x1 - x0), height: ph, fill: '#fbbf24', 'fill-opacity': '0.10' }));
      svg.appendChild(el('line', { x1: x0, y1: mt, x2: x0, y2: mt + ph, stroke: '#fbbf24', 'stroke-width': '1', 'stroke-dasharray': '3 3', 'stroke-opacity': '0.5' }));
      svg.appendChild(el('line', { x1: x1, y1: mt, x2: x1, y2: mt + ph, stroke: '#fbbf24', 'stroke-width': '1', 'stroke-dasharray': '3 3', 'stroke-opacity': '0.5' }));
      if (x1 - x0 > 44) {
        svg.appendChild(el('text', { x: (x0 + x1) / 2, y: mt + 14, 'text-anchor': 'middle', 'font-size': '10', fill: '#fcd34d', 'font-weight': '700', 'letter-spacing': '1' }, 'THE STALL'));
      }
    }

    const yFin = yScale(finishTemp);
    svg.appendChild(el('line', { x1: ml, y1: yFin, x2: W - mr, y2: yFin, stroke: '#22c55e', 'stroke-width': '1.25', 'stroke-dasharray': '5 4', 'stroke-opacity': '0.65' }));
    svg.appendChild(el('text', { x: W - mr - 4, y: yFin - 6, 'text-anchor': 'end', 'font-size': '10', fill: '#4ade80', 'font-weight': '600' }, 'Done · ' + finishTemp + '°F'));

    if (state.wrap !== 'none') {
      const yW = yScale(state.wrapTemp);
      svg.appendChild(el('line', { x1: ml, y1: yW, x2: W - mr, y2: yW, stroke: '#38bdf8', 'stroke-width': '1', 'stroke-dasharray': '2 4', 'stroke-opacity': '0.5' }));
      svg.appendChild(el('text', { x: ml + 4, y: yW - 5, 'text-anchor': 'start', 'font-size': '10', fill: '#7dd3fc', 'font-weight': '600' }, 'Wrap · ' + state.wrapTemp + '°F'));
    }

    const coords = pts.map((p) => [xScale(Math.min(p.t, xMax)), yScale(Math.min(Math.max(p.temp, yMin), yMax))]);

    let areaD = `M ${coords[0][0]} ${yScale(yMin)} `;
    coords.forEach((c) => {
      areaD += `L ${c[0].toFixed(1)} ${c[1].toFixed(1)} `;
    });
    areaD += `L ${coords[coords.length - 1][0]} ${yScale(yMin)} Z`;
    svg.appendChild(el('path', { d: areaD, fill: 'url(#areaGrad)' }));

    let lineD = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)} `;
    for (let i = 1; i < coords.length; i++) lineD += `L ${coords[i][0].toFixed(1)} ${coords[i][1].toFixed(1)} `;
    svg.appendChild(el('path', { d: lineD, fill: 'none', stroke: 'url(#lineGrad)', 'stroke-width': '3.25', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

    const start = coords[0];
    const finish = coords[coords.length - 1];
    const stallEntry = [xScale(m.t1), yScale(m.stallStart)];
    svg.appendChild(el('circle', { cx: start[0], cy: start[1], r: '4', fill: '#0f172a', stroke: '#f59e0b', 'stroke-width': '2' }));
    if (stalls) svg.appendChild(el('circle', { cx: stallEntry[0], cy: stallEntry[1], r: '4', fill: '#0f172a', stroke: '#fbbf24', 'stroke-width': '2' }));
    svg.appendChild(el('circle', { cx: finish[0], cy: finish[1], r: '5', fill: '#22c55e', stroke: '#0f172a', 'stroke-width': '2' }));

    chartSamples = pts.map((p, i) => ({ x: coords[i][0], y: coords[i][1], t: p.t, temp: p.temp }));
    chartPlot = { left: ml, right: W - mr, top: mt, bottom: mt + ph };

    svg.appendChild(el('line', { id: 'hoverLine', x1: 0, y1: mt, x2: 0, y2: mt + ph, stroke: '#cbd5e1', 'stroke-width': '1', 'stroke-dasharray': '4 3', opacity: '0', 'pointer-events': 'none' }));
    svg.appendChild(el('circle', { id: 'hoverDot', r: '4.5', fill: '#fb923c', stroke: '#0f172a', 'stroke-width': '2', opacity: '0', 'pointer-events': 'none' }));
    const tip = el('g', { id: 'hoverTip', opacity: '0', 'pointer-events': 'none' });
    tip.appendChild(el('rect', { x: '0', y: '0', width: '118', height: '24', rx: '5', fill: '#0b1120', stroke: '#334155', 'stroke-width': '1' }));
    tip.appendChild(el('text', { id: 'hoverTipText', x: '59', y: '16', 'text-anchor': 'middle', 'font-size': '11', fill: '#e2e8f0', 'font-family': 'ui-monospace, monospace', 'font-weight': '600' }, ''));
    svg.appendChild(tip);
  }

  function onChartHover(evt) {
    if (!chartSamples.length || !chartPlot) return;
    const svg = $('chart');
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    const sx = (evt.clientX - rect.left) * (900 / rect.width);
    if (sx < chartPlot.left - 6 || sx > chartPlot.right + 6) {
      hideChartHover();
      return;
    }
    let best = chartSamples[0],
      bd = Infinity;
    for (const s of chartSamples) {
      const d = Math.abs(s.x - sx);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    const line = $('hoverLine'),
      dot = $('hoverDot'),
      tip = $('hoverTip'),
      txt = $('hoverTipText');
    if (!line) return;
    line.setAttribute('x1', best.x);
    line.setAttribute('x2', best.x);
    line.setAttribute('opacity', '1');
    dot.setAttribute('cx', best.x);
    dot.setAttribute('cy', best.y);
    dot.setAttribute('opacity', '1');
    txt.textContent = fmtHrs(best.t) + ' · ' + Math.round(best.temp) + '°F';
    let tx = Math.max(chartPlot.left, Math.min(best.x - 59, chartPlot.right - 118));
    let ty = best.y - 34;
    if (ty < chartPlot.top) ty = best.y + 12;
    tip.setAttribute('transform', `translate(${tx} ${ty})`);
    tip.setAttribute('opacity', '1');
  }

  function hideChartHover() {
    ['hoverLine', 'hoverDot', 'hoverTip'].forEach((id) => {
      const e = $(id);
      if (e) e.setAttribute('opacity', '0');
    });
  }

  /* Segmented control painters. Equipment groups key off their own data-attr;
     protein thermal groups key off data-value (generic). */
  const ACTIVE = ['bg-flame-500', 'text-white', 'shadow'];
  const INACTIVE = ['text-slate-400', 'hover:text-slate-300'];
  function paintEquip(selector, dataAttr, current) {
    document.querySelectorAll(selector).forEach((btn) => {
      const on = btn.dataset[dataAttr] === current;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      ACTIVE.forEach((c) => btn.classList.toggle(c, on));
      INACTIVE.forEach((c) => btn.classList.toggle(c, !on));
    });
  }
  function paintThermal(axisId, current) {
    document.querySelectorAll(`.${axisId}-opt`).forEach((btn) => {
      const on = btn.dataset.value === current;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      ACTIVE.forEach((c) => btn.classList.toggle(c, on));
      INACTIVE.forEach((c) => btn.classList.toggle(c, !on));
    });
  }

  /* Render everything */
  function render() {
    const m = computeModel(state, protein);
    const pts = buildPath(m);
    renderChart(m, pts);

    $('totalTime').textContent = fmtHrs(m.totalTime);
    const frac = bandFraction(state.wrap);
    $('totalTimeSub').textContent =
      fmtHrsRange(m.totalTime, frac) + ' window to ' + finishTemp + '°F (±' + Math.round(frac * 100) + '%)';

    if (stalls) {
      $('stallTime').textContent = fmtHrs(m.stallDuration);
      $('stallSub').textContent = m.stallDuration < 0.05 ? 'crushed by the crutch' : 'plateau near ' + Math.round(m.stallStart) + '°F';
      $('phase1').textContent = fmtHrsShort(m.t1);
      $('phase2').textContent = fmtHrsShort(m.stallDuration);
      $('phase3').textContent = fmtHrsShort(m.t3);
      $('wrapTempWrap').style.opacity = state.wrap === 'none' ? '0.4' : '1';
      $('wrapTemp').disabled = state.wrap === 'none';
      $('climateDesc').textContent = CLIMATE_COPY[state.climate];
    } else {
      $('stallTime').textContent = 'None';
      $('stallSub').textContent = 'poultry climbs steadily';
      $('phase1').textContent = fmtHrsShort(m.totalTime);
      $('phase2').textContent = '—';
      $('phase3').textContent = '—';
    }

    // Protein thermal segmented-axis help copy.
    for (const a of tSegs) {
      if (a.copy && $(`${a.id}Desc`)) $(`${a.id}Desc`).innerHTML = tCopy[a.copy][state[a.id]];
    }

    persist();
  }

  function setFill(el) {
    const min = parseFloat(el.min),
      max = parseFloat(el.max),
      val = parseFloat(el.value);
    el.style.setProperty('--fill', ((val - min) / (max - min)) * 100 + '%');
  }

  /* Persistence — per-protein state + shared cross-tool cook profile */
  const STORE_KEY = `pitmaster.stall.${protein.meta.slug}`;
  const SHARED_KEY = 'pitmaster.cook';
  const WRAP_TO_CANON = { none: 'none', peach_butcher_paper: 'paper', aluminum_foil: 'foil' };
  const CANON_TO_WRAP = { none: 'none', paper: 'peach_butcher_paper', foil: 'aluminum_foil' };

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      if (typeof state.weight === 'number') {
        const shared = JSON.parse(localStorage.getItem(SHARED_KEY) || '{}');
        shared.weight = state.weight;
        if (stalls) shared.wrap = WRAP_TO_CANON[state.wrap];
        localStorage.setItem(SHARED_KEY, JSON.stringify(shared));
      }
    } catch (e) {
      /* storage unavailable — ignore */
    }
    updateShareUrl();
  }

  function hydrateFromParams() {
    const p = getParams();
    if (![...p.keys()].length) return;
    for (const a of tSliders) {
      const key = PARAM[a.id];
      if (key && p.has(key)) state[a.id] = clampNum(p.get(key), a.range.min, a.range.max, state[a.id]);
    }
    for (const a of [...tSegs, ...tSelects]) {
      const key = PARAM[a.id];
      if (key && p.has(key)) state[a.id] = enumParam(p.get(key), a.options.map((o) => o.value), state[a.id]);
    }
    if (p.has('pt')) state.pitTemp = enumParam(p.get('pt'), pitTemps, state.pitTemp);
    if (p.has('pit'))
      state.pit = enumParam(p.get('pit'), ['pellet_cooker', 'offset_smoker', 'ceramic_kamado', 'charcoal_kettle'], state.pit);
    if (stalls) {
      if (p.has('wr')) state.wrap = enumParam(p.get('wr'), ['none', 'peach_butcher_paper', 'aluminum_foil'], state.wrap);
      if (p.has('wt')) state.wrapTemp = Math.round(clampNum(p.get('wt'), 150, 170, state.wrapTemp));
      if (p.has('cl')) state.climate = enumParam(p.get('cl'), ['arid', 'moderate', 'humid'], state.climate);
    }
    maybeNoticeVersion(p);
  }

  // Notify (don't pin): if a shared link was made under a different model
  // version, the numbers may have moved since. Absent `v` = pre-v2026.2 link.
  function maybeNoticeVersion(p) {
    const el = document.getElementById('versionNotice');
    if (!el) return;
    const cameFromLink = p.has('pt') || p.has('pr') || p.has('w');
    if (!cameFromLink) return;
    const shared = p.get('v');
    if (shared === protein.meta.version) return;
    const was = shared || 'v2026.1 or earlier';
    el.textContent = `Heads up: this link was shared under Model ${was.startsWith('v') ? was : 'v' + was}; you're viewing Model v${protein.meta.version}, which may produce different times.`;
    el.classList.remove('hidden');
  }

  function updateShareUrl() {
    const params = { pr: protein.meta.id, pt: state.pitTemp, pit: state.pit, v: protein.meta.version };
    for (const a of tAxes) if (PARAM[a.id]) params[PARAM[a.id]] = state[a.id];
    if (stalls) {
      params.wr = state.wrap;
      params.wt = state.wrapTemp;
      params.cl = state.climate;
    }
    writeParams(params);
  }

  function applyGlobalSetup() {
    try {
      const rig = localStorage.getItem('pitmaster_smoker');
      const RIG_TO_PIT = {
        'Pit Boss Pellet Smoker': 'pellet_cooker',
        'Traeger Pellet Smoker': 'pellet_cooker',
        'Weber Kettle Charcoal Grill': 'charcoal_kettle',
        'Custom Offset Smoker': 'offset_smoker',
      };
      if (rig && RIG_TO_PIT[rig]) state.pit = RIG_TO_PIT[rig];
      const target = parseFloat(localStorage.getItem('pitmaster_target_temp'));
      if (isFinite(target)) {
        state.pitTemp = pitTemps.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
      }
    } catch (e) {
      /* ignore */
    }
  }

  function loadState() {
    try {
      applyGlobalSetup();
      Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
      if (typeof state.weight === 'number') {
        const shared = JSON.parse(localStorage.getItem(SHARED_KEY) || '{}');
        const wAxis = tSliders.find((a) => a.id === 'weight');
        if (wAxis && typeof shared.weight === 'number') state.weight = Math.min(wAxis.range.max, Math.max(wAxis.range.min, shared.weight));
        if (stalls && shared.wrap && CANON_TO_WRAP[shared.wrap]) state.wrap = CANON_TO_WRAP[shared.wrap];
      }
    } catch (e) {
      /* ignore */
    }
  }

  function syncControls() {
    for (const a of tSliders) {
      const el = $(a.id);
      el.value = state[a.id];
      $(`${a.id}Val`).textContent = Number(state[a.id]).toFixed(1);
      setFill(el);
    }
    for (const a of tSelects) $(a.id).value = state[a.id];
    for (const a of tSegs) paintThermal(a.id, state[a.id]);

    const pit = $('pit');
    pit.value = state.pit;
    $('pitDesc').textContent = DATA.pit_profiles[state.pit].description;
    paintEquip('.temp-opt', 'temp', state.pitTemp);
    if (stalls) {
      const wrapTemp = $('wrapTemp');
      wrapTemp.value = state.wrapTemp;
      $('wrapTempVal').textContent = state.wrapTemp;
      $('wrapDesc').textContent = WRAP_COPY[state.wrap];
      paintEquip('.wrap-opt', 'wrap', state.wrap);
      paintEquip('.climate-opt', 'climate', state.climate);
      setFill(wrapTemp);
    }
  }

  /* Wiring */
  function init() {
    for (const a of tSliders) {
      const el = $(a.id);
      el.addEventListener('input', () => {
        state[a.id] = parseFloat(el.value);
        $(`${a.id}Val`).textContent = Number(state[a.id]).toFixed(1);
        setFill(el);
        render();
      });
    }
    for (const a of tSelects) {
      const el = $(a.id);
      el.addEventListener('change', () => {
        state[a.id] = el.value;
        render();
      });
    }
    for (const a of tSegs) {
      $(`${a.id}Toggle`).addEventListener('click', (e) => {
        const btn = e.target.closest(`.${a.id}-opt`);
        if (!btn) return;
        state[a.id] = btn.dataset.value;
        paintThermal(a.id, state[a.id]);
        render();
      });
    }

    const pit = $('pit');
    pit.addEventListener('change', () => {
      state.pit = pit.value;
      $('pitDesc').textContent = DATA.pit_profiles[state.pit].description;
      render();
    });
    $('pitTempToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.temp-opt');
      if (!btn) return;
      state.pitTemp = btn.dataset.temp;
      paintEquip('.temp-opt', 'temp', state.pitTemp);
      render();
    });

    if (stalls) {
      const wrapTemp = $('wrapTemp');
      wrapTemp.addEventListener('input', () => {
        state.wrapTemp = parseInt(wrapTemp.value, 10);
        $('wrapTempVal').textContent = state.wrapTemp;
        setFill(wrapTemp);
        render();
      });
      $('wrapToggle').addEventListener('click', (e) => {
        const btn = e.target.closest('.wrap-opt');
        if (!btn) return;
        state.wrap = btn.dataset.wrap;
        paintEquip('.wrap-opt', 'wrap', state.wrap);
        $('wrapDesc').textContent = WRAP_COPY[state.wrap];
        PitmasterAnalytics.emit('stall_wrap_selected', { wrap: state.wrap });
        render();
      });
      $('climateToggle').addEventListener('click', (e) => {
        const btn = e.target.closest('.climate-opt');
        if (!btn) return;
        state.climate = btn.dataset.climate;
        paintEquip('.climate-opt', 'climate', state.climate);
        render();
      });
    }

    const chart = $('chart');
    chart.addEventListener('pointermove', onChartHover);
    chart.addEventListener('pointerleave', hideChartHover);

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
