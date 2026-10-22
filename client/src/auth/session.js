// Where the sign-in token lives. "Remember me" -> localStorage (survives
// closing the browser); otherwise sessionStorage (gone with the tab).
// Imported by api.js, so it must not import anything from the app.
import { BRAND } from './brand.jsx';

export const AUTH_EXPIRED_EVENT = 'crm-auth-expired';
// Disparado quando o servidor recusa uma ação por a sessão ser de teste grátis (a faixa mostra o aviso).
export const DEMO_BLOCKED_EVENT = 'cohort-demo-blocked';
const TRIAL_ENDED_KEY = 'cohort-trial-ended';

function read(storage) {
  try {
    const raw = storage.getItem(BRAND.storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readSession() {
  try {
    return read(localStorage) || read(sessionStorage);
  } catch {
    return null;
  }
}

export function isRemembered() {
  try {
    return !!localStorage.getItem(BRAND.storageKey);
  } catch {
    return true;
  }
}

export function writeSession(remember, value) {
  clearSession();
  try {
    (remember ? localStorage : sessionStorage).setItem(BRAND.storageKey, JSON.stringify(value));
  } catch {
    // storage blocked: the session just lasts until the page is closed
  }
}

export function clearSession() {
  try { localStorage.removeItem(BRAND.storageKey); } catch { /* ignore */ }
  try { sessionStorage.removeItem(BRAND.storageKey); } catch { /* ignore */ }
}

export function getToken() {
  return readSession()?.token || null;
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Teste grátis vencido: a tela de login mostra "seu teste terminou" uma vez.
export function markTrialEnded() {
  try { sessionStorage.setItem(TRIAL_ENDED_KEY, '1'); } catch { /* armazenamento bloqueado */ }
}

export function takeTrialEnded() {
  try {
    const was = sessionStorage.getItem(TRIAL_ENDED_KEY) === '1';
    sessionStorage.removeItem(TRIAL_ENDED_KEY);
    return was;
  } catch {
    return false;
  }
}

export function notifyDemoBlocked() {
  window.dispatchEvent(new Event(DEMO_BLOCKED_EVENT));
}

// Called by api.js when any request comes back 401 while holding a token.
export function handleUnauthorized(code) {
  if (!getToken()) return;
  if (code === 'demo_expired') markTrialEnded();
  clearSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}
