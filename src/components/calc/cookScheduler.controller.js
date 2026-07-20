/*
 * CookScheduler controller — client logic extracted verbatim from the former
 * inline script in cook-scheduler.astro. The only protein-driven input is meat
 * weight, whose slider range/clamp now comes from the registry's `thermal.axes`.
 * Pit / wrap / climate / rest are equipment/environment inputs and stay
 * component-local.
 */
import { PROTEINS } from '../../utils/proteinRegistry.js';
import { computeModel, buildPath, FINISH_TEMP } from '../../utils/stallEngine.js';
import { clampNum, enumParam, getParams, writeParams, wireCopyButton } from '../../utils/shareLink.js';

export function initCookScheduler(protein = PROTEINS.beef_brisket) {
  const wAxis = protein.thermal.axes.find((a) => a.id === 'weight');
  const wR = wAxis.range;

  const PREHEAT_HRS = 0.75; // smoker preheat before the meat goes on
  const HR = 3600 * 1000;

  const state = {
    weight: 12,
    pitTemp: '225',
    pit: 'offset_smoker',
    wrap: 'peach_butcher_paper',
    wrapTemp: 160,
    climate: 'moderate',
    rest: 1,
    serveAt: '', // datetime-local string
  };

  const $ = (id) => document.getElementById(id);

  const ACTIVE = ['bg-flame-500', 'text-white', 'shadow'];
  const INACTIVE = ['text-base-400', 'hover:text-base-300'];
  function paintGroup(selector, attr, current) {
    document.querySelectorAll(selector).forEach((btn) => {
      const on = btn.dataset[attr] === current;
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

  const fmtClock = (d) =>
    d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const fmtHrs = (h) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return (hh ? hh + 'h ' : '') + String(mm).padStart(2, '0') + 'm';
  };

  // Find the clock offset (hours from meat-on) at which the meat reaches wrapTemp.
  function wrapHoursFromPath(pts, wrapTemp) {
    for (const p of pts) if (p.temp >= wrapTemp) return p.t;
    return null;
  }

  // Compute the schedule; returns milestones or null if no valid serve time.
  function computeSchedule() {
    const serve = state.serveAt ? new Date(state.serveAt) : null;
    if (!serve || isNaN(serve.getTime())) return null;

    const m = computeModel({
      weight: state.weight,
      pitTemp: state.pitTemp,
      pit: state.pit,
      wrap: state.wrap,
      wrapTemp: state.wrapTemp,
      climate: state.climate,
    });
    const pts = buildPath(m);

    const pull = new Date(serve.getTime() - state.rest * HR); // rest starts (pull off pit)
    const meatOn = new Date(pull.getTime() - m.totalTime * HR);
    const fireUp = new Date(meatOn.getTime() - PREHEAT_HRS * HR);

    const milestones = [
      { icon: '🔥', at: fireUp, title: 'Light the fire', sub: `Preheat the pit to ${state.pitTemp}°F (${fmtHrs(PREHEAT_HRS)} before the meat goes on).` },
      { icon: '🥩', at: meatOn, title: 'Meat on', sub: `Cold meat on the grate. Estimated ${fmtHrs(m.totalTime)} to a ${FINISH_TEMP}°F finish.` },
    ];

    if (state.wrap !== 'none') {
      const wh = wrapHoursFromPath(pts, state.wrapTemp);
      if (wh != null) {
        milestones.push({
          icon: '📦',
          at: new Date(meatOn.getTime() + wh * HR),
          title: `Wrap at ${state.wrapTemp}°F`,
          sub: `Roughly when the internal temp hits your wrap target — have paper/foil ready once the bark is set.`,
        });
      }
    }

    milestones.push({
      icon: '🌡️',
      at: pull,
      title: `Pull & rest`,
      sub: `Probe-tender near ${FINISH_TEMP}°F. Rest ${fmtHrs(state.rest)} in a faux-cambro before slicing.`,
    });
    milestones.push({ icon: '🍽️', at: serve, title: 'Serve', sub: 'Slice against the grain and eat.' });

    milestones.sort((a, b) => a.at - b.at);
    return { milestones, model: m, fireUp, serve };
  }

  function render() {
    setFill($('weight'));
    setFill($('wrapTemp'));
    setFill($('rest'));
    $('weightVal').textContent = state.weight.toFixed(1);
    $('wrapTempVal').textContent = state.wrapTemp;
    $('restVal').textContent = state.rest.toFixed(1);
    paintGroup('.temp-opt', 'temp', state.pitTemp);
    paintGroup('.wrap-opt', 'wrap', state.wrap);
    paintGroup('.climate-opt', 'climate', state.climate);
    $('wrapTempWrap').style.opacity = state.wrap === 'none' ? '0.4' : '1';
    $('wrapTemp').disabled = state.wrap === 'none';

    const sched = computeSchedule();
    const timeline = $('timeline');
    const warn = $('warnBox');

    if (!sched) {
      $('fireUpBig').textContent = 'Pick a serving time';
      $('totalSub').textContent = 'Choose when you want to eat to see your fire-up time.';
      warn.classList.add('hidden');
      timeline.replaceChildren();
      $('icsBtn').disabled = true;
      $('icsBtn').classList.add('opacity-40', 'cursor-not-allowed');
      updateShareUrl();
      return;
    }

    $('icsBtn').disabled = false;
    $('icsBtn').classList.remove('opacity-40', 'cursor-not-allowed');
    $('fireUpBig').textContent = fmtClock(sched.fireUp);
    $('totalSub').textContent = `≈ ${fmtHrs(sched.model.totalTime)} cook + ${fmtHrs(state.rest)} rest + ${fmtHrs(PREHEAT_HRS)} preheat`;

    if (sched.fireUp.getTime() < Date.now()) {
      warn.textContent =
        '⚠️ That fire-up time has already passed. Move the meal later, raise the pit temp, or wrap to shorten the cook.';
      warn.classList.remove('hidden');
    } else {
      warn.classList.add('hidden');
    }

    // Build timeline (textContent only — no user HTML).
    timeline.replaceChildren();
    for (const ms of sched.milestones) {
      const li = document.createElement('li');
      li.className = 'ml-6';
      const dot = document.createElement('span');
      dot.className =
        'absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-base-900 ring-1 ring-base-700 text-xs';
      dot.textContent = ms.icon;
      const time = document.createElement('p');
      time.className = 'text-sm font-bold text-white';
      time.textContent = `${ms.title} — ${fmtClock(ms.at)}`;
      const sub = document.createElement('p');
      sub.className = 'text-[13px] text-base-400 leading-relaxed mt-0.5';
      sub.textContent = ms.sub;
      li.append(dot, time, sub);
      timeline.appendChild(li);
    }

    updateShareUrl();
  }

  /* ---- .ics generation ---- */
  const pad = (n) => String(n).padStart(2, '0');
  const icsDate = (d) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const icsEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  function buildIcs(sched) {
    const now = icsDate(new Date());
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Empirical BBQ//Cook Scheduler//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];
    sched.milestones.forEach((ms, i) => {
      const start = ms.at;
      const end = new Date(start.getTime() + 5 * 60 * 1000); // 5-min marker
      lines.push(
        'BEGIN:VEVENT',
        `UID:empiricalbbq-${start.getTime()}-${i}@empiricalbbq.com`,
        `DTSTAMP:${now}`,
        `DTSTART:${icsDate(start)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${icsEscape(ms.icon + ' ' + ms.title)}`,
        `DESCRIPTION:${icsEscape(ms.sub + '  — planned with Empirical BBQ (empiricalbbq.com/cook-scheduler)')}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${icsEscape(ms.title)}`,
        'TRIGGER:-PT10M',
        'END:VALARM',
        'END:VEVENT'
      );
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function downloadIcs() {
    const sched = computeSchedule();
    if (!sched) return;
    const blob = new Blob([buildIcs(sched)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'empirical-bbq-cook-plan.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---- share links (validated) ---- */
  function hydrateFromParams() {
    const p = getParams();
    if (![...p.keys()].length) return;
    if (p.has('w')) state.weight = clampNum(p.get('w'), wR.min, wR.max, state.weight);
    if (p.has('pt')) state.pitTemp = enumParam(p.get('pt'), ['225', '250', '275'], state.pitTemp);
    if (p.has('pit'))
      state.pit = enumParam(p.get('pit'), ['pellet_cooker', 'offset_smoker', 'ceramic_kamado', 'charcoal_kettle'], state.pit);
    if (p.has('wr')) state.wrap = enumParam(p.get('wr'), ['none', 'peach_butcher_paper', 'aluminum_foil'], state.wrap);
    if (p.has('wt')) state.wrapTemp = Math.round(clampNum(p.get('wt'), 150, 170, state.wrapTemp));
    if (p.has('cl')) state.climate = enumParam(p.get('cl'), ['arid', 'moderate', 'humid'], state.climate);
    if (p.has('r')) state.rest = clampNum(p.get('r'), 0.5, 4, state.rest);
    // serve time: accept only a well-formed datetime-local string
    if (p.has('s')) {
      const s = p.get('s');
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) && !isNaN(new Date(s).getTime())) state.serveAt = s;
    }
  }
  function updateShareUrl() {
    const params = {
      w: state.weight,
      pt: state.pitTemp,
      pit: state.pit,
      wr: state.wrap,
      wt: state.wrapTemp,
      cl: state.climate,
      r: state.rest,
    };
    if (state.serveAt) params.s = state.serveAt;
    writeParams(params);
  }

  // Default serve time: tomorrow at 6:00 PM local.
  function defaultServe() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function init() {
    hydrateFromParams();
    if (!state.serveAt) state.serveAt = defaultServe();

    // hydrate controls
    $('serveAt').value = state.serveAt;
    $('weight').value = state.weight;
    $('wrapTemp').value = state.wrapTemp;
    $('rest').value = state.rest;
    $('pit').value = state.pit;

    $('serveAt').addEventListener('input', () => {
      state.serveAt = $('serveAt').value;
      render();
    });
    $('weight').addEventListener('input', () => {
      state.weight = parseFloat($('weight').value);
      render();
    });
    $('wrapTemp').addEventListener('input', () => {
      state.wrapTemp = parseInt($('wrapTemp').value, 10);
      render();
    });
    $('rest').addEventListener('input', () => {
      state.rest = parseFloat($('rest').value);
      render();
    });
    $('pit').addEventListener('change', () => {
      state.pit = $('pit').value;
      render();
    });
    $('pitTempToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.temp-opt');
      if (!btn) return;
      state.pitTemp = btn.dataset.temp;
      render();
    });
    $('wrapToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.wrap-opt');
      if (!btn) return;
      state.wrap = btn.dataset.wrap;
      render();
    });
    $('climateToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('.climate-opt');
      if (!btn) return;
      state.climate = btn.dataset.climate;
      render();
    });
    $('icsBtn').addEventListener('click', downloadIcs);
    wireCopyButton('shareBtn');

    render();
  }

  init();
  return { state, render };
}
