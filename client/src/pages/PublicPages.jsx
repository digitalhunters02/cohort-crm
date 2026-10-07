import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api.js';
import { BRAND, BrandLogo } from '../auth/brand.jsx';
import { longDate, money } from '../format.js';

// Páginas abertas às famílias e professores (sem login).
function Shell({ title, sub, children }) {
  return (
    <div className="min-h-[100dvh] bg-wash px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BrandLogo size={40} />
          <div>
            <div className={`${BRAND.titleFont} text-xl font-semibold text-ink`}>{title || BRAND.name}</div>
            {sub && <div className="text-xs text-muted">{sub}</div>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
const box = 'bg-white border border-line rounded-xl shadow-sm p-5';
const inputCls = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink';
const btn = 'inline-flex items-center rounded-lg bg-brand text-white text-sm font-medium px-4 py-2 hover:brightness-110 disabled:opacity-50';
const errCls = 'text-sm text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2';

function useLoad(fn, deps) {
  const [data, setData] = useState(null); const [error, setError] = useState(null);
  useEffect(() => { fn().then(setData).catch((e) => setError(e.message)); }, deps); // eslint-disable-line
  return [data, error, setData];
}

export function Apply() {
  const [info, infoErr] = useLoad(() => api.publicApplyInfo(), []);
  const [v, setV] = useState({ student_name: '', grade: '', parent_name: '', parent_email: '', parent_phone: '', message: '', website: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(null); const [done, setDone] = useState(false);
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  async function submit(e) { e.preventDefault(); setBusy(true); setErr(null); try { await api.publicApply(v); setDone(true); } catch (x) { setErr(x.message); } finally { setBusy(false); } }
  return (
    <Shell title={info?.school ? `Apply to ${info.school}` : 'Request information'} sub="Tell us about your child and we will be in touch">
      <div className={box}>
        {infoErr && <p className="text-sm text-muted">This form is not available right now.</p>}
        {!info && !infoErr && <p className="text-sm text-muted">Loading…</p>}
        {info && done && <p className="text-sm text-ink" data-testid="apply-done">Thank you! We received your request and will contact you soon.</p>}
        {info && !done && (
          <form onSubmit={submit} className="space-y-3">
            {err && <p className={errCls}>{err}</p>}
            <input className={inputCls} placeholder="Student full name" aria-label="Student full name" value={v.student_name} onChange={set('student_name')} required />
            <select className={inputCls} aria-label="Grade" value={v.grade} onChange={set('grade')} required>
              <option value="">Grade applying for…</option>
              {info.grades.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <input className={inputCls} placeholder="Parent / guardian name" aria-label="Parent name" value={v.parent_name} onChange={set('parent_name')} required />
            <input className={inputCls} type="email" placeholder="Email" aria-label="Email" value={v.parent_email} onChange={set('parent_email')} required />
            <input className={inputCls} type="tel" placeholder="Phone (optional)" aria-label="Phone" value={v.parent_phone} onChange={set('parent_phone')} />
            <textarea className={inputCls} rows={3} placeholder="Anything you would like us to know (optional)" aria-label="Message" value={v.message} onChange={set('message')} />
            <input tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={v.website} onChange={set('website')} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
            <button className={btn} disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
          </form>
        )}
      </div>
    </Shell>
  );
}

const ITEMS = [['academics', 'Academic ability'], ['character', 'Character & integrity'], ['leadership', 'Leadership & collaboration'], ['potential', 'Potential for growth']];
export function Recommend() {
  const { token } = useParams();
  const [r, error] = useLoad(() => api.publicRecommendation(token), [token]);
  const [ratings, setRatings] = useState({}); const [recommend, setRecommend] = useState(''); const [comments, setComments] = useState(''); const [name, setName] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(null); const [done, setDone] = useState(false);
  async function submit() { setBusy(true); setErr(null); try { await api.publicRecommend(token, { ratings, recommend, comments, name }); setDone(true); } catch (x) { setErr(x.message); } finally { setBusy(false); } }
  return (
    <Shell title="Teacher recommendation" sub={r?.school || undefined}>
      <div className={box}>
        {error && <p className="text-sm text-muted">{error}</p>}
        {!r && !error && <p className="text-sm text-muted">Loading…</p>}
        {r && (done || r.status === 'Received') && <p className="text-sm text-ink" data-testid="rec-done">Thank you — your recommendation for {r.student_name} was received.</p>}
        {r && !done && r.status !== 'Received' && (
          <div className="space-y-4">
            <p className="text-sm text-ink">Hello {r.recommender_name}, please tell us about <b>{r.student_name}</b>, who is applying for <b>{r.grade}</b>.</p>
            {err && <p className={errCls}>{err}</p>}
            {ITEMS.map(([k, label]) => (
              <div key={k}>
                <div className="text-xs font-medium text-muted mb-1">{label}</div>
                <div className="flex gap-1.5">{[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-label={`${label} ${n}`} aria-pressed={ratings[k] === n} onClick={() => setRatings((x) => ({ ...x, [k]: n }))}
                    className={`w-9 h-9 rounded-lg border text-sm font-medium ${ratings[k] === n ? 'bg-brand text-white border-brand' : 'bg-white border-line text-ink'}`}>{n}</button>))}</div>
              </div>
            ))}
            <select className={inputCls} aria-label="Overall recommendation" value={recommend} onChange={(e) => setRecommend(e.target.value)}>
              <option value="">Overall recommendation…</option>
              <option value="strongly">Strongly recommend</option><option value="yes">Recommend</option><option value="reservations">Recommend with reservations</option>
            </select>
            <textarea className={inputCls} rows={4} placeholder="Comments" aria-label="Comments" value={comments} onChange={(e) => setComments(e.target.value)} />
            <input className={inputCls} placeholder="Your full name (acts as your signature)" aria-label="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
            <button className={btn} disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Submit recommendation'}</button>
          </div>
        )}
      </div>
    </Shell>
  );
}

export function Portal() {
  const { token } = useParams();
  const [d, error] = useLoad(() => api.publicFamily(token), [token]);
  return (
    <Shell title={d?.school || 'Family portal'} sub={d ? `${d.family} family` : undefined}>
      {error && <div className={box}><p className="text-sm text-muted">{error}</p></div>}
      {!d && !error && <div className={box}><p className="text-sm text-muted">Loading…</p></div>}
      {d && (
        <div className="space-y-4">
          <div className={box}>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Students</div>
            {d.students.length === 0 ? <p className="text-sm text-muted">No students on file.</p> : d.students.map((s) => <div key={s.name} className="text-sm text-ink py-0.5">{s.name} <span className="text-muted">· {s.grade}</span></div>)}
          </div>
          <div className={box}>
            <div className="flex flex-wrap gap-4 mb-3">
              <div><div className="text-[11px] text-muted">Total</div><div className="font-semibold text-ink">{money(d.totals.due)}</div></div>
              <div><div className="text-[11px] text-muted">Paid</div><div className="font-semibold text-ink">{money(d.totals.paid)}</div></div>
              <div><div className="text-[11px] text-muted">Balance</div><div className="font-semibold text-ink" data-testid="portal-balance">{money(d.totals.balance)}</div></div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] text-muted"><th className="py-1 pr-3">Term</th><th className="pr-3">Due</th><th className="pr-3">Balance</th><th>Status</th></tr></thead>
              <tbody>{d.invoices.map((i, n) => <tr key={n} className="border-t border-line"><td className="py-1.5 pr-3 text-ink">{i.term}</td><td className="pr-3">{longDate(i.due_date)}</td><td className="pr-3">{money(i.balance)}</td><td>{i.status}</td></tr>)}</tbody>
            </table></div>
          </div>
          {d.contracts.length > 0 && (
            <div className={box}>
              <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Documents</div>
              {d.contracts.map((c) => <div key={c.token} className="flex items-center justify-between text-sm py-1"><span>{c.title}</span>{c.status === 'Signed' ? <span className="text-muted">Signed</span> : <a className="text-brand font-medium hover:underline" href={`#/contract/${c.token}`}>Review &amp; sign</a>}</div>)}
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

export function Contract() {
  const { token } = useParams();
  const [c, error] = useLoad(() => api.publicContract(token), [token]);
  const [name, setName] = useState(''); const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(null); const [done, setDone] = useState(false);
  async function sign() { setBusy(true); setErr(null); try { await api.publicSign(token, { name, agree }); setDone(true); } catch (x) { setErr(x.message); } finally { setBusy(false); } }
  return (
    <Shell title={c?.school || 'Enrollment document'} sub={c ? `${c.family} family${c.student_name ? ` · ${c.student_name}` : ''}` : undefined}>
      <div className={box}>
        {error && <p className="text-sm text-muted">{error}</p>}
        {!c && !error && <p className="text-sm text-muted">Loading…</p>}
        {c && (
          <>
            <h2 className={`${BRAND.titleFont} text-base font-semibold text-ink mb-2`}>{c.title}</h2>
            <div className="text-sm text-ink whitespace-pre-wrap border border-line rounded-lg p-3 bg-wash max-h-80 overflow-y-auto">{c.body}</div>
            {(done || c.status === 'Signed') ? (
              <p className="mt-4 text-sm text-ink" data-testid="signed">Signed{c.signed_by ? ` by ${c.signed_by}` : ''} — thank you.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {err && <p className={errCls}>{err}</p>}
                <label className="flex items-start gap-2 text-sm text-ink"><input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-label="I agree" /> I have read and agree to the terms above.</label>
                <input className={inputCls} placeholder="Type your full name to sign" aria-label="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
                <button className={btn} disabled={busy} onClick={sign}>{busy ? 'Signing…' : 'Sign document'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
