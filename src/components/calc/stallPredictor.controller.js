/*
 * StallPredictor controller — client logic extracted verbatim from the former
 * inline script in stall-predictor.astro. The only protein-driven input is meat
 * weight, whose slider range/clamp now comes from the registry's `thermal.axes`
 * (keyed by axis id). Pit / wrap / climate are equipment/environment inputs and
 * stay as component-local whitelists.
 */
import { PROTEINS } from '../../utils/proteinRegistry.js';
import { DATA, START_TEMP, FINISH_TEMP, WRAP_COPY, CLIMATE_COPY, computeModel, buildPath } from '../../utils/stallEngine.js';
import { PitmasterAnalytics } from '../../utils/analytics.js';
import { clampNum, enumParam, getParams, writeParams, wireCopyButton } from '../../utils/shareLink.js';

export function initStallPredictor(protein = PROTEINS.beef_brisket) {
  const wAxis = protein.thermal.axes.find((a) => a.id === 'weight');
  const wR = wAxis.range;
  const finishTemp = protein.thermal.finish_temp;

  /* State */
  const state = {
    weight: 12,
    pitTemp: '225',
    pit: 'offset_smoker',
    wrap: 'peach_butcher_paper',
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

  /* SVG chart rendering */
  const NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, text) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  // Hover state — pixel/data samples of the current curve, read by the hover handler.
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

    // transparent capture layer so pointer moves anywhere in the plot are hit-tested
    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent', 'pointer-events': 'all' }));

    const yMin = 40,
      yMax = 210;
    const xMax = Math.max(2, Math.ceil(m.totalTime));

    const xScale = (t) => ml + (t / xMax) * pw;
    const yScale = (v) => mt + (1 - (v - yMin) / (yMax - yMin)) * ph;

    // defs: gradients
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

    // horizontal gridlines + Y labels (every 20°F)
    for (let v = yMin; v <= yMax; v += 20) {
      const y = yScale(v);
      svg.appendChild(el('line', { x1: ml, y1: y, x2: W - mr, y2: y, stroke: '#1e293b', 'stroke-width': '1' }));
      svg.appendChild(el('text', { x: ml - 10, y: y + 4, 'text-anchor': 'end', 'font-size': '11', fill: '#64748b', 'font-family': 'ui-monospace, monospace' }, v + '°'));
    }
    // vertical gridlines + X labels
    const xStep = xMax > 12 ? 2 : 1;
    for (let hh = 0; hh <= xMax; hh += xStep) {
      const x = xScale(hh);
      svg.appendChild(el('line', { x1: x, y1: mt, x2: x, y2: mt + ph, stroke: '#141f38', 'stroke-width': '1' }));
      svg.appendChild(el('text', { x: x, y: H - mb + 20, 'text-anchor': 'middle', 'font-size': '11', fill: '#64748b', 'font-family': 'ui-monospace, monospace' }, hh + 'h'));
    }

    // axis titles
    svg.appendChild(el('text', { x: ml + pw / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': '12', fill: '#94a3b8', 'font-weight': '600' }, 'Hours of Cook Time'));
    const yTitle = el('text', { x: 16, y: mt + ph / 2, 'text-anchor': 'middle', 'font-size': '12', fill: '#94a3b8', 'font-weight': '600', transform: `rotate(-90 16 ${mt + ph / 2})` }, 'Internal Meat Temp (°F)');
    svg.appendChild(yTitle);

    // stall band shading
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

    // finish line (protein finish temp)
    const yFin = yScale(finishTemp);
    svg.appendChild(el('line', { x1: ml, y1: yFin, x2: W - mr, y2: yFin, stroke: '#22c55e', 'stroke-width': '1.25', 'stroke-dasharray': '5 4', 'stroke-opacity': '0.65' }));
    svg.appendChild(el('text', { x: W - mr - 4, y: yFin - 6, 'text-anchor': 'end', 'font-size': '10', fill: '#4ade80', 'font-weight': '600' }, 'Done · ' + finishTemp + '°F'));

    // wrap target line (only meaningful when a wrap is used)
    if (state.wrap !== 'none') {
      const yW = yScale(state.wrapTemp);
      svg.appendChild(el('line', { x1: ml, y1: yW, x2: W - mr, y2: yW, stroke: '#38bdf8', 'stroke-width': '1', 'stroke-dasharray': '2 4', 'stroke-opacity': '0.5' }));
      svg.appendChild(el('text', { x: ml + 4, y: yW - 5, 'text-anchor': 'start', 'font-size': '10', fill: '#7dd3fc', 'font-weight': '600' }, 'Wrap · ' + state.wrapTemp + '°F'));
    }

    // build point coords
    const coords = pts.map((p) => [xScale(Math.min(p.t, xMax)), yScale(Math.min(Math.max(p.temp, yMin), yMax))]);

    // area under curve
    let areaD = `M ${coords[0][0]} ${yScale(yMin)} `;
    coords.forEach((c) => {
      areaD += `L ${c[0].toFixed(1)} ${c[1].toFixed(1)} `;
    });
    areaD += `L ${coords[coords.length - 1][0]} ${yScale(yMin)} Z`;
    svg.appendChild(el('path', { d: areaD, fill: 'url(#areaGrad)' }));

    // main curve
    let lineD = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)} `;
    for (let i = 1; i < coords.length; i++) lineD += `L ${coords[i][0].toFixed(1)} ${coords[i][1].toFixed(1)} `;
    svg.appendChild(el('path', { d: lineD, fill: 'none', stroke: 'url(#lineGrad)', 'stroke-width': '3.25', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

    // markers: start, stall-entry, finish
    const start = coords[0];
    const finish = coords[coords.length - 1];
    const stallEntry = [xScale(m.t1), yScale(m.stallStart)];
    svg.appendChild(el('circle', { cx: start[0], cy: start[1], r: '4', fill: '#0f172a', stroke: '#f59e0b', 'stroke-width': '2' }));
    svg.appendChild(el('circle', { cx: stallEntry[0], cy: stallEntry[1], r: '4', fill: '#0f172a', stroke: '#fbbf24', 'stroke-width': '2' }));
    svg.appendChild(el('circle', { cx: finish[0], cy: finish[1], r: '5', fill: '#22c55e', stroke: '#0f172a', 'stroke-width': '2' }));

    // ---- interactive hover layer (crosshair + tooltip) ----
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

  /* Segmented control painter */
  const ACTIVE = ['bg-flame-500', 'text-white', 'shadow'];
  const INACTIVE = ['text-slate-400', 'hover:text-slate-300'];
  function paintGroup(selector, dataAttr, current) {
    document.querySelectorAll(selector).forEach((btn) => {
      const on = btn.dataset[dataAttr] === current;
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
    $('totalTimeSub').textContent = '≈ ' + m.totalTime.toFixed(1) + ' hrs to ' + finishTemp + '°F';
    $('stallTime').textContent = fmtHrs(m.stallDuration);
    $('stallSub').textContent = m.stallDuration < 0.05 ? 'crushed by the crutch' : 'plateau near ' + Math.round(m.stallStart) + '°F';

    $('phase1').textContent = fmtHrsShort(m.t1);
    $('phase2').textContent = fmtHrsShort(m.stallDuration);
    $('phase3').textContent = fmtHrsShort(m.t3);

    // wrap temp control only relevant when wrapping
    $('wrapTempWrap').style.opacity = state.wrap === 'none' ? '0.4' : '1';
    $('wrapTemp').disabled = state.wrap === 'none';

    $('climateDesc').textContent = CLIMATE_COPY[state.climate];
    persist();
  }

  function setFill(el) {
    const min = parseFloat(el.min),
      max = parseFloat(el.max),
      val = parseFloat(el.value);
    el.style.setProperty('--fill', ((val - min) / (max - min)) * 100 + '%');
  }

  /* Persistence — per-page state + shared cross-tool cook profile */
  const STORE_KEY = 'pitmaster.stall';
  const SHARED_KEY = 'pitmaster.cook';
  // Shared wrap vocabulary across tools: none | paper | foil
  const WRAP_TO_CANON = { none: 'none', peach_butcher_paper: 'paper', aluminum_foil: 'foil' };
  const CANON_TO_WRAP = { none: 'none', paper: 'peach_butcher_paper', foil: 'aluminum_foil' };

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

  // Shareable-link hydration (validated) — runs after loadState so params win.
  function hydrateFromParams() {
    const p = getParams();
    if (![...p.keys()].length) return;
    if (p.has('w')) state.weight = clampNum(p.get('w'), wR.min, wR.max, state.weight);
    if (p.has('pt')) state.pitTemp = enumParam(p.get('pt'), ['225', '250', '275'], state.pitTemp);
    if (p.has('pit'))
      state.pit = enumParam(p.get('pit'), ['pellet_cooker', 'offset_smoker', 'ceramic_kamado', 'charcoal_kettle'], state.pit);
    if (p.has('wr'))
      state.wrap = enumParam(p.get('wr'), ['none', 'peach_butcher_paper', 'aluminum_foil'], state.wrap);
    if (p.has('wt')) state.wrapTemp = Math.round(clampNum(p.get('wt'), 150, 170, state.wrapTemp));
    if (p.has('cl')) state.climate = enumParam(p.get('cl'), ['arid', 'moderate', 'humid'], state.climate);
  }

  function updateShareUrl() {
    writeParams({
      w: state.weight,
      pt: state.pitTemp,
      pit: state.pit,
      wr: state.wrap,
      wt: state.wrapTemp,
      cl: state.climate,
    });
  }

  // Seed pit type & target temp from the hub "Save My Setup" profile (first-visit defaults).
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
        // snap to nearest supported pit temperature
        state.pitTemp = ['225', '250', '275'].reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
      }
    } catch (e) {
      /* ignore */
    }
  }

  function loadState() {
    try {
      applyGlobalSetup(); // hub profile seeds defaults; per-page + shared state override below
      Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
      const shared = JSON.parse(localStorage.getItem(SHARED_KEY) || '{}');
      if (typeof shared.weight === 'number') state.weight = Math.min(wR.max, Math.max(wR.min, shared.weight));
      if (shared.wrap && CANON_TO_WRAP[shared.wrap]) state.wrap = CANON_TO_WRAP[shared.wrap];
    } catch (e) {
      /* ignore */
    }
  }

  function syncControls() {
    const weight = $('weight'),
      wrapTemp = $('wrapTemp'),
      pit = $('pit');
    weight.value = state.weight;
    $('weightVal').textContent = state.weight.toFixed(1);
    wrapTemp.value = state.wrapTemp;
    $('wrapTempVal').textContent = state.wrapTemp;
    pit.value = state.pit;
    $('pitDesc').textContent = DATA.pit_profiles[state.pit].description;
    $('wrapDesc').textContent = WRAP_COPY[state.wrap];
    paintGroup('.temp-opt', 'temp', state.pitTemp);
    paintGroup('.wrap-opt', 'wrap', state.wrap);
    paintGroup('.climate-opt', 'climate', state.climate);
    setFill(weight);
    setFill(wrapTemp);
  }

  /* Wiring */
  function init() {
    const weight = $('weight'),
      wrapTemp = $('wrapTemp'),
      pit = $('pit');

    weight.addEventListener('input', () => {
      state.weight = parseFloat(weight.value);
      $('weightVal').textContent = state.weight.toFixed(1);
      setFill(weight);
      render();
    });

    wrapTemp.addEventListener('input', () => {
      state.wrapTemp = parseInt(wrapTemp.value, 10);
      $('wrapTempVal').textContent = state.wrapTemp;
      setFill(wrapTemp);
      render();
    });

    pit.addEventListener('change', () => {
      state.pit = pit.value;
      $('pitDesc').textContent = DATA.pit_profiles[state.pit].description;
      render();
    });

    $('pitTempToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.temp-opt');
      if (!btn) return;
      state.pitTemp = btn.dataset.temp;
      paintGroup('.temp-opt', 'temp', state.pitTemp);
      render();
    });

    $('wrapToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.wrap-opt');
      if (!btn) return;
      state.wrap = btn.dataset.wrap;
      paintGroup('.wrap-opt', 'wrap', state.wrap);
      $('wrapDesc').textContent = WRAP_COPY[state.wrap];
      PitmasterAnalytics.emit('stall_wrap_selected', { wrap: state.wrap });
      render();
    });

    // Regional climate profile — recompute & redraw the curve on change.
    $('climateToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.climate-opt');
      if (!btn) return;
      state.climate = btn.dataset.climate;
      paintGroup('.climate-opt', 'climate', state.climate);
      render();
    });

    // Chart hover crosshair + tooltip
    const chart = $('chart');
    chart.addEventListener('pointermove', onChartHover);
    chart.addEventListener('pointerleave', hideChartHover);

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

  init();
  return { state, render };
}
