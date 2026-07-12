/*
 * PitmasterAnalytics — the global telemetry logger that was previously
 * copy-pasted into every calculator page. Emits to the console and forwards to
 * Google Analytics (gtag) when available.
 */
export const PitmasterAnalytics = {
  emit(eventName, data = {}) {
    const timestamp = new Date().toISOString();
    console.log(`%c[Telemetry] ${eventName}`, 'color: #f59e0b; font-weight: bold;', { timestamp, ...data });
    if (typeof gtag === 'function') {
      gtag('event', eventName, data);
    }
  },
  debounceSlider(eventName, value) {
    if (!this._timers) this._timers = {};
    clearTimeout(this._timers[eventName]);
    this._timers[eventName] = setTimeout(() => {
      this.emit(eventName, { value });
    }, 600);
  },
};
