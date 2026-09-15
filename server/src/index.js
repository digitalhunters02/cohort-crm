import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 4340;

app.use(cors());
app.use(express.json());

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

function blockedByRefs(res, refs, id) {
  for (const [table, col, label] of refs) {
    const { count } = db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${col} = ?`).get(id);
    if (count > 0) {
      res.status(409).json({ error: `Cannot delete: linked to ${count} ${label} record(s). Remove those first.` });
      return true;
    }
  }
  return false;
}

// ---------- users (staff) ----------
function selectUser(id) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
}

app.get('/api/users', (req, res) => {
  res.json(db.prepare(`SELECT * FROM users ORDER BY name`).all());
});

app.post('/api/users', (req, res) => {
  const { name, email, role, initials, color } = req.body;
  if (!name || !email || !role || !initials || !color) {
    return badRequest(res, 'name, email, role, initials, and color are required');
  }
  try {
    const info = db.prepare(`
      INSERT INTO users (name, email, role, initials, color) VALUES (?, ?, ?, ?, ?)
    `).run(name, email, role, initials, color);
    res.status(201).json(selectUser(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  const existing = selectUser(req.params.id);
  if (!existing) return notFound(res, 'Staff member');
  const { name, email, role, initials, color } = req.body;
  if (!name || !email || !role || !initials || !color) {
    return badRequest(res, 'name, email, role, initials, and color are required');
  }
  try {
    db.prepare(`
      UPDATE users SET name = ?, email = ?, role = ?, initials = ?, color = ? WHERE id = ?
    `).run(name, email, role, initials, color, req.params.id);
    res.json(selectUser(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  const existing = selectUser(req.params.id);
  if (!existing) return notFound(res, 'Staff member');
  const refs = [
    ['inquiries', 'owner_user_id', 'inquiry'],
    ['applicants', 'owner_user_id', 'applicant'],
    ['interviews', 'interviewer_user_id', 'interview'],
    ['activities', 'owner_user_id', 'activity'],
  ];
  if (blockedByRefs(res, refs, req.params.id)) return;
  db.prepare(`DELETE FROM users WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ---------- inquiries ----------
function selectInquiry(id) {
  return db.prepare(`
    SELECT i.*, u.name AS owner_name, u.initials AS owner_initials, u.color AS owner_color
    FROM inquiries i LEFT JOIN users u ON u.id = i.owner_user_id
    WHERE i.id = ?
  `).get(id);
}

app.get('/api/inquiries', (req, res) => {
  res.json(db.prepare(`
    SELECT i.*, u.name AS owner_name, u.initials AS owner_initials, u.color AS owner_color
    FROM inquiries i LEFT JOIN users u ON u.id = i.owner_user_id
    ORDER BY i.created_at DESC
  `).all());
});

app.post('/api/inquiries', (req, res) => {
  const { student_name, grade_applying_for, parent_name, parent_email, parent_phone, source, status, owner_user_id, notes } = req.body;
  if (!student_name || !grade_applying_for || !parent_name || !source) {
    return badRequest(res, 'student_name, grade_applying_for, parent_name, and source are required');
  }
  try {
    const info = db.prepare(`
      INSERT INTO inquiries (student_name, grade_applying_for, parent_name, parent_email, parent_phone, source, status, owner_user_id, created_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      student_name, grade_applying_for, parent_name, parent_email || null, parent_phone || null,
      source, status || 'New', owner_user_id || null, new Date().toISOString().slice(0, 10), notes || null
    );
    res.status(201).json(selectInquiry(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/inquiries/:id', (req, res) => {
  const existing = selectInquiry(req.params.id);
  if (!existing) return notFound(res, 'Inquiry');
  const { student_name, grade_applying_for, parent_name, parent_email, parent_phone, source, status, owner_user_id, notes } = req.body;
  if (!student_name || !grade_applying_for || !parent_name || !source) {
    return badRequest(res, 'student_name, grade_applying_for, parent_name, and source are required');
  }
  try {
    db.prepare(`
      UPDATE inquiries SET student_name = ?, grade_applying_for = ?, parent_name = ?, parent_email = ?, parent_phone = ?,
        source = ?, status = ?, owner_user_id = ?, notes = ?
      WHERE id = ?
    `).run(
      student_name, grade_applying_for, parent_name, parent_email || null, parent_phone || null,
      source, status || 'New', owner_user_id || null, notes || null, req.params.id
    );
    res.json(selectInquiry(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/inquiries/:id', (req, res) => {
  const existing = selectInquiry(req.params.id);
  if (!existing) return notFound(res, 'Inquiry');
  if (blockedByRefs(res, [['applicants', 'inquiry_id', 'applicant']], req.params.id)) return;
  db.prepare(`DELETE FROM inquiries WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ---------- applicants ----------
function selectApplicant(id) {
  return db.prepare(`
    SELECT a.*, u.name AS owner_name, u.initials AS owner_initials, u.color AS owner_color
    FROM applicants a LEFT JOIN users u ON u.id = a.owner_user_id
    WHERE a.id = ?
  `).get(id);
}

app.get('/api/applicants', (req, res) => {
  res.json(db.prepare(`
    SELECT a.*, u.name AS owner_name, u.initials AS owner_initials, u.color AS owner_color
    FROM applicants a LEFT JOIN users u ON u.id = a.owner_user_id
    ORDER BY a.id DESC
  `).all());
});

app.post('/api/applicants', (req, res) => {
  const { inquiry_id, student_name, grade_applying_for, parent_name, parent_email, parent_phone, stage, owner_user_id, application_date, decision_date, notes } = req.body;
  if (!student_name || !grade_applying_for || !parent_name) {
    return badRequest(res, 'student_name, grade_applying_for, and parent_name are required');
  }
  try {
    const info = db.prepare(`
      INSERT INTO applicants (inquiry_id, student_name, grade_applying_for, parent_name, parent_email, parent_phone, stage, owner_user_id, application_date, decision_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inquiry_id || null, student_name, grade_applying_for, parent_name, parent_email || null, parent_phone || null,
      stage || 'Inquiry', owner_user_id || null, application_date || null, decision_date || null, notes || null
    );
    res.status(201).json(selectApplicant(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/applicants/:id', (req, res) => {
  const existing = selectApplicant(req.params.id);
  if (!existing) return notFound(res, 'Applicant');
  const { inquiry_id, student_name, grade_applying_for, parent_name, parent_email, parent_phone, stage, owner_user_id, application_date, decision_date, notes } = req.body;
  if (!student_name || !grade_applying_for || !parent_name) {
    return badRequest(res, 'student_name, grade_applying_for, and parent_name are required');
  }
  try {
    db.prepare(`
      UPDATE applicants SET inquiry_id = ?, student_name = ?, grade_applying_for = ?, parent_name = ?, parent_email = ?,
        parent_phone = ?, stage = ?, owner_user_id = ?, application_date = ?, decision_date = ?, notes = ?
      WHERE id = ?
    `).run(
      inquiry_id || null, student_name, grade_applying_for, parent_name, parent_email || null, parent_phone || null,
      stage || 'Inquiry', owner_user_id || null, application_date || null, decision_date || null, notes || null, req.params.id
    );
    res.json(selectApplicant(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/applicants/:id/stage', (req, res) => {
  const { stage } = req.body;
  const valid = ['Inquiry', 'Tour Scheduled', 'Application Submitted', 'Interview Scheduled', 'Accepted', 'Waitlisted', 'Enrolled', 'Declined'];
  if (!valid.includes(stage)) return badRequest(res, 'Invalid stage');
  const existing = selectApplicant(req.params.id);
  if (!existing) return notFound(res, 'Applicant');
  db.prepare(`UPDATE applicants SET stage = ? WHERE id = ?`).run(stage, req.params.id);
  res.json(selectApplicant(req.params.id));
});

app.delete('/api/applicants/:id', (req, res) => {
  const existing = selectApplicant(req.params.id);
  if (!existing) return notFound(res, 'Applicant');
  if (blockedByRefs(res, [['interviews', 'applicant_id', 'interview']], req.params.id)) return;
  db.prepare(`DELETE FROM applicants WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ---------- tours & events ----------
function selectTour(id) {
  return db.prepare(`SELECT * FROM tours_events WHERE id = ?`).get(id);
}

app.get('/api/tours-events', (req, res) => {
  res.json(db.prepare(`SELECT * FROM tours_events ORDER BY date ASC`).all());
});

app.post('/api/tours-events', (req, res) => {
  const { type, title, date, capacity, attendees_count, location, notes } = req.body;
  if (!type || !title || !date) return badRequest(res, 'type, title, and date are required');
  try {
    const info = db.prepare(`
      INSERT INTO tours_events (type, title, date, capacity, attendees_count, location, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(type, title, date, capacity === '' || capacity === undefined ? null : capacity, attendees_count || 0, location || null, notes || null);
    res.status(201).json(selectTour(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/tours-events/:id', (req, res) => {
  const existing = selectTour(req.params.id);
  if (!existing) return notFound(res, 'Tour/event');
  const { type, title, date, capacity, attendees_count, location, notes } = req.body;
  if (!type || !title || !date) return badRequest(res, 'type, title, and date are required');
  try {
    db.prepare(`
      UPDATE tours_events SET type = ?, title = ?, date = ?, capacity = ?, attendees_count = ?, location = ?, notes = ?
      WHERE id = ?
    `).run(type, title, date, capacity === '' || capacity === undefined ? null : capacity, attendees_count || 0, location || null, notes || null, req.params.id);
    res.json(selectTour(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/tours-events/:id', (req, res) => {
  const existing = selectTour(req.params.id);
  if (!existing) return notFound(res, 'Tour/event');
  db.prepare(`DELETE FROM tours_events WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ---------- interviews ----------
function selectInterview(id) {
  return db.prepare(`
    SELECT iv.*, a.student_name AS applicant_name, a.grade_applying_for,
      u.name AS interviewer_name, u.initials AS interviewer_initials, u.color AS interviewer_color
    FROM interviews iv
    LEFT JOIN applicants a ON a.id = iv.applicant_id
    LEFT JOIN users u ON u.id = iv.interviewer_user_id
    WHERE iv.id = ?
  `).get(id);
}

app.get('/api/interviews', (req, res) => {
  res.json(db.prepare(`
    SELECT iv.*, a.student_name AS applicant_name, a.grade_applying_for,
      u.name AS interviewer_name, u.initials AS interviewer_initials, u.color AS interviewer_color
    FROM interviews iv
    LEFT JOIN applicants a ON a.id = iv.applicant_id
    LEFT JOIN users u ON u.id = iv.interviewer_user_id
    ORDER BY iv.scheduled_at ASC
  `).all());
});

app.post('/api/interviews', (req, res) => {
  const { applicant_id, interviewer_user_id, scheduled_at, status, notes } = req.body;
  if (!applicant_id || !scheduled_at) return badRequest(res, 'applicant_id and scheduled_at are required');
  try {
    const info = db.prepare(`
      INSERT INTO interviews (applicant_id, interviewer_user_id, scheduled_at, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(applicant_id, interviewer_user_id || null, scheduled_at, status || 'Scheduled', notes || null);
    res.status(201).json(selectInterview(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/interviews/:id', (req, res) => {
  const existing = selectInterview(req.params.id);
  if (!existing) return notFound(res, 'Interview');
  const { applicant_id, interviewer_user_id, scheduled_at, status, notes } = req.body;
  if (!applicant_id || !scheduled_at) return badRequest(res, 'applicant_id and scheduled_at are required');
  try {
    db.prepare(`
      UPDATE interviews SET applicant_id = ?, interviewer_user_id = ?, scheduled_at = ?, status = ?, notes = ?
      WHERE id = ?
    `).run(applicant_id, interviewer_user_id || null, scheduled_at, status || 'Scheduled', notes || null, req.params.id);
    res.json(selectInterview(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/interviews/:id', (req, res) => {
  const existing = selectInterview(req.params.id);
  if (!existing) return notFound(res, 'Interview');
  db.prepare(`DELETE FROM interviews WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ---------- families ----------
function selectFamily(id) {
  return db.prepare(`SELECT * FROM families WHERE id = ?`).get(id);
}

app.get('/api/families', (req, res) => {
  res.json(db.prepare(`SELECT * FROM families ORDER BY primary_guardian_name`).all());
});

app.post('/api/families', (req, res) => {
  const { primary_guardian_name, secondary_guardian_name, email, phone, address, notes } = req.body;
  if (!primary_guardian_name) return badRequest(res, 'primary_guardian_name is required');
  try {
    const info = db.prepare(`
      INSERT INTO families (primary_guardian_name, secondary_guardian_name, email, phone, address, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(primary_guardian_name, secondary_guardian_name || null, email || null, phone || null, address || null, notes || null);
    res.status(201).json(selectFamily(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/families/:id', (req, res) => {
  const existing = selectFamily(req.params.id);
  if (!existing) return notFound(res, 'Family');
  const { primary_guardian_name, secondary_guardian_name, email, phone, address, notes } = req.body;
  if (!primary_guardian_name) return badRequest(res, 'primary_guardian_name is required');
  try {
    db.prepare(`
      UPDATE families SET primary_guardian_name = ?, secondary_guardian_name = ?, email = ?, phone = ?, address = ?, notes = ?
      WHERE id = ?
    `).run(primary_guardian_name, secondary_guardian_name || null, email || null, phone || null, address || null, notes || null, req.params.id);
    res.json(selectFamily(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/families/:id', (req, res) => {
  const existing = selectFamily(req.params.id);
  if (!existing) return notFound(res, 'Family');
  const refs = [
    ['students', 'family_id', 'student'],
    ['tuition_invoices', 'family_id', 'tuition invoice'],
    ['financial_aid', 'family_id', 'financial aid'],
  ];
  if (blockedByRefs(res, refs, req.params.id)) return;
  db.prepare(`DELETE FROM families WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ---------- students ----------
function selectStudent(id) {
  return db.prepare(`
    SELECT s.*, f.primary_guardian_name, f.secondary_guardian_name
    FROM students s LEFT JOIN families f ON f.id = s.family_id
    WHERE s.id = ?
  `).get(id);
}

app.get('/api/students', (req, res) => {
  res.json(db.prepare(`
    SELECT s.*, f.primary_guardian_name, f.secondary_guardian_name
    FROM students s LEFT JOIN families f ON f.id = s.family_id
    ORDER BY s.name
  `).all());
});

app.post('/api/students', (req, res) => {
  const { name, grade, homeroom, family_id, enrollment_date, status } = req.body;
  if (!name || !grade || !family_id) return badRequest(res, 'name, grade, and family_id are required');
  try {
    const info = db.prepare(`
      INSERT INTO students (name, grade, homeroom, family_id, enrollment_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, grade, homeroom || null, family_id, enrollment_date || new Date().toISOString().slice(0, 10), status || 'Active');
    res.status(201).json(selectStudent(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/students/:id', (req, res) => {
  const existing = selectStudent(req.params.id);
  if (!existing) return notFound(res, 'Student');
  const { name, grade, homeroom, family_id, enrollment_date, status } = req.body;
  if (!name || !grade || !family_id) return badRequest(res, 'name, grade, and family_id are required');
  try {
    db.prepare(`
      UPDATE students SET name = ?, grade = ?, homeroom = ?, family_id = ?, enrollment_date = ?, status = ?
      WHERE id = ?
    `).run(name, grade, homeroom || null, family_id, enrollment_date || existing.enrollment_date, status || 'Active', req.params.id);
    res.json(selectStudent(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/students/:id', (req, res) => {
  const existing = selectStudent(req.params.id);
  if (!existing) return notFound(res, 'Student');
  db.prepare(`DELETE FROM students WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ---------- tuition invoices ----------
function selectInvoice(id) {
  return db.prepare(`
    SELECT t.*, f.primary_guardian_name
    FROM tuition_invoices t LEFT JOIN families f ON f.id = t.family_id
    WHERE t.id = ?
  `).get(id);
}

app.get('/api/tuition-invoices', (req, res) => {
  res.json(db.prepare(`
    SELECT t.*, f.primary_guardian_name
    FROM tuition_invoices t LEFT JOIN families f ON f.id = t.family_id
    ORDER BY t.due_date ASC
  `).all());
});

app.post('/api/tuition-invoices', (req, res) => {
  const { family_id, term, amount_due, amount_paid, due_date, status } = req.body;
  if (!family_id || !term || !amount_due || !due_date) {
    return badRequest(res, 'family_id, term, amount_due, and due_date are required');
  }
  try {
    const info = db.prepare(`
      INSERT INTO tuition_invoices (family_id, term, amount_due, amount_paid, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(family_id, term, amount_due, amount_paid || 0, due_date, status || 'Pending');
    res.status(201).json(selectInvoice(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/tuition-invoices/:id', (req, res) => {
  const existing = selectInvoice(req.params.id);
  if (!existing) return notFound(res, 'Invoice');
  const { family_id, term, amount_due, amount_paid, due_date, status } = req.body;
  if (!family_id || !term || !amount_due || !due_date) {
    return badRequest(res, 'family_id, term, amount_due, and due_date are required');
  }
  try {
    db.prepare(`
      UPDATE tuition_invoices SET family_id = ?, term = ?, amount_due = ?, amount_paid = ?, due_date = ?, status = ?
      WHERE id = ?
    `).run(family_id, term, amount_due, amount_paid || 0, due_date, status || 'Pending', req.params.id);
    res.json(selectInvoice(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/tuition-invoices/:id', (req, res) => {
  const existing = selectInvoice(req.params.id);
  if (!existing) return notFound(res, 'Invoice');
  db.prepare(`DELETE FROM tuition_invoices WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ---------- financial aid ----------
function selectAid(id) {
  return db.prepare(`
    SELECT fa.*, f.primary_guardian_name
    FROM financial_aid fa LEFT JOIN families f ON f.id = fa.family_id
    WHERE fa.id = ?
  `).get(id);
}

app.get('/api/financial-aid', (req, res) => {
  res.json(db.prepare(`
    SELECT fa.*, f.primary_guardian_name
    FROM financial_aid fa LEFT JOIN families f ON f.id = fa.family_id
    ORDER BY fa.id DESC
  `).all());
});

app.post('/api/financial-aid', (req, res) => {
  const { family_id, program, amount_awarded, status, academic_year } = req.body;
  if (!family_id || !program || !academic_year) return badRequest(res, 'family_id, program, and academic_year are required');
  try {
    const info = db.prepare(`
      INSERT INTO financial_aid (family_id, program, amount_awarded, status, academic_year)
      VALUES (?, ?, ?, ?, ?)
    `).run(family_id, program, amount_awarded === '' || amount_awarded === undefined ? null : amount_awarded, status || 'Under Review', academic_year);
    res.status(201).json(selectAid(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/financial-aid/:id', (req, res) => {
  const existing = selectAid(req.params.id);
  if (!existing) return notFound(res, 'Financial aid record');
  const { family_id, program, amount_awarded, status, academic_year } = req.body;
  if (!family_id || !program || !academic_year) return badRequest(res, 'family_id, program, and academic_year are required');
  try {
    db.prepare(`
      UPDATE financial_aid SET family_id = ?, program = ?, amount_awarded = ?, status = ?, academic_year = ?
      WHERE id = ?
    `).run(family_id, program, amount_awarded === '' || amount_awarded === undefined ? null : amount_awarded, status || 'Under Review', academic_year, req.params.id);
    res.json(selectAid(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/financial-aid/:id', (req, res) => {
  const existing = selectAid(req.params.id);
  if (!existing) return notFound(res, 'Financial aid record');
  db.prepare(`DELETE FROM financial_aid WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ---------- activities ----------
app.get('/api/activities', (req, res) => {
  res.json(db.prepare(`
    SELECT ac.*, u.name AS owner_name, u.initials AS owner_initials, u.color AS owner_color
    FROM activities ac LEFT JOIN users u ON u.id = ac.owner_user_id
    ORDER BY ac.occurred_at DESC
  `).all());
});

app.post('/api/activities', (req, res) => {
  const { type, subject, related_type, related_id, owner_user_id, occurred_at, notes } = req.body;
  if (!type || !subject) return badRequest(res, 'type and subject are required');
  try {
    const info = db.prepare(`
      INSERT INTO activities (type, subject, related_type, related_id, owner_user_id, occurred_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(type, subject, related_type || null, related_id || null, owner_user_id || null, occurred_at || new Date().toISOString(), notes || null);
    res.status(201).json(db.prepare(`SELECT * FROM activities WHERE id = ?`).get(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/activities/:id', (req, res) => {
  const existing = db.prepare(`SELECT * FROM activities WHERE id = ?`).get(req.params.id);
  if (!existing) return notFound(res, 'Activity');
  db.prepare(`DELETE FROM activities WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ---------- automations ----------
app.get('/api/automations', (req, res) => {
  res.json(db.prepare(`SELECT * FROM automations ORDER BY runs_30d DESC`).all());
});

app.post('/api/automations', (req, res) => {
  const { name, trigger_desc, action_desc, active } = req.body;
  if (!name || !trigger_desc || !action_desc) return badRequest(res, 'name, trigger_desc, and action_desc are required');
  try {
    const info = db.prepare(`
      INSERT INTO automations (name, trigger_desc, action_desc, active, runs_30d)
      VALUES (?, ?, ?, ?, 0)
    `).run(name, trigger_desc, action_desc, active === false ? 0 : 1);
    res.status(201).json(db.prepare(`SELECT * FROM automations WHERE id = ?`).get(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/automations/:id/toggle', (req, res) => {
  const existing = db.prepare(`SELECT * FROM automations WHERE id = ?`).get(req.params.id);
  if (!existing) return notFound(res, 'Automation');
  db.prepare(`UPDATE automations SET active = ? WHERE id = ?`).run(existing.active ? 0 : 1, req.params.id);
  res.json(db.prepare(`SELECT * FROM automations WHERE id = ?`).get(req.params.id));
});

app.delete('/api/automations/:id', (req, res) => {
  const existing = db.prepare(`SELECT * FROM automations WHERE id = ?`).get(req.params.id);
  if (!existing) return notFound(res, 'Automation');
  db.prepare(`DELETE FROM automations WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ---------- dashboard ----------
app.get('/api/dashboard', (req, res) => {
  const openInquiries = db.prepare(`
    SELECT COUNT(*) AS count FROM inquiries WHERE status NOT IN ('Converted', 'Closed')
  `).get();

  const inPipeline = db.prepare(`
    SELECT COUNT(*) AS count FROM applicants WHERE stage NOT IN ('Enrolled', 'Declined')
  `).get();

  const toursThisWeek = db.prepare(`
    SELECT COUNT(*) AS count FROM tours_events WHERE date >= ? AND date < date(?, '+7 days')
  `).get(TODAY, TODAY);

  const enrolledStudents = db.prepare(`
    SELECT COUNT(*) AS count FROM students WHERE status = 'Active'
  `).get();

  const overdueTuition = db.prepare(`
    SELECT COALESCE(SUM(amount_due - amount_paid), 0) AS total, COUNT(*) AS count
    FROM tuition_invoices WHERE status = 'Overdue'
  `).get();

  const pipelineByStage = db.prepare(`
    SELECT stage, COUNT(*) AS count FROM applicants GROUP BY stage
  `).all();

  const upcomingInterviews = db.prepare(`
    SELECT iv.id, iv.scheduled_at, a.student_name AS applicant_name, a.grade_applying_for,
      u.name AS interviewer_name
    FROM interviews iv
    LEFT JOIN applicants a ON a.id = iv.applicant_id
    LEFT JOIN users u ON u.id = iv.interviewer_user_id
    WHERE iv.status = 'Scheduled'
    ORDER BY iv.scheduled_at ASC
    LIMIT 6
  `).all();

  const upcomingTours = db.prepare(`
    SELECT id, type, title, date, location, capacity, attendees_count
    FROM tours_events
    WHERE date >= ?
    ORDER BY date ASC
    LIMIT 6
  `).all(TODAY);

  const recentActivity = db.prepare(`
    SELECT ac.id, ac.type, ac.subject, ac.occurred_at, ac.related_type,
      u.name AS owner_name, u.initials AS owner_initials, u.color AS owner_color
    FROM activities ac LEFT JOIN users u ON u.id = ac.owner_user_id
    ORDER BY ac.occurred_at DESC
    LIMIT 8
  `).all();

  const inquiriesBySource = db.prepare(`
    SELECT source, COUNT(*) AS count FROM inquiries GROUP BY source ORDER BY count DESC
  `).all();

  res.json({
    openInquiries, inPipeline, toursThisWeek, enrolledStudents, overdueTuition,
    pipelineByStage, upcomingInterviews, upcomingTours, recentActivity, inquiriesBySource,
  });
});

// ---------- reports ----------
app.get('/api/reports', (req, res) => {
  const funnelByStage = db.prepare(`
    SELECT stage, COUNT(*) AS count FROM applicants GROUP BY stage
  `).all();

  const tuitionSummary = db.prepare(`
    SELECT COALESCE(SUM(amount_due), 0) AS total_due, COALESCE(SUM(amount_paid), 0) AS total_paid
    FROM tuition_invoices
  `).get();

  const tuitionByStatus = db.prepare(`
    SELECT status, COUNT(*) AS count, COALESCE(SUM(amount_due - amount_paid), 0) AS outstanding
    FROM tuition_invoices GROUP BY status
  `).all();

  const inquiriesBySource = db.prepare(`
    SELECT source, COUNT(*) AS count FROM inquiries GROUP BY source ORDER BY count DESC
  `).all();

  const aidByStatus = db.prepare(`
    SELECT status, COUNT(*) AS count, COALESCE(SUM(amount_awarded), 0) AS total_awarded
    FROM financial_aid GROUP BY status
  `).all();

  const studentsByGrade = db.prepare(`
    SELECT grade, COUNT(*) AS count FROM students WHERE status = 'Active' GROUP BY grade
  `).all();

  const enrollmentConversion = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM inquiries) AS inquiries,
      (SELECT COUNT(*) FROM applicants) AS applicants,
      (SELECT COUNT(*) FROM applicants WHERE stage = 'Enrolled') AS enrolled
  `).get();

  res.json({
    funnelByStage, tuitionSummary, tuitionByStatus, inquiriesBySource, aidByStatus,
    studentsByGrade, enrollmentConversion,
  });
});

app.listen(PORT, () => {
  console.log(`Cohort CRM API listening on http://localhost:${PORT}`);
});
