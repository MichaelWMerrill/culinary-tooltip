/*
 * Shareable-cook-link helpers.
 *
 * Encodes calculator state into URL query params and hydrates state back from
 * them (params take precedence over localStorage). All readers VALIDATE input:
 * numbers are clamped to their slider range and enums are whitelisted, so a
 * hand-crafted/hostile URL can never inject an out-of-range or unexpected value
 * into state (and therefore never into the DOM).
 */

/** Clamp a numeric param to [min, max]; fall back if not finite. */
export function clampNum(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Return v only if it's in the allowed list; otherwise the fallback. */
export function enumParam(v, allowed, fallback) {
  return allowed.includes(v) ? v : fallback;
}

/**
 * Validate a `protein` share-link param against the registry's known protein
 * ids. A hostile/unknown value falls back to the default so it can never select
 * an unregistered protein.
 */
export function proteinParam(v, allowedIds, fallback = 'beef_brisket') {
  return allowedIds.includes(v) ? v : fallback;
}

/** Parse a boolean-ish param. */
export function boolParam(v, fallback) {
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return fallback;
}

/** Current query params (safe if window/URL unavailable). */
export function getParams() {
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams();
  }
}

/** Replace the URL query string with the given params (no history spam). */
export function writeParams(obj) {
  try {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams(obj).toString();
    history.replaceState(null, '', url.toString());
  } catch {
    /* ignore */
  }
}

/**
 * Wire a "copy share link" button: copies the current URL and briefly swaps the
 * button label to a confirmation.
 */
export function wireCopyButton(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const label = btn.querySelector('[data-copy-label]') || btn;
  const original = label.textContent;
  btn.addEventListener('click', async () => {
    const url = window.location.href;
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // Fallback for older/insecure contexts.
      const t = document.createElement('input');
      t.value = url;
      t.setAttribute('readonly', '');
      t.style.position = 'absolute';
      t.style.left = '-9999px';
      document.body.appendChild(t);
      t.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      t.remove();
    }
    label.textContent = ok ? 'Link copied!' : 'Copy failed';
    setTimeout(() => {
      label.textContent = original;
    }, 1800);
  });
}
