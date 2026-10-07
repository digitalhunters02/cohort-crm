import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import { Card, Kpi, Spinner, Badge, Button, inputCls } from '../components/ui.jsx';

// Vagas x matrículas por série: quantas cadeiras, quantos matriculados, aceitos e lista de espera.
export default function Seats() {
  const [d, setD] = useState(null);
  const [draft, setDraft] = useState({});
  const [err, setErr] = useState(null);
  const [newGrade, setNewGrade] = useState('');
  const load = () => api.seats().then(setD);
  useEffect(() => { load(); }, []);
  if (!d) return <Layout title="Seats & Capacity"><Spinner /></Layout>;
  async function save(grade) {
    setErr(null);
    try { await api.setSeats(grade, Number(draft[grade])); setDraft((x) => { const n = { ...x }; delete n[grade]; return n; }); await load(); } catch (e) { setErr(e.message); }
  }
  const shown = new Set(d.rows.map((r) => r.grade));
  return (
    <Layout title="Seats & Capacity">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Seats" value={d.totals.seats} icon="building" />
        <Kpi label="Enrolled" value={d.totals.enrolled} tone="teal" icon="graduationCap" />
        <Kpi label="Accepted, not yet enrolled" value={d.totals.accepted} tone="gold" icon="checkCircle" />
        <Kpi label="Open seats" value={d.totals.open} tone="brand" icon="userCheck" />
      </div>
      {err && <p className="text-sm text-rose mb-3">{err}</p>}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-muted uppercase tracking-wide">
              <th className="px-4 py-3">Grade</th><th className="pr-3">Seats</th><th className="pr-3">Enrolled</th><th className="pr-3">Accepted</th><th className="pr-3">In process</th><th className="pr-3">Waitlist</th><th className="pr-4">Open</th>
            </tr></thead>
            <tbody>{d.rows.map((r) => {
              const editing = draft[r.grade] !== undefined;
              return (
                <tr key={r.grade} className="border-t border-line">
                  <td className="px-4 py-2.5 font-medium text-ink">{r.grade}</td>
                  <td className="pr-3">
                    <div className="flex items-center gap-1.5">
                      <input aria-label={`Seats for ${r.grade}`} type="number" min="0" className={`${inputCls} !w-20 !py-1`} value={editing ? draft[r.grade] : (r.seats ?? '')} placeholder="—"
                        onChange={(e) => setDraft((x) => ({ ...x, [r.grade]: e.target.value }))} />
                      {editing && <Button size="sm" variant="brand" onClick={() => save(r.grade)}>Save</Button>}
                    </div>
                  </td>
                  <td className="pr-3">{r.enrolled}</td><td className="pr-3">{r.accepted}</td><td className="pr-3">{r.inProcess}</td><td className="pr-3">{r.waitlisted}</td>
                  <td className="pr-4">{r.open === null ? <span className="text-muted">—</span> : <Badge tone={r.open < 0 ? 'rose' : r.open === 0 ? 'amber' : 'green'}>{r.open < 0 ? `${-r.open} over` : r.open === 0 ? 'Full' : r.open}</Badge>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-4 border-t border-line">
          <select className={`${inputCls} !w-52`} aria-label="Add grade" value={newGrade} onChange={(e) => setNewGrade(e.target.value)}>
            <option value="">Add a grade…</option>
            {d.grades.filter((g) => !shown.has(g)).map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <Button variant="outline" size="sm" disabled={!newGrade} onClick={async () => { await api.setSeats(newGrade, 0); setNewGrade(''); load(); }}>Add</Button>
          <span className="text-xs text-muted">Open seats = seats − enrolled − accepted.</span>
        </div>
      </Card>
    </Layout>
  );
}
