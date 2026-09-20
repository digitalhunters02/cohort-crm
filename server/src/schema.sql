CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inquiries (
  id SERIAL PRIMARY KEY,
  student_name TEXT NOT NULL,
  grade_applying_for TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_email TEXT,
  parent_phone TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'New',
  owner_user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS applicants (
  id SERIAL PRIMARY KEY,
  inquiry_id INTEGER REFERENCES inquiries(id),
  student_name TEXT NOT NULL,
  grade_applying_for TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_email TEXT,
  parent_phone TEXT,
  stage TEXT NOT NULL DEFAULT 'Inquiry',
  owner_user_id INTEGER REFERENCES users(id),
  application_date TEXT,
  decision_date TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS tours_events (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  capacity INTEGER,
  attendees_count INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS interviews (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER NOT NULL REFERENCES applicants(id),
  interviewer_user_id INTEGER REFERENCES users(id),
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS families (
  id SERIAL PRIMARY KEY,
  primary_guardian_name TEXT NOT NULL,
  secondary_guardian_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  homeroom TEXT,
  family_id INTEGER REFERENCES families(id),
  enrollment_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS tuition_invoices (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id),
  term TEXT NOT NULL,
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS financial_aid (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id),
  program TEXT NOT NULL,
  amount_awarded INTEGER,
  status TEXT NOT NULL DEFAULT 'Under Review',
  academic_year TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  related_type TEXT,
  related_id INTEGER,
  owner_user_id INTEGER REFERENCES users(id),
  occurred_at TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS automations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_desc TEXT NOT NULL,
  action_desc TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  runs_30d INTEGER NOT NULL DEFAULT 0
);
