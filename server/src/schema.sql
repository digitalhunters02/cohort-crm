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

CREATE TABLE IF NOT EXISTS whatsapp_connection (
  id INTEGER PRIMARY KEY DEFAULT 1,
  phone_number_id TEXT NOT NULL,
  business_account_id TEXT,
  access_token TEXT NOT NULL,
  verify_token TEXT,
  display_phone TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_connection_single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id TEXT PRIMARY KEY,
  wa_message_id TEXT UNIQUE,
  contact_phone TEXT NOT NULL,
  direction TEXT NOT NULL,
  body TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact ON whatsapp_messages (contact_phone, created_at);

-- Login accounts (separate from "users", which are the school's admissions
-- staff shown on the Team card). Owner / staff roles; bcrypt password hashes.
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  token_version INTEGER NOT NULL DEFAULT 0,
  reset_token_hash TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_lower_idx ON accounts (lower(email));
CREATE INDEX IF NOT EXISTS accounts_reset_token_idx ON accounts (reset_token_hash);

-- Plano e assinatura desta instalação (uma linha só): ver billing.js
CREATE TABLE IF NOT EXISTS subscription (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  plan TEXT NOT NULL DEFAULT 'basico',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recursos pro (Essencial/Completo): inscrição online, recomendação por link, vagas por série, portal da família, contratos
ALTER TABLE families ADD COLUMN IF NOT EXISTS portal_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS families_portal_token_uq ON families (portal_token) WHERE portal_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  recommender_name TEXT NOT NULL,
  recommender_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Requested',
  ratings TEXT,
  recommend TEXT,
  comments TEXT,
  signed_by TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grade_capacity (
  grade TEXT PRIMARY KEY,
  seats INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id),
  student_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Sent',
  signed_by TEXT,
  signed_at TIMESTAMPTZ,
  created_at TEXT NOT NULL
);
