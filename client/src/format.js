// The seed data's realistic near-term dates are anchored to this fictional
// "today" rather than the real current date, so relative-date math stays
// sensible no matter when this app is actually opened.
export const TODAY = new Date('2026-09-15T00:00:00');

export function money(n, compact = false) {
  if (n === null || n === undefined) return '—';
  if (compact) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1000)}K`;
    return `$${n}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function shortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function shortDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.setHours(0, 0, 0, 0) - new Date(TODAY).setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

export function initialsOf(name) {
  if (!name) return '?';
  const parts = name.replace(/&/g, ' ').split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---- CSV export helpers (client-side, no server round trip) ----
export function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(','));
  return lines.join('\n');
}

export function downloadCSV(filename, rows) {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
