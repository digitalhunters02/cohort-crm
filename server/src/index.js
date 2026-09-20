import express from 'express';
import cors from 'cors';
import { get, all, run, initSchema } from './db.js';

const app = express();
const PORT = process.env.PORT || 4340;

app.use(cors());
app.use(express.json());

// Wraps an async route handler so a rejected promise reaches Express's
// error handler instead of crashing the process or hanging the request.
const ar = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// "Today" the seed data's near-term dates are anchored to, so relative-date
// math (upcoming tours, overdue tuition, etc.) stays sensible regardless of
// when this app is actually opened.
const TODAY = '2026-09-15';

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function notFound(res, label) {
  return res.status(404).json({ error: `${label} not found` });
}

async function blockedByRefs(res, refs, id) {
  for (const [table, col, label] of refs) {
    const { count } = await get(`SELECT COUNT(*) AS count FROM ${table} WHERE ${col} = ?`, id);
    if (count > 0) {
      res.status(409).json({ error: `Cannot delete: linked to ${count} ${label} record(s). Remove those first.` });
      return true;
    }
  }
  return false;
}

// ---------- users (staff) ----------
async function selectUser(id) {
  return get(`SELECT * FROM users WHERE id = ?`, id);
}

app.get('/api/users', ar(async (req, res) => {
  res.json(await all(`SELECT * FROM users ORDER BY name`));
}));

app.post('/api/users', ar(async (req, res) => {
  const { name, email, role, initials, color } = req.body;
  if (!name || !email || !role || !initials || !color) {
    return badRequest(res, 'name, email, role, initials, and color are required');
  }
  try {
    const info = await run(`
      INSERT INTO users (name, email, role, initials, color) VALUES (?, ?, ?, ?, ?) RETURNING id
    `, name, email, role, initials, color);
    res.status(201).json(await selectUser(info.rows[0].id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.put('/api/users/:id', ar(async (req, res) => {
  const existing = await selectUser(req.params.id);
  if (!existing) return notFound(res, 'Staff member');
  const { name, email, role, initials, color } = req.body;
  if (!name || !email || !role || !initials || !color) {
    return badRequest(res, 'name, email, role, initials, and color are required');
  }
  try {
    await run(`
      UPDATE users SET name = ?, email = ?, role = ?, initials = ?, color = ? WHERE id = ?
    `, name, email, role, initials, color, req.params.id);
    res.json(await selectUser(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.delete('/api/users/:id', ar(async (req, res) => {
  const existing = await selectUser(req.params.id);
  if (!existing) return notFound(res, 'Staff member');
  const refs = [
    ['inquiries', 'owner_user_id', 'inquiry'],
    ['applicants', 'owner_user_id', 'applicant'],
    ['interviews', 'interviewer_user_id', 'interview'],
    ['activities', 'owner_user_id', 'activity'],
  ];
  if (await blockedByRefs(res, refs, req.params.id)) return;
  await run(`DELETE FROM users WHERE id = ?`, req.params.id);
  res.json({ ok: true });
}));

// ---------- inquiries ----------
async function selectInquiry(id) {
  return get(`
    SELECT i.*, u.name AS owner_name, u.initials AS owner_initials, u.color AS owner_color
    FROM inquiries i LEFT JOIN users u ON u.id = i.owner_user_id
    WHERE i.id = ?
  `, id);
}

app.get('/api/inquiries', ar(async (req, res) => {
  res.json(await all(`
    SELECT i.*, u.name AS owner_name, u.initials AS owner_initials, u.color AS owner_color
    FROM inquiries i LEFT JOIN users u ON u.id = i.owner_user_id
    ORDER BY i.created_at DESC
  `));
}));

app.post('/api/inquiries', ar(async (req, res) => {
  const { student_name, grade_applying_for, parent_name, parent_email, parent_phone, source, status, owner_user_id, notes } = req.body;
  if (!student_name || !grade_applying_for || !parent_name || !source) {
    return badRequest(res, 'student_name, grade_applying_for, parent_name, and source are required');
  }
  try {
    const info = await run(`
      INSERT INTO inquiries (student_name, grade_applying_for, parent_name, parent_email, parent_phone, source, status, owner_user_id, created_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `,
      student_name, grade_applying_for, parent_name, parent_email || null, parent_phone || null,
      source, status || 'New', owner_user_id || null, new Date().toISOString().slice(0, 10), notes || null
    );
    res.status(201).json(await selectInquiry(info.rows[0].id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.put('/api/inquiries/:id', ar(async (req, res) => {
  const existing = await selectInquiry(req.params.id);
  if (!existing) return notFound(res, 'Inquiry');
  const { student_name, grade_applying_for, parent_name, parent_email, parent_phone, source, status, owner_user_id, notes } = req.body;
  if (!student_name || !grade_applying_for || !parent_name || !source) {
    return badRequest(res, 'student_name, grade_applying_for, parent_name, and source are required');
  }
  try {
    await run(`
      UPDATE inquiries SET student_name = ?, grade_applying_for = ?, parent_name = ?, parent_email = ?, parent_phone = ?,
        source = ?, status = ?, owner_user_id = ?, notes = ?
      WHERE id = ?
    `,
      student_name, grade_applying_for, parent_name, parent_email || null, parent_phone || null,
      source, status || 'New', owner_user_id || null, notes || null, req.params.id
    );
    res.json(await selectInquiry(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.delete('/api/inquiries/:id', ar(async (req, res) => {
  const existing = await selectInquiry(req.params.id);
  if (!existing) return notFound(res, 'Inquiry');
  if (await blockedByRefs(res, [['applicants', 'inquiry_id', 'applicant']], req.params.id)) return;
  await run(`DELETE FROM inquiries WHERE id = ?`, req.params.id);
  res.json({ ok: true });
}));

// ---------- applicants ----------
async function selectApplicant(id) {
  return get(`
    SELECT a.*, u.name AS owner_name, u.initials AS owner_initials, u.color AS owner_color
    FROM applicants a LEFT JOIN users u ON u.id = a.owner_user_id
    WHERE a.id = ?
  `, id);
}

app.get('/api/applicants', ar(async (req, res) => {
  res.json(await all(`
    SELECT a.*, u.name AS owner_name, u.initials AS owner_initials, u.color AS owner_color
    FROM applicants a LEFT JOIN users u ON u.id = a.owner_user_id
    ORDER BY a.id DESC
  `));
}));

app.post('/api/applicants', ar(async (req, res) => {
  const { inquiry_id, student_name, grade_applying_for, parent_name, parent_email, parent_phone, stage, owner_user_id, application_date, decision_date, notes } = req.body;
  if (!student_name || !grade_applying_for || !parent_name) {
    return badRequest(res, 'student_name, grade_applying_for, and parent_name are required');
  }
  try {
    const info = await run(`
      INSERT INTO applicants (inquiry_id, student_name, grade_applying_for, parent_name, parent_email, parent_phone, stage, owner_user_id, application_date, decision_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `,
      inquiry_id || null, student_name, grade_applying_for, parent_name, parent_email || null, parent_phone || null,
      stage || 'Inquiry', owner_user_id || null, application_date || null, decision_date || null, notes || null
    );
    res.status(201).json(await selectApplicant(info.rows[0].id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.put('/api/applicants/:id', ar(async (req, res) => {
  const existing = await selectApplicant(req.params.id);
  if (!existing) return notFound(res, 'Applicant');
  const { inquiry_id, student_name, grade_applying_for, parent_name, parent_email, parent_phone, stage, owner_user_id, application_date, decision_date, notes } = req.body;
  if (!student_name || !grade_applying_for || !parent_name) {
    return badRequest(res, 'student_name, grade_applying_for, and parent_name are required');
  }
  try {
    await run(`
      UPDATE applicants SET inquiry_id = ?, student_name = ?, grade_applying_for = ?, parent_name = ?, parent_email = ?,
        parent_phone = ?, stage = ?, owner_user_id = ?, application_date = ?, decision_date = ?, notes = ?
      WHERE id = ?
    `,
      inquiry_id || null, student_name, grade_applying_for, parent_name, parent_email || null, parent_phone || null,
      stage || 'Inquiry', owner_user_id || null, application_date || null, decision_date || null, notes || null, req.params.id
    );
    res.json(await selectApplicant(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.patch('/api/applicants/:id/stage', ar(async (req, res) => {
  const { stage } = req.body;
  const valid = ['Inquiry', 'Tour Scheduled', 'Application Submitted', 'Interview Scheduled', 'Accepted', 'Waitlisted', 'Enrolled', 'Declined'];
  if (!valid.includes(stage)) return badRequest(res, 'Invalid stage');
  const existing = await selectApplicant(req.params.id);
  if (!existing) return notFound(res, 'Applicant');
  await run(`UPDATE applicants SET stage = ? WHERE id = ?`, stage, req.params.id);
  res.json(await selectApplicant(req.params.id));
}));

app.delete('/api/applicants/:id', ar(async (req, res) => {
  const existing = await selectApplicant(req.params.id);
  if (!existing) return notFound(res, 'Applicant');
  if (await blockedByRefs(res, [['interviews', 'applicant_id', 'interview']], req.params.id)) return;
  await run(`DELETE FROM applicants WHERE id = ?`, req.params.id);
  res.json({ ok: true });
}));

// ---------- tours & events ----------
async function selectTour(id) {
  return get(`SELECT * FROM tours_events WHERE id = ?`, id);
}

app.get('/api/tours-events', ar(async (req, res) => {
  res.json(await all(`SELECT * FROM tours_events ORDER BY date ASC`));
}));

app.post('/api/tours-events', ar(async (req, res) => {
  const { type, title, date, capacity, attendees_count, location, notes } = req.body;
  if (!type || !title || !date) return badRequest(res, 'type, title, and date are required');
  try {
    const info = await run(`
      INSERT INTO tours_events (type, title, date, capacity, attendees_count, location, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
    `, type, title, date, capacity === '' || capacity === undefined ? null : capacity, attendees_count || 0, location || null, notes || null);
    res.status(201).json(await selectTour(info.rows[0].id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.put('/api/tours-events/:id', ar(async (req, res) => {
  const existing = await selectTour(req.params.id);
  if (!existing) return notFound(res, 'Tour/event');
  const { type, title, date, capacity, attendees_count, location, notes } = req.body;
  if (!type || !title || !date) return badRequest(res, 'type, title, and date are required');
  try {
    await run(`
      UPDATE tours_events SET type = ?, title = ?, date = ?, capacity = ?, attendees_count = ?, location = ?, notes = ?
      WHERE id = ?
    `, type, title, date, capacity === '' || capacity === undefined ? null : capacity, attendees_count || 0, location || null, notes || null, req.params.id);
    res.json(await selectTour(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.delete('/api/tours-events/:id', ar(async (req, res) => {
  const existing = await selectTour(req.params.id);
  if (!existing) return notFound(res, 'Tour/event');
  await run(`DELETE FROM tours_events WHERE id = ?`, req.params.id);
  res.json({ ok: true });
}));

// ---------- interviews ----------
async function selectInterview(id) {
  return get(`
    SELECT iv.*, a.student_name AS applicant_name, a.grade_applying_for,
      u.name AS interviewer_name, u.initials AS interviewer_initials, u.color AS interviewer_color
    FROM interviews iv
    LEFT JOIN applicants a ON a.id = iv.applicant_id
    LEFT JOIN users u ON u.id = iv.interviewer_user_id
    WHERE iv.id = ?
  `, id);
}

app.get('/api/interviews', ar(async (req, res) => {
  res.json(await all(`
    SELECT iv.*, a.student_name AS applicant_name, a.grade_applying_for,
      u.name AS interviewer_name, u.initials AS interviewer_initials, u.color AS interviewer_color
    FROM interviews iv
    LEFT JOIN applicants a ON a.id = iv.applicant_id
    LEFT JOIN users u ON u.id = iv.interviewer_user_id
    ORDER BY iv.scheduled_at ASC
  `));
}));

app.post('/api/interviews', ar(async (req, res) => {
  const { applicant_id, interviewer_user_id, scheduled_at, status, notes } = req.body;
  if (!applicant_id || !scheduled_at) return badRequest(res, 'applicant_id and scheduled_at are required');
  try {
    const info = await run(`
      INSERT INTO interviews (applicant_id, interviewer_user_id, scheduled_at, status, notes)
      VALUES (?, ?, ?, ?, ?) RETURNING id
    `, applicant_id, interviewer_user_id || null, scheduled_at, status || 'Scheduled', notes || null);
    res.status(201).json(await selectInterview(info.rows[0].id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.put('/api/interviews/:id', ar(async (req, res) => {
  const existing = await selectInterview(req.params.id);
  if (!existing) return notFound(res, 'Interview');
  const { applicant_id, interviewer_user_id, scheduled_at, status, notes } = req.body;
  if (!applicant_id || !scheduled_at) return badRequest(res, 'applicant_id and scheduled_at are required');
  try {
    await run(`
      UPDATE interviews SET applicant_id = ?, interviewer_user_id = ?, scheduled_at = ?, status = ?, notes = ?
      WHERE id = ?
    `, applicant_id, interviewer_user_id || null, scheduled_at, status || 'Scheduled', notes || null, req.params.id);
    res.json(await selectInterview(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.delete('/api/interviews/:id', ar(async (req, res) => {
  const existing = await selectInterview(req.params.id);
  if (!existing) return notFound(res, 'Interview');
  await run(`DELETE FROM interviews WHERE id = ?`, req.params.id);
  res.json({ ok: true });
}));

// ---------- families ----------
async function selectFamily(id) {
  return get(`SELECT * FROM families WHERE id = ?`, id);
}

app.get('/api/families', ar(async (req, res) => {
  res.json(await all(`SELECT * FROM families ORDER BY primary_guardian_name`));
}));

app.post('/api/families', ar(async (req, res) => {
  const { primary_guardian_name, secondary_guardian_name, email, phone, address, notes } = req.body;
  if (!primary_guardian_name) return badRequest(res, 'primary_guardian_name is required');
  try {
    const info = await run(`
      INSERT INTO families (primary_guardian_name, secondary_guardian_name, email, phone, address, notes)
      VALUES (?, ?, ?, ?, ?, ?) RETURNING id
    `, primary_guardian_name, secondary_guardian_name || null, email || null, phone || null, address || null, notes || null);
    res.status(201).json(await selectFamily(info.rows[0].id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.put('/api/families/:id', ar(async (req, res) => {
  const existing = await selectFamily(req.params.id);
  if (!existing) return notFound(res, 'Family');
  const { primary_guardian_name, secondary_guardian_name, email, phone, address, notes } = req.body;
  if (!primary_guardian_name) return badRequest(res, 'primary_guardian_name is required');
  try {
    await run(`
      UPDATE families SET primary_guardian_name = ?, secondary_guardian_name = ?, email = ?, phone = ?, address = ?, notes = ?
      WHERE id = ?
    `, primary_guardian_name, secondary_guardian_name || null, email || null, phone || null, address || null, notes || null, req.params.id);
    res.json(await selectFamily(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.delete('/api/families/:id', ar(async (req, res) => {
  const existing = await selectFamily(req.params.id);
  if (!existing) return notFound(res, 'Family');
  const refs = [
    ['students', 'family_id', 'student'],
    ['tuition_invoices', 'family_id', 'tuition invoice'],
    ['financial_aid', 'family_id', 'financial aid'],
  ];
  if (await blockedByRefs(res, refs, req.params.id)) return;
  await run(`DELETE FROM families WHERE id = ?`, req.params.id);
  res.json({ ok: true });
}));

// ---------- students ----------
async function selectStudent(id) {
  return get(`
    SELECT s.*, f.primary_guardian_name, f.secondary_guardian_name
    FROM students s LEFT JOIN families f ON f.id = s.family_id
    WHERE s.id = ?
  `, id);
}

app.get('/api/students', ar(async (req, res) => {
  res.json(await all(`
    SELECT s.*, f.primary_guardian_name, f.secondary_guardian_name
    FROM students s LEFT JOIN families f ON f.id = s.family_id
    ORDER BY s.name
  `));
}));

app.post('/api/students', ar(async (req, res) => {
  const { name, grade, homeroom, family_id, enrollment_date, status } = req.body;
  if (!name || !grade || !family_id) return badRequest(res, 'name, grade, and family_id are required');
  try {
    const info = await run(`
      INSERT INTO students (name, grade, homeroom, family_id, enrollment_date, status)
      VALUES (?, ?, ?, ?, ?, ?) RETURNING id
    `, name, grade, homeroom || null, family_id, enrollment_date || new Date().toISOString().slice(0, 10), status || 'Active');
    res.status(201).json(await selectStudent(info.rows[0].id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.put('/api/students/:id', ar(async (req, res) => {
  const existing = await selectStudent(req.params.id);
  if (!existing) return notFound(res, 'Student');
  const { name, grade, homeroom, family_id, enrollment_date, status } = req.body;
  if (!name || !grade || !family_id) return badRequest(res, 'name, grade, and family_id are required');
  try {
    await run(`
      UPDATE students SET name = ?, grade = ?, homeroom = ?, family_id = ?, enrollment_date = ?, status = ?
      WHERE id = ?
    `, name, grade, homeroom || null, family_id, enrollment_date || existing.enrollment_date, status || 'Active', req.params.id);
    res.json(await selectStudent(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.delete('/api/students/:id', ar(async (req, res) => {
  const existing = await selectStudent(req.params.id);
  if (!existing) return notFound(res, 'Student');
  await run(`DELETE FROM students WHERE id = ?`, req.params.id);
  res.json({ ok: true });
}));

// ---------- tuition invoices ----------
async function selectInvoice(id) {
  return get(`
    SELECT t.*, f.primary_guardian_name
    FROM tuition_invoices t LEFT JOIN families f ON f.id = t.family_id
    WHERE t.id = ?
  `, id);
}

app.get('/api/tuition-invoices', ar(async (req, res) => {
  res.json(await all(`
    SELECT t.*, f.primary_guardian_name
    FROM tuition_invoices t LEFT JOIN families f ON f.id = t.family_id
    ORDER BY t.due_date ASC
  `));
}));

app.post('/api/tuition-invoices', ar(async (req, res) => {
  const { family_id, term, amount_due, amount_paid, due_date, status } = req.body;
  if (!family_id || !term || !amount_due || !due_date) {
    return badRequest(res, 'family_id, term, amount_due, and due_date are required');
  }
  try {
    const info = await run(`
      INSERT INTO tuition_invoices (family_id, term, amount_due, amount_paid, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?) RETURNING id
    `, family_id, term, amount_due, amount_paid || 0, due_date, status || 'Pending');
    res.status(201).json(await selectInvoice(info.rows[0].id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.put('/api/tuition-invoices/:id', ar(async (req, res) => {
  const existing = await selectInvoice(req.params.id);
  if (!existing) return notFound(res, 'Invoice');
  const { family_id, term, amount_due, amount_paid, due_date, status } = req.body;
  if (!family_id || !term || !amount_due || !due_date) {
    return badRequest(res, 'family_id, term, amount_due, and due_date are required');
  }
  try {
    await run(`
      UPDATE tuition_invoices SET family_id = ?, term = ?, amount_due = ?, amount_paid = ?, due_date = ?, status = ?
      WHERE id = ?
    `, family_id, term, amount_due, amount_paid || 0, due_date, status || 'Pending', req.params.id);
    res.json(await selectInvoice(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.delete('/api/tuition-invoices/:id', ar(async (req, res) => {
  const existing = await selectInvoice(req.params.id);
  if (!existing) return notFound(res, 'Invoice');
  await run(`DELETE FROM tuition_invoices WHERE id = ?`, req.params.id);
  res.json({ ok: true });
}));

// ---------- financial aid ----------
async function selectAid(id) {
  return get(`
    SELECT fa.*, f.primary_guardian_name
    FROM financial_aid fa LEFT JOIN families f ON f.id = fa.family_id
    WHERE fa.id = ?
  `, id);
}

app.get('/api/financial-aid', ar(async (req, res) => {
  res.json(await all(`
    SELECT fa.*, f.primary_guardian_name
    FROM financial_aid fa LEFT JOIN families f ON f.id = fa.family_id
    ORDER BY fa.id DESC
  `));
}));

app.post('/api/financial-aid', ar(async (req, res) => {
  const { family_id, program, amount_awarded, status, academic_year } = req.body;
  if (!family_id || !program || !academic_year) return badRequest(res, 'family_id, program, and academic_year are required');
  try {
    const info = await run(`
      INSERT INTO financial_aid (family_id, program, amount_awarded, status, academic_year)
      VALUES (?, ?, ?, ?, ?) RETURNING id
    `, family_id, program, amount_awarded === '' || amount_awarded === undefined ? null : amount_awarded, status || 'Under Review', academic_year);
    res.status(201).json(await selectAid(info.rows[0].id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.put('/api/financial-aid/:id', ar(async (req, res) => {
  const existing = await selectAid(req.params.id);
  if (!existing) return notFound(res, 'Financial aid record');
  const { family_id, program, amount_awarded, status, academic_year } = req.body;
  if (!family_id || !program || !academic_year) return badRequest(res, 'family_id, program, and academic_year are required');
  try {
    await run(`
      UPDATE financial_aid SET family_id = ?, program = ?, amount_awarded = ?, status = ?, academic_year = ?
      WHERE id = ?
    `, family_id, program, amount_awarded === '' || amount_awarded === undefined ? null : amount_awarded, status || 'Under Review', academic_year, req.params.id);
    res.json(await selectAid(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.delete('/api/financial-aid/:id', ar(async (req, res) => {
  const existing = await selectAid(req.params.id);
  if (!existing) return notFound(res, 'Financial aid record');
  await run(`DELETE FROM financial_aid WHERE id = ?`, req.params.id);
  res.json({ ok: true });
}));

// ---------- activities ----------
app.get('/api/activities', ar(async (req, res) => {
  res.json(await all(`
    SELECT ac.*, u.name AS owner_name, u.initials AS owner_initials, u.color AS owner_color
    FROM activities ac LEFT JOIN users u ON u.id = ac.owner_user_id
    ORDER BY ac.occurred_at DESC
  `));
}));

app.post('/api/activities', ar(async (req, res) => {
  const { type, subject, related_type, related_id, owner_user_id, occurred_at, notes } = req.body;
  if (!type || !subject) return badRequest(res, 'type and subject are required');
  try {
    const info = await run(`
      INSERT INTO activities (type, subject, related_type, related_id, owner_user_id, occurred_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
    `, type, subject, related_type || null, related_id || null, owner_user_id || null, occurred_at || new Date().toISOString(), notes || null);
    res.status(201).json(await get(`SELECT * FROM activities WHERE id = ?`, info.rows[0].id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.delete('/api/activities/:id', ar(async (req, res) => {
  const existing = await get(`SELECT * FROM activities WHERE id = ?`, req.params.id);
  if (!existing) return notFound(res, 'Activity');
  await run(`DELETE FROM activities WHERE id = ?`, req.params.id);
  res.json({ ok: true });
}));

// ---------- automations ----------
app.get('/api/automations', ar(async (req, res) => {
  res.json(await all(`SELECT * FROM automations ORDER BY runs_30d DESC`));
}));

app.post('/api/automations', ar(async (req, res) => {
  const { name, trigger_desc, action_desc, active } = req.body;
  if (!name || !trigger_desc || !action_desc) return badRequest(res, 'name, trigger_desc, and action_desc are required');
  try {
    const info = await run(`
      INSERT INTO automations (name, trigger_desc, action_desc, active, runs_30d)
      VALUES (?, ?, ?, ?, 0) RETURNING id
    `, name, trigger_desc, action_desc, active === false ? 0 : 1);
    res.status(201).json(await get(`SELECT * FROM automations WHERE id = ?`, info.rows[0].id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

app.patch('/api/automations/:id/toggle', ar(async (req, res) => {
  const existing = await get(`SELECT * FROM automations WHERE id = ?`, req.params.id);
  if (!existing) return notFound(res, 'Automation');
  await run(`UPDATE automations SET active = ? WHERE id = ?`, existing.active ? 0 : 1, req.params.id);
  res.json(await get(`SELECT * FROM automations WHERE id = ?`, req.params.id));
}));

app.delete('/api/automations/:id', ar(async (req, res) => {
  const existing = await get(`SELECT * FROM automations WHERE id = ?`, req.params.id);
  if (!existing) return notFound(res, 'Automation');
  await run(`DELETE FROM automations WHERE id = ?`, req.params.id);
  res.json({ ok: true });
}));

// ---------- dashboard ----------
app.get('/api/dashboard', ar(async (req, res) => {
  const openInquiries = await get(`
    SELECT COUNT(*) AS count FROM inquiries WHERE status NOT IN ('Converted', 'Closed')
  `);

  const inPipeline = await get(`
    SELECT COUNT(*) AS count FROM applicants WHERE stage NOT IN ('Enrolled', 'Declined')
  `);

  // SQLite's date(?, '+7 days') becomes Postgres date arithmetic; cast back
  // to text so the comparison matches the 'YYYY-MM-DD' TEXT column as before.
  const toursThisWeek = await get(`
    SELECT COUNT(*) AS count FROM tours_events WHERE date >= ? AND date < (?::date + INTERVAL '7 days')::date::text
  `, TODAY, TODAY);

  const enrolledStudents = await get(`
    SELECT COUNT(*) AS count FROM students WHERE status = 'Active'
  `);

  const overdueTuition = await get(`
    SELECT COALESCE(SUM(amount_due - amount_paid), 0) AS total, COUNT(*) AS count
    FROM tuition_invoices WHERE status = 'Overdue'
  `);

  const pipelineByStage = await all(`
    SELECT stage, COUNT(*) AS count FROM applicants GROUP BY stage
  `);

  const upcomingInterviews = await all(`
    SELECT iv.id, iv.scheduled_at, a.student_name AS applicant_name, a.grade_applying_for,
      u.name AS interviewer_name
    FROM interviews iv
    LEFT JOIN applicants a ON a.id = iv.applicant_id
    LEFT JOIN users u ON u.id = iv.interviewer_user_id
    WHERE iv.status = 'Scheduled'
    ORDER BY iv.scheduled_at ASC
    LIMIT 6
  `);

  const upcomingTours = await all(`
    SELECT id, type, title, date, location, capacity, attendees_count
    FROM tours_events
    WHERE date >= ?
    ORDER BY date ASC
    LIMIT 6
  `, TODAY);

  const recentActivity = await all(`
    SELECT ac.id, ac.type, ac.subject, ac.occurred_at, ac.related_type,
      u.name AS owner_name, u.initials AS owner_initials, u.color AS owner_color
    FROM activities ac LEFT JOIN users u ON u.id = ac.owner_user_id
    ORDER BY ac.occurred_at DESC
    LIMIT 8
  `);

  const inquiriesBySource = await all(`
    SELECT source, COUNT(*) AS count FROM inquiries GROUP BY source ORDER BY count DESC
  `);

  res.json({
    openInquiries, inPipeline, toursThisWeek, enrolledStudents, overdueTuition,
    pipelineByStage, upcomingInterviews, upcomingTours, recentActivity, inquiriesBySource,
  });
}));

// ---------- reports ----------
app.get('/api/reports', ar(async (req, res) => {
  const funnelByStage = await all(`
    SELECT stage, COUNT(*) AS count FROM applicants GROUP BY stage
  `);

  const tuitionSummary = await get(`
    SELECT COALESCE(SUM(amount_due), 0) AS total_due, COALESCE(SUM(amount_paid), 0) AS total_paid
    FROM tuition_invoices
  `);

  const tuitionByStatus = await all(`
    SELECT status, COUNT(*) AS count, COALESCE(SUM(amount_due - amount_paid), 0) AS outstanding
    FROM tuition_invoices GROUP BY status
  `);

  const inquiriesBySource = await all(`
    SELECT source, COUNT(*) AS count FROM inquiries GROUP BY source ORDER BY count DESC
  `);

  const aidByStatus = await all(`
    SELECT status, COUNT(*) AS count, COALESCE(SUM(amount_awarded), 0) AS total_awarded
    FROM financial_aid GROUP BY status
  `);

  const studentsByGrade = await all(`
    SELECT grade, COUNT(*) AS count FROM students WHERE status = 'Active' GROUP BY grade
  `);

  const enrollmentConversion = await get(`
    SELECT
      (SELECT COUNT(*) FROM inquiries) AS inquiries,
      (SELECT COUNT(*) FROM applicants) AS applicants,
      (SELECT COUNT(*) FROM applicants WHERE stage = 'Enrolled') AS enrolled
  `);

  res.json({
    funnelByStage, tuitionSummary, tuitionByStatus, inquiriesBySource, aidByStatus,
    studentsByGrade, enrollmentConversion,
  });
}));

initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Cohort API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  });
