// Recursos de Cohort que vencem a concorrência (por plano):
//   Professional: inscrição online pública (cai em Inquiries), recomendação de professor por link, vagas x matrículas por série
//   Complete: plano de parcelas da mensalidade, portal da família (somente leitura), contrato de matrícula com assinatura online
import crypto from 'node:crypto';
import { get, all, run } from './db.js';
import * as billing from './billing.js';
import { sendLinkEmail, isMailConfigured } from './mailer.js';

const ar = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').trim().slice(0, n);
const cleanLine = (v, n) => clean(v, n).replace(/[\r\n]+/g, ' ');
const todayISO = () => new Date().toISOString().slice(0, 10);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const newToken = () => crypto.randomBytes(24).toString('base64url');
const baseUrl = () => (process.env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/+$/, '');
const featureOn = async (f) => billing.allowsFeature(await billing.effectivePlan(), f);
const off = (res) => res.status(404).json({ error: 'Not available on this plan.', code: 'plan_required' });

function limiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now(); const key = req.ip || 'x';
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: 'Too many requests. Try again later.', code: 'rate_limited' });
    arr.push(now); hits.set(key, arr);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    next();
  };
}
const applyLimiter = limiter(8, 60 * 60 * 1000);
const publicLimiter = limiter(40, 60 * 60 * 1000);

export const GRADES = ['Pre-K', 'Kindergarten', ...Array.from({ length: 12 }, (_, i) => `${i + 1}${['st', 'nd', 'rd'][i] || 'th'} Grade`)];
const gradeKey = (g) => String(g || '').trim().toLowerCase();

// ---------------------------------------------------------------- públicas (sem login)
export function mountCohortPublic(app) {
  app.get('/api/public/apply', publicLimiter, ar(async (_req, res) => {
    if (!(await featureOn('online_application'))) return off(res);
    res.json({ school: process.env.COMPANY_NAME || null, grades: GRADES });
  }));
  app.post('/api/public/apply', applyLimiter, ar(async (req, res) => {
    if (!(await featureOn('online_application'))) return off(res);
    const b = req.body || {};
    if (b.website) return res.json({ ok: true }); // isca para robôs
    const student = cleanLine(b.student_name, 80), parent = cleanLine(b.parent_name, 80);
    const email = cleanLine(b.parent_email, 120).toLowerCase(), phone = cleanLine(b.parent_phone, 30);
    const grade = cleanLine(b.grade, 40);
    if (student.length < 2 || parent.length < 2) return res.status(400).json({ error: 'Please enter the student and parent names.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!grade) return res.status(400).json({ error: 'Please choose the grade.' });
    const dup = await get(`SELECT id FROM inquiries WHERE lower(parent_email) = ? AND lower(student_name) = ? AND created_at >= ?`,
      [email, student.toLowerCase(), new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)]);
    if (!dup) {
      await run(`INSERT INTO inquiries (student_name, grade_applying_for, parent_name, parent_email, parent_phone, source, status, owner_user_id, created_at, notes)
        VALUES (?, ?, ?, ?, ?, 'Website form', 'New', NULL, ?, ?)`, [student, grade, parent, email, phone || null, todayISO(), clean(b.message, 1000) || null]);
    }
    res.status(201).json({ ok: true });
  }));

  // recomendação do professor
  const recByToken = (token) => (TOKEN_RE.test(String(token || '')) ? get(`SELECT r.*, a.student_name, a.grade_applying_for FROM recommendations r JOIN applicants a ON a.id = r.applicant_id WHERE r.token = ?`, [token]) : null);
  app.get('/api/public/recommendation/:token', publicLimiter, ar(async (req, res) => {
    if (!(await featureOn('recommendations'))) return off(res);
    const r = await recByToken(req.params.token);
    if (!r) return res.status(404).json({ error: 'This recommendation link is not valid.' });
    res.json({ school: process.env.COMPANY_NAME || null, student_name: r.student_name, grade: r.grade_applying_for, recommender_name: r.recommender_name, status: r.status });
  }));
  app.post('/api/public/recommendation/:token', publicLimiter, ar(async (req, res) => {
    if (!(await featureOn('recommendations'))) return off(res);
    const r = await recByToken(req.params.token);
    if (!r) return res.status(404).json({ error: 'This recommendation link is not valid.' });
    if (r.status === 'Received') return res.status(409).json({ error: 'This recommendation was already sent. Thank you!', code: 'already_sent' });
    const ratings = {};
    for (const k of ['academics', 'character', 'leadership', 'potential']) {
      const n = Number(req.body?.ratings?.[k]);
      if (!(n >= 1 && n <= 5)) return res.status(400).json({ error: 'Please rate every item from 1 to 5.' });
      ratings[k] = Math.round(n);
    }
    const recommend = ['strongly', 'yes', 'reservations'].includes(req.body?.recommend) ? req.body.recommend : null;
    if (!recommend) return res.status(400).json({ error: 'Please choose your overall recommendation.' });
    const name = cleanLine(req.body?.name, 80);
    if (name.length < 2) return res.status(400).json({ error: 'Please type your name.' });
    await run(`UPDATE recommendations SET status = 'Received', ratings = ?, recommend = ?, comments = ?, signed_by = ?, submitted_at = now() WHERE id = ?`,
      [JSON.stringify(ratings), recommend, clean(req.body?.comments, 3000) || null, name, r.id]);
    res.json({ ok: true });
  }));

  // portal da família (somente leitura)
  app.get('/api/public/family/:token', publicLimiter, ar(async (req, res) => {
    if (!(await featureOn('family_portal'))) return off(res);
    const token = String(req.params.token || '');
    const f = TOKEN_RE.test(token) ? await get(`SELECT id, primary_guardian_name FROM families WHERE portal_token = ?`, [token]) : null;
    if (!f) return res.status(404).json({ error: 'This family link is not valid.' });
    const students = await all(`SELECT name, grade, status FROM students WHERE family_id = ? ORDER BY name`, [f.id]);
    const invoices = (await all(`SELECT term, amount_due, amount_paid, due_date, status FROM tuition_invoices WHERE family_id = ? ORDER BY due_date`, [f.id]))
      .map((i) => ({ ...i, balance: Math.max(0, i.amount_due - i.amount_paid) }));
    const contracts = await all(`SELECT title, status, token FROM contracts WHERE family_id = ? ORDER BY id DESC`, [f.id]);
    const sum = (k) => invoices.reduce((a, i) => a + i[k], 0);
    res.json({ school: process.env.COMPANY_NAME || null, family: f.primary_guardian_name, students, invoices, contracts,
      totals: { due: sum('amount_due'), paid: sum('amount_paid'), balance: sum('balance') } });
  }));

  // contrato de matrícula com assinatura online
  const contractByToken = (token) => (TOKEN_RE.test(String(token || '')) ? get(`SELECT c.*, f.primary_guardian_name FROM contracts c JOIN families f ON f.id = c.family_id WHERE c.token = ?`, [token]) : null);
  app.get('/api/public/contract/:token', publicLimiter, ar(async (req, res) => {
    if (!(await featureOn('enrollment_contract'))) return off(res);
    const c = await contractByToken(req.params.token);
    if (!c) return res.status(404).json({ error: 'This contract link is not valid.' });
    res.json({ school: process.env.COMPANY_NAME || null, title: c.title, body: c.body, student_name: c.student_name, family: c.primary_guardian_name, status: c.status, signed_by: c.signed_by, signed_at: c.signed_at });
  }));
  app.post('/api/public/contract/:token', publicLimiter, ar(async (req, res) => {
    if (!(await featureOn('enrollment_contract'))) return off(res);
    const c = await contractByToken(req.params.token);
    if (!c) return res.status(404).json({ error: 'This contract link is not valid.' });
    if (c.status === 'Signed') return res.status(409).json({ error: 'This contract was already signed.', code: 'already_signed' });
    const name = cleanLine(req.body?.name, 80);
    if (name.length < 2) return res.status(400).json({ error: 'Please type your full name to sign.' });
    if (req.body?.agree !== true) return res.status(400).json({ error: 'Please confirm that you agree to the terms.' });
    await run(`UPDATE contracts SET status = 'Signed', signed_by = ?, signed_at = now() WHERE id = ?`, [name, c.id]);
    res.json({ ok: true });
  }));
}

// ---------------------------------------------------------------- depois do login
function addMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d, last))).toISOString().slice(0, 10);
}
export function buildSchedule({ term, total, installments, first_due_date }) {
  const base = Math.floor(total / installments); const rest = total - base * installments;
  return Array.from({ length: installments }, (_, i) => ({
    term: `${term} · ${i + 1}/${installments}`,
    amount_due: base + (i === installments - 1 ? rest : 0),
    due_date: addMonths(first_due_date, i),
  }));
}

export function mountCohortPro(app) {
  // ---- recomendação: pedir ao professor e ver respostas ----
  app.get('/api/applicants/:id/recommendations', billing.requirePlan('essencial'), ar(async (req, res) => {
    const rows = await all(`SELECT id, recommender_name, recommender_email, token, status, ratings, recommend, comments, signed_by, submitted_at, created_at FROM recommendations WHERE applicant_id = ? ORDER BY id DESC`, [Number(req.params.id) || 0]);
    res.json(rows.map((r) => ({ ...r, ratings: r.ratings ? JSON.parse(r.ratings) : null, url: `${baseUrl()}/#/recommend/${r.token}` })));
  }));
  app.post('/api/applicants/:id/recommendations', billing.requirePlan('essencial'), ar(async (req, res) => {
    const a = await get(`SELECT id, student_name FROM applicants WHERE id = ?`, [Number(req.params.id) || 0]);
    if (!a) return res.status(404).json({ error: 'Applicant not found' });
    const name = cleanLine(req.body?.recommender_name, 80), email = cleanLine(req.body?.recommender_email, 120).toLowerCase();
    if (name.length < 2) return res.status(400).json({ error: 'Please enter the teacher\'s name.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    const token = newToken();
    const id = (await run(`INSERT INTO recommendations (applicant_id, recommender_name, recommender_email, token, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id`, [a.id, name, email, token, todayISO()])).rows[0].id;
    const url = `${baseUrl()}/#/recommend/${token}`;
    let emailed = false; let emailError = null;
    if (!isMailConfigured()) emailError = 'Email is not set up yet — copy the link and send it yourself.';
    else { try { emailed = await sendLinkEmail(email, { subject: `Recommendation request for ${a.student_name}`, intro: `${a.student_name} is applying to our school. We would be grateful for your recommendation.`, url, cta: 'Write the recommendation' }); } catch { emailError = 'The email could not be sent. Copy the link instead.'; } }
    res.status(201).json({ id, token, url, emailed, emailError });
  }));

  // ---- vagas x matrículas por série ----
  app.get('/api/seats', ar(async (_req, res) => {
    const caps = new Map((await all(`SELECT grade, seats FROM grade_capacity`)).map((c) => [gradeKey(c.grade), c]));
    const enrolled = await all(`SELECT grade, COUNT(*)::int AS n FROM students WHERE status = 'Active' GROUP BY grade`);
    const apps = await all(`SELECT grade_applying_for AS grade, stage, COUNT(*)::int AS n FROM applicants GROUP BY grade_applying_for, stage`);
    const labels = new Map();
    for (const g of [...GRADES, ...[...caps.values()].map((c) => c.grade), ...enrolled.map((e) => e.grade), ...apps.map((a) => a.grade)]) if (g && !labels.has(gradeKey(g))) labels.set(gradeKey(g), g);
    const IN_PROCESS = ['Inquiry', 'Tour Scheduled', 'Application Submitted', 'Interview Scheduled'];
    const rows = [...labels].map(([k, grade]) => {
      const e = enrolled.filter((x) => gradeKey(x.grade) === k).reduce((a, x) => a + x.n, 0);
      const at = (stages) => apps.filter((x) => gradeKey(x.grade) === k && stages.includes(x.stage)).reduce((a, x) => a + x.n, 0);
      const seats = caps.get(k)?.seats ?? null; const accepted = at(['Accepted']);
      return { grade, seats, enrolled: e, accepted, waitlisted: at(['Waitlisted']), inProcess: at(IN_PROCESS), open: seats === null ? null : seats - e - accepted };
    }).filter((r) => r.seats !== null || r.enrolled || r.accepted || r.waitlisted || r.inProcess)
      .sort((a, b) => GRADES.findIndex((g) => gradeKey(g) === gradeKey(a.grade)) - GRADES.findIndex((g) => gradeKey(g) === gradeKey(b.grade)));
    const t = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
    res.json({ grades: GRADES, rows, totals: { seats: t('seats'), enrolled: t('enrolled'), accepted: t('accepted'), open: t('open') } });
  }));
  app.put('/api/seats/:grade', ar(async (req, res) => {
    const grade = cleanLine(req.params.grade, 40); const seats = Math.floor(Number(req.body?.seats));
    if (!grade) return res.status(400).json({ error: 'grade is required' });
    if (!(seats >= 0 && seats <= 5000)) return res.status(400).json({ error: 'Seats must be a number from 0 to 5000.' });
    await run(`INSERT INTO grade_capacity (grade, seats) VALUES (?, ?) ON CONFLICT (grade) DO UPDATE SET seats = EXCLUDED.seats`, [grade, seats]);
    res.json({ grade, seats });
  }));

  // ---- plano de parcelas da mensalidade ----
  app.post('/api/tuition-plans', ar(async (req, res) => {
    const b = req.body || {};
    const family_id = Number(b.family_id); const total = Math.floor(Number(b.total)); const installments = Math.floor(Number(b.installments));
    const term = cleanLine(b.term, 60);
    if (!term) return res.status(400).json({ error: 'term is required' });
    if (!(total >= 1)) return res.status(400).json({ error: 'The total must be a positive number.' });
    if (!(installments >= 2 && installments <= 12)) return res.status(400).json({ error: 'Choose 2 to 12 installments.' });
    if (!ISO.test(b.first_due_date || '')) return res.status(400).json({ error: 'Choose the first due date.' });
    if (!(await get(`SELECT 1 FROM families WHERE id = ?`, [family_id]))) return res.status(400).json({ error: 'family_id does not reference a real family' });
    const schedule = buildSchedule({ term, total, installments, first_due_date: b.first_due_date });
    if (b.dry_run) return res.json({ schedule });
    for (const s of schedule) await run(`INSERT INTO tuition_invoices (family_id, term, amount_due, amount_paid, due_date, status) VALUES (?, ?, ?, 0, ?, 'Pending')`, [family_id, s.term, s.amount_due, s.due_date]);
    res.status(201).json({ schedule });
  }));

  // ---- portal da família ----
  app.post('/api/families/:id/portal-link', billing.requirePlan('completo'), ar(async (req, res) => {
    const f = await get(`SELECT id FROM families WHERE id = ?`, [Number(req.params.id) || 0]);
    if (!f) return res.status(404).json({ error: 'Family not found' });
    const token = newToken();
    await run(`UPDATE families SET portal_token = ? WHERE id = ?`, [token, f.id]);
    res.json({ token, url: `${baseUrl()}/#/portal/${token}` });
  }));

  // ---- contratos de matrícula ----
  app.get('/api/contracts', ar(async (_req, res) => {
    const rows = await all(`SELECT c.id, c.family_id, c.student_name, c.title, c.status, c.token, c.signed_by, c.signed_at, c.created_at, f.primary_guardian_name FROM contracts c JOIN families f ON f.id = c.family_id ORDER BY c.id DESC`);
    res.json(rows.map(({ token, ...r }) => ({ ...r, url: `${baseUrl()}/#/contract/${token}` })));
  }));
  app.post('/api/contracts', ar(async (req, res) => {
    const b = req.body || {};
    const family_id = Number(b.family_id); const title = cleanLine(b.title, 120); const body = clean(b.body, 20000);
    if (!title || body.length < 20) return res.status(400).json({ error: 'Please enter a title and the contract text.' });
    const fam = await get(`SELECT id, email FROM families WHERE id = ?`, [family_id]);
    if (!fam) return res.status(400).json({ error: 'family_id does not reference a real family' });
    const token = newToken();
    const id = (await run(`INSERT INTO contracts (family_id, student_name, title, body, token, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`, [family_id, cleanLine(b.student_name, 80), title, body, token, todayISO()])).rows[0].id;
    const url = `${baseUrl()}/#/contract/${token}`;
    let emailed = false; let emailError = null;
    if (b.send_email) {
      if (!fam.email) emailError = 'This family has no email address.';
      else if (!isMailConfigured()) emailError = 'Email is not set up yet — copy the link and send it yourself.';
      else { try { emailed = await sendLinkEmail(fam.email, { subject: title, intro: 'Please review and sign the document below.', url, cta: 'Review and sign' }); } catch { emailError = 'The email could not be sent. Copy the link instead.'; } }
    }
    res.status(201).json({ id, url, emailed, emailError });
  }));
  app.delete('/api/contracts/:id', ar(async (req, res) => {
    const c = await get(`SELECT id, status FROM contracts WHERE id = ?`, [Number(req.params.id) || 0]);
    if (!c) return res.status(404).json({ error: 'not found' });
    if (c.status === 'Signed') return res.status(409).json({ error: 'A signed contract cannot be deleted.' });
    await run(`DELETE FROM contracts WHERE id = ?`, [c.id]);
    res.status(204).end();
  }));
}
