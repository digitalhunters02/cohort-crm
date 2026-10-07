import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import { Card, Table, CellName, Badge, Spinner, Button, Modal, Field, inputCls, ConfirmDialog } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { shortDate } from '../format.js';

const TEMPLATE = `ENROLLMENT AGREEMENT

The undersigned parent/guardian agrees to enroll the student named above for the coming school year and to pay tuition and fees according to the school's schedule.

1. Tuition is due on the dates shown on each invoice.
2. Withdrawal requires written notice to the school office.
3. The family agrees to follow the school's handbook and policies.`;

export default function Contracts() {
  const [rows, setRows] = useState(null);
  const [families, setFamilies] = useState([]);
  const [form, setForm] = useState(null);
  const [res, setRes] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [copied, setCopied] = useState(null);
  const load = () => api.contracts().then(setRows);
  useEffect(() => { load(); api.families().then(setFamilies); }, []);
  if (!rows) return <Layout title="Contracts"><Spinner /></Layout>;
  const set = (k) => (e) => setForm((v) => ({ ...v, [k]: e.target.value }));
  async function create() { setBusy(true); setErr(null); try { const r = await api.createContract({ ...form, send_email: !!form.send_email }); setRes(r); setForm(null); await load(); } catch (e) { setErr(e.message); } finally { setBusy(false); } }
  const copy = (url) => navigator.clipboard?.writeText(url).then(() => { setCopied(url); setTimeout(() => setCopied(null), 1500); }).catch(() => {});
  const cols = [
    { key: 'title', label: 'Document', render: (r) => <CellName primary={r.title} secondary={`${r.primary_guardian_name}${r.student_name ? ` · ${r.student_name}` : ''}`} avatarName={r.primary_guardian_name} avatarColor="#3a6a94" /> },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'Signed' ? 'green' : 'amber'}>{r.status === 'Signed' ? `Signed by ${r.signed_by}` : 'Waiting for signature'}</Badge> },
    { key: 'created', label: 'Sent', render: (r) => shortDate(r.created_at) },
    { key: 'a', label: '', align: 'right', render: (r) => (
      <div className="flex items-center justify-end gap-1.5">
        <Button size="sm" variant="outline" onClick={() => copy(r.url)}>{copied === r.url ? 'Copied' : 'Copy link'}</Button>
        {r.status !== 'Signed' && <Button size="sm" variant="ghost" onClick={() => setDel(r)} aria-label="Delete"><Icon name="trash" size={14} /></Button>}
      </div>) },
  ];
  return (
    <Layout title="Contracts" count={rows.length} actions={<Button variant="brand" onClick={() => { setErr(null); setRes(null); setForm({ family_id: '', student_name: '', title: 'Enrollment Agreement 2026-2027', body: TEMPLATE, send_email: false }); }}><Icon name="plus" size={15} /> New Contract</Button>}>
      {res && (
        <Card className="p-4 mb-4">
          <div className="text-sm font-medium text-ink mb-1">Contract created — send this link to the family</div>
          <input readOnly value={res.url} onFocus={(e) => e.target.select()} aria-label="Contract link" className={`${inputCls} !text-xs`} />
          {res.emailed && <p className="text-xs text-teal mt-1.5">Email sent.</p>}
          {res.emailError && <p className="text-xs text-muted mt-1.5">{res.emailError}</p>}
        </Card>
      )}
      {rows.length === 0 ? <Card className="p-8 text-center text-sm text-muted">No contracts yet. Create an enrollment agreement and send the link — families sign online, no login needed.</Card> : <Card><Table cols={cols} rows={rows} /></Card>}
      {form && (
        <Modal title="New Contract" sub="Families sign by typing their name" onClose={() => setForm(null)} wide>
          {err && <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2 mb-3">{err}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Field label="Family"><select className={inputCls} value={form.family_id} onChange={set('family_id')}><option value="">Select family…</option>{families.map((f) => <option key={f.id} value={f.id}>{f.primary_guardian_name}</option>)}</select></Field>
            <Field label="Student (optional)"><input className={inputCls} value={form.student_name} onChange={set('student_name')} /></Field>
          </div>
          <Field label="Title"><input className={inputCls} value={form.title} onChange={set('title')} /></Field>
          <div className="mt-4"><Field label="Contract text"><textarea rows={9} className={inputCls} value={form.body} onChange={set('body')} /></Field></div>
          <label className="flex items-center gap-2 text-sm text-ink mt-3"><input type="checkbox" checked={!!form.send_email} onChange={(e) => setForm((v) => ({ ...v, send_email: e.target.checked }))} /> Also email the link to the family</label>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setForm(null)} disabled={busy}>Cancel</Button><Button variant="brand" onClick={create} disabled={busy || !form.family_id}>{busy ? 'Creating…' : 'Create & get link'}</Button></div>
        </Modal>
      )}
      {del && <ConfirmDialog title="Delete contract?" message={`Remove "${del.title}" for ${del.primary_guardian_name}? The link will stop working.`} onCancel={() => setDel(null)} onConfirm={async () => { await api.deleteContract(del.id); setDel(null); load(); }} />}
    </Layout>
  );
}
