/*
 * Cook-log capture UI controller. Mounted once per StallPredictor instance
 * (all four protein stall pages share that component), so this same file
 * drives the panel on /stall-predictor, /pork-shoulder-stall, /ribs-stall,
 * and /turkey-stall.
 *
 * State machine (mutually exclusive panels, toggled via [hidden]):
 *   undecided consent -> consent prompt
 *   denied consent     -> a single small "enable" link (no repeat nagging)
 *   granted, no active cook -> "track this cook" start form
 *   granted, active cook    -> in-progress checkpoints
 *
 * The active cook record lives in IndexedDB (public/sw-queue-utils.js),
 * not localStorage, because it has to survive the app being closed mid-cook
 * (a plain page reload keeps localStorage too, but IndexedDB is where the
 * offline queue already lives, and one storage story for "cook is still
 * happening" data is simpler to reason about than two).
 */
import '../../../public/sw-queue-utils.js';
import { hasConsent, getConsentState, setConsent, getAnonClientId } from '../../utils/cookLogConsent.js';
import { postCookLog, patchCookLog, drainQueueNow } from '../../utils/cookLogClient.js';

// Calculator enum -> cook-log enum. Only used to seed sensible defaults in
// the collapsed "optional details" section — never auto-submitted without
// the user seeing/being able to change it.
const PIT_TO_COOK_METHOD = {
  offset_smoker: 'offset',
  pellet_cooker: 'pellet',
  ceramic_kamado: 'kamado',
  charcoal_kettle: 'other',
};
const CALC_WRAP_TO_LOG = { none: 'unwrapped', peach_butcher_paper: 'butcher_paper', aluminum_foil: 'foil' };

export function initCookLogCapture(proteinTypeId, modelVersion, stallControls) {
  const $ = (id) => document.getElementById(id);
  const panels = {
    consent: $('cookLogConsentPrompt'),
    denied: $('cookLogDeniedLink'),
    start: $('cookLogStartForm'),
    active: $('cookLogCheckpoints'),
  };
  if (!panels.consent) return; // component not present on this page

  function showOnly(name) {
    for (const key of Object.keys(panels)) {
      if (panels[key]) panels[key].hidden = key !== name;
    }
  }

  async function refreshUnsyncedBadge() {
    const badge = $('cookLogUnsyncedBadge');
    const countEl = $('cookLogUnsyncedCount');
    if (!badge || !countEl) return;
    const pending = await globalThis.SWQueueUtils.createIndexedDbQueueStorage().getAll();
    badge.hidden = pending.length === 0;
    countEl.textContent = String(pending.length);
  }

  async function refresh() {
    refreshUnsyncedBadge();

    const consentState = getConsentState();
    if (consentState === null) return showOnly('consent');
    if (consentState === 'denied') return showOnly('denied');

    const activeCook = await globalThis.SWQueueUtils.getActiveCook();
    if (activeCook) {
      showOnly('active');
      renderActiveCook(activeCook);
    } else {
      showOnly('start');
    }
  }

  function setStatus(message) {
    const el = $('cookLogStatus');
    if (el) el.textContent = message || '';
  }

  /* ---------- Consent ---------- */
  async function optOut() {
    // Stop all writes immediately and clear anything queued locally —
    // nothing further is sent, and nothing already queued survives.
    setConsent(false);
    await globalThis.SWQueueUtils.clearAll();
    refresh();
  }
  $('cookLogOptIn')?.addEventListener('click', () => {
    setConsent(true);
    refresh();
  });
  $('cookLogOptOut')?.addEventListener('click', optOut);
  document.querySelectorAll('[data-cook-log-opt-out]').forEach((btn) => btn.addEventListener('click', optOut));
  $('cookLogEnableLink')?.addEventListener('click', () => {
    setConsent(true);
    refresh();
  });

  /* ---------- Start a cook ---------- */
  const optionalToggle = $('cookLogOptionalToggle');
  optionalToggle?.addEventListener('click', () => {
    const details = $('cookLogOptionalDetails');
    if (details) details.hidden = !details.hidden;
  });

  $('cookLogStartForm')?.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const predictedMinutes = stallControls.getPredictedCookMinutes();
    if (predictedMinutes == null) return; // model hasn't rendered yet — shouldn't happen, but don't submit garbage

    const weightSource = $('cookLogWeightSource').value;
    const targetPitTemp = $('cookLogTargetPitTemp').value;
    const cookMethod = $('cookLogCookMethod').value;
    const ambientTemp = $('cookLogAmbientTemp').value;
    const altitude = $('cookLogAltitude').value;

    const payload = {
      anon_client_id: getAnonClientId(),
      protein_type: proteinTypeId,
      model_version: modelVersion,
      weight_lb: stallControls.state.weight,
      weight_source: weightSource,
      predicted_cook_minutes: predictedMinutes,
      consented_at: new Date().toISOString(),
      start_time: new Date().toISOString(),
      ...(cookMethod && { cook_method: cookMethod }),
      ...(targetPitTemp && { target_pit_temp_f: parseInt(targetPitTemp, 10) }),
      ...(ambientTemp && { ambient_temp_f: parseInt(ambientTemp, 10) }),
      ...(altitude && { altitude_ft: parseInt(altitude, 10) }),
    };

    setStatus('Starting…');
    const result = await postCookLog(payload);
    if (result.queued) {
      // Offline at cook start: keep going locally with a placeholder id;
      // the real id arrives once the queued POST actually lands (id swap
      // handled by syncActiveCookId(), called from the online fallback).
      await globalThis.SWQueueUtils.setActiveCook({ id: null, proteinType: proteinTypeId, startedAt: payload.start_time });
      setStatus('Offline: will start syncing once you are back online.');
    } else if (!result.ok) {
      setStatus('Could not start tracking (server rejected the request).');
      return;
    } else {
      await globalThis.SWQueueUtils.setActiveCook({ id: result.data.id, proteinType: proteinTypeId, startedAt: payload.start_time });
      setStatus('');
    }
    refresh();
  });

  /* ---------- In-progress checkpoints ---------- */
  function renderActiveCook(cook) {
    const label = $('cookLogActiveLabel');
    if (label) label.textContent = cook.proteinType === proteinTypeId ? 'Tracking this cook' : `Tracking a ${cook.proteinType.replace('_', ' ')} cook`;
    const finishSection = $('cookLogFinishSection');
    if (finishSection) finishSection.hidden = !!cook.finishedAt;
    const restSection = $('cookLogRestSection');
    if (restSection) restSection.hidden = !cook.finishedAt;
  }

  async function patchActiveCook(fields, statusMessage) {
    const cook = await globalThis.SWQueueUtils.getActiveCook();
    if (!cook) return;
    if (cook.id == null) {
      setStatus('Still offline from cook start: this update will sync once the cook itself does.');
      return;
    }
    setStatus(statusMessage ? statusMessage + '…' : 'Saving…');
    const result = await patchCookLog(cook.id, { ...fields, anon_client_id: getAnonClientId() });
    setStatus(result.queued ? 'Saved: will sync once back online.' : result.ok ? '' : 'Could not save (server rejected the request).');
    if (result.ok || result.queued) {
      await globalThis.SWQueueUtils.setActiveCook({ ...cook, ...fields, finishedAt: fields.finish_time ? true : cook.finishedAt });
      refresh();
    }
  }

  $('cookLogMarkWrapped')?.addEventListener('click', () => {
    patchActiveCook(
      { wrap_time: new Date().toISOString(), wrap_method: CALC_WRAP_TO_LOG[stallControls.state.wrap] || 'unwrapped' },
      'Marking wrapped',
    );
  });
  $('cookLogMarkStallStart')?.addEventListener('click', () => {
    patchActiveCook({ stall_start_time: new Date().toISOString() }, 'Marking stall start');
  });
  $('cookLogMarkStallEnd')?.addEventListener('click', () => {
    patchActiveCook({ stall_end_time: new Date().toISOString() }, 'Marking stall end');
  });
  $('cookLogFinishForm')?.addEventListener('submit', (evt) => {
    evt.preventDefault();
    const temp = parseInt($('cookLogFinalTemp').value, 10);
    if (!Number.isFinite(temp)) return;
    patchActiveCook({ finish_time: new Date().toISOString(), final_internal_temp_f: temp }, 'Marking finished');
  });
  $('cookLogRestForm')?.addEventListener('submit', (evt) => {
    evt.preventDefault();
    const minutes = parseInt($('cookLogRestMinutes').value, 10);
    if (!Number.isFinite(minutes)) return;
    patchActiveCook({ rest_minutes: minutes }, 'Marking rested');
  });
  $('cookLogDoneTracking')?.addEventListener('click', async () => {
    await globalThis.SWQueueUtils.clearActiveCook();
    setStatus('');
    refresh();
  });

  /* ---------- Optional-details defaults (seeded, never auto-submitted) ---------- */
  const pitTempInput = $('cookLogTargetPitTemp');
  if (pitTempInput && stallControls.state.pitTemp) pitTempInput.value = stallControls.state.pitTemp;
  const cookMethodSelect = $('cookLogCookMethod');
  if (cookMethodSelect && PIT_TO_COOK_METHOD[stallControls.state.pit]) {
    cookMethodSelect.value = PIT_TO_COOK_METHOD[stallControls.state.pit];
  }

  /* ---------- Offline fallback: online/visibilitychange (Safari has no Background Sync) ---------- */
  window.addEventListener('online', () => {
    drainQueueNow().then(refresh);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      drainQueueNow().then(refresh);
    }
  });

  refresh();
}
