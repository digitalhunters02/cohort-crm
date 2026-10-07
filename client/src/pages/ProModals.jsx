import { useEffect, useState } from 'react';
import api from '../api.js';
import { Card, CardHead, Badge, Button, Modal, Field, inputCls, Spinner } from '../components/ui.jsx';
import { money, longDate } from '../format.js';
import { usePlan } from '../plans/PlanContext.jsx';

const errBox = (e) => e && <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2 mb-3">{e}</div>;
const copyTo = (text, set) => navigator.clipboard?.writeText(text).then(() => { set(true); setTimeout(() => set(false), 1500); }).catch(() => {});

// Pedir recomendação a um professor e ver as respostas de um candidato.
export function RecommendationsModal({ applicant, onClose }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ recommender_name: '', recommender_email: '' });
  const [res, setRes] = useState(null); const [err, setErr] = useState(null); const [busy, setBusy] = useState(false); const [copied, setCopied] = useState(false);
  const load = () => api.recommendations(applicant.id).then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [applicant.id]); // eslint-disable-line
  async function send() { setBusy(true); setErr(null); try { setRes(await api.requestRecommendation(applicant.id, form)); setForm({ recommender_name: '', recommender_email: '' }); await load(); } catch (e) { setErr(e.message); } finally { setBusy(false); } }
  const REC = { strongly: 'Strongly recommends', yes: 'Recommends', reservations: 'Recommends with reservations' };
  return (
    <Modal title="Teacher recommendations" sub={applicant.student_name} onClose={onClose} wide>
      {errBox(err)}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Field label="Teacher name"><input className={inputCls} value={form.recommender_name} onChange={(e) => setForm((f) => ({ ...f, recommender_name: e.target.value }))} /></Field>
        <Field label="Teacher email"><input type="email" className={inputCls} value={form.recommender_email} onChange={(e) => setForm((f) => ({ ...f, recommender_email: e.target.value }))} /></Field>
      </div>
      <Button variant="brand" size="sm" onClick={send} disabled={busy}>{busy ? 'Creating…' : 'Create request link'}</Button>
      {res && (
        <div className="mt-3 p-3 rounded-lg bg-wash">
          <input readOnly value={res.url} onFocus={(e) => e.target.select()} aria-label="Recommendation link" className={`${inputCls} !text-xs`} />
          <div className="flex items-center gap-2 mt-2"><Button size="sm" variant="outline" onClick={() => copyTo(res.url, setCopied)}>{copied ? 'Copied' : 'Copy link'}</Button>
            <span className="text-xs text-muted">{res.emailed ? 'Email sent.' : res.emailError}</span></div>
        </div>
      )}
      <div className="mt-5 text-xs font-semibold text-muted uppercase tracking-wide mb-2">Requests</div>
      {!list ? <Spinner /> : list.length === 0 ? <p className="text-sm text-muted">No requests yet.</p> : list.map((r) => (
        <div key={r.id} className="border border-line rounded-lg p-3 mb-2 text-sm">
          <div className="flex items-center justify-between gap-2"><span className="font-medium text-ink">{r.recommender_name}</span><Badge tone={r.status === 'Received' ? 'green' : 'amber'}>{r.status}</Badge></div>
          {r.status === 'Received' && (
            <div className="mt-1.5 text-muted">
              <div>{REC[r.recommend]} · academics {r.ratings.academics}/5 · character {r.ratings.character}/5 · leadership {r.ratings.leadership}/5 · potential {r.ratings.potential}/5</div>
              {r.comments && <div className="mt-1 text-ink whitespace-pre-wrap">{r.comments}</div>}
            </div>
          )}
        </div>
      ))}
    </Modal>
  );
}

// Link do portal da família (somente leitura, sem login).
export function PortalLinkModal({ family, onClose }) {
  const [res, setRes] = useState(null); const [err, setErr] = useState(null); const [copied, setCopied] = useState(false);
  useEffect(() => { api.familyPortalLink(family.id).then(setRes).catch((e) => setErr(e.message)); }, [family.id]);
  return (
    <Modal title="Family portal link" sub={family.primary_guardian_name} onClose={onClose}>
      {errBox(err)}
      {!res && !err && <Spinner />}
      {res && (<>
        <p className="text-sm text-muted mb-3">The family sees their students, tuition balance and documents to sign — no login. A new link cancels the old one.</p>
        <input readOnly value={res.url} onFocus={(e) => e.target.select()} aria-label="Portal link" className={`${inputCls} !text-xs`} />
        <div className="mt-3"><Button size="sm" variant="brand" onClick={() => copyTo(res.url, setCopied)}>{copied ? 'Copied' : 'Copy link'}</Button></div>
      </>)}
    </Modal>
  );
}

// Divide a mensalidade em parcelas mensais (com prévia antes de criar).
export function PaymentPlanModal({ families, onClose, onCreated }) {
  const [v, setV] = useState({ family_id: '', term: '2026-2027 Tuition', total: '', installments: 10, first_due_date: '' });
  const [preview, setPreview] = useState(null); const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setPreview(null); setV((x) => ({ ...x, [k]: e.target.value })); };
  const body = () => ({ ...v, family_id: Number(v.family_id), total: Number(v.total), installments: Number(v.installments) });
  async function doPreview() { setBusy(true); setErr(null); try { setPreview((await api.tuitionPlan({ ...body(), dry_run: true })).schedule); } catch (e) { setErr(e.message); } finally { setBusy(false); } }
  async function create() { setBusy(true); setErr(null); try { await api.tuitionPlan(body()); onCreated(); } catch (e) { setErr(e.message); } finally { setBusy(false); } }
  return (
    <Modal title="Payment plan" sub="Split tuition into monthly installments" onClose={onClose} wide>
      {errBox(err)}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Family"><select className={inputCls} value={v.family_id} onChange={set('family_id')}><option value="">Select family…</option>{families.map((f) => <option key={f.id} value={f.id}>{f.primary_guardian_name}</option>)}</select></Field>
        <Field label="Term / name"><input className={inputCls} value={v.term} onChange={set('term')} /></Field>
        <Field label="Total tuition ($)"><input type="number" min="1" className={inputCls} value={v.total} onChange={set('total')} /></Field>
        <Field label="Installments (2–12)"><input type="number" min="2" max="12" className={inputCls} value={v.installments} onChange={set('installments')} /></Field>
        <Field label="First due date"><input type="date" className={inputCls} value={v.first_due_date} onChange={set('first_due_date')} /></Field>
      </div>
      <div className="mt-4 flex gap-2"><Button variant="outline" size="sm" onClick={doPreview} disabled={busy}>Preview</Button>{preview && <Button variant="brand" size="sm" onClick={create} disabled={busy}>{busy ? 'Creating…' : `Create ${preview.length} invoices`}</Button>}</div>
      {preview && (
        <div className="mt-4 overflow-x-auto"><table className="w-full text-sm" data-testid="plan-preview">
          <thead><tr className="text-left text-[11px] text-muted"><th className="py-1 pr-3">Invoice</th><th className="pr-3">Due</th><th>Amount</th></tr></thead>
          <tbody>{preview.map((s) => <tr key={s.term} className="border-t border-line"><td className="py-1.5 pr-3">{s.term}</td><td className="pr-3">{longDate(s.due_date)}</td><td>{money(s.amount_due)}</td></tr>)}</tbody>
        </table></div>
      )}
    </Modal>
  );
}

// Link público do formulário de inscrição (Configurações).
export function ApplyLinkCard() {
  const { allows } = usePlan();
  const on = allows('online_application');
  const url = `${window.location.origin}/#/apply`;
  const [copied, setCopied] = useState(false);
  return (
    <Card>
      <CardHead title="Online inquiry form" sub="A public page for families to request information. Requests land in Inquiries." />
      <div className="px-5 pb-5">
        {on ? (<>
          <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Inquiry form link" className={`${inputCls} !text-xs`} />
          <div className="mt-2 flex gap-2"><Button size="sm" variant="brand" onClick={() => copyTo(url, setCopied)}>{copied ? 'Copied' : 'Copy link'}</Button>
            <a className="inline-flex items-center rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-wash" href={url} target="_blank" rel="noreferrer">Open form</a></div>
        </>) : <p className="text-sm text-muted">Included in the Professional plan and above.</p>}
      </div>
    </Card>
  );
}
