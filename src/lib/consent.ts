/** The visitor's cookie choice: 'all' (incl. Google Analytics) or 'essential' only. Unset = not asked yet. */
export type Consent = 'all' | 'essential';

const KEY = 's2g-cookie-consent';
export const CONSENT_EVENT = 's2g-consent';
/** Fired by the footer's "הגדרות עוגיות" – reopens the notice. */
export const CONSENT_OPEN_EVENT = 's2g-consent-open';

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'all' || v === 'essential' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: Consent) {
  try {
    localStorage.setItem(KEY, v);
  } catch {}
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** Analytics run unless the visitor chose "essential only". */
export const analyticsAllowed = () => getConsent() !== 'essential';
