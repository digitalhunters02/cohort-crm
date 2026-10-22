// De onde veio o visitante (anúncio): guarda utm_* e fbclid da URL em sessionStorage para mandar junto ao pedir o teste grátis.
// Só estas chaves, texto curto. Tudo em try/catch: com o armazenamento bloqueado o app segue normal.
const KEY = 'cohort-attribution';
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

function fromUrl() {
  const out = {};
  try {
    // A página usa rotas com "#": o anúncio pode trazer ?utm_... antes do "#" ou depois dele (#/?utm_...).
    const hash = window.location.hash || '';
    const sources = [window.location.search, hash.includes('?') ? hash.slice(hash.indexOf('?')) : ''];
    for (const s of sources) {
      const p = new URLSearchParams(s);
      for (const k of KEYS) {
        const v = (p.get(k) || '').trim();
        if (v && !out[k]) out[k] = v.slice(0, 120);
      }
    }
  } catch { /* sem URL legível */ }
  return out;
}

export function captureAttribution() {
  const found = fromUrl();
  if (!Object.keys(found).length) return;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    // A primeira origem da visita vale; só completa o que faltava.
    sessionStorage.setItem(KEY, JSON.stringify({ ...found, ...saved }));
  } catch { /* armazenamento bloqueado */ }
}

export function getAttribution() {
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; } catch { /* vazio */ }
  const out = {};
  for (const k of KEYS) {
    const v = saved[k] ?? fromUrl()[k];
    if (typeof v === 'string' && v) out[k] = v.slice(0, 120);
  }
  return out;
}
