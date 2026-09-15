import db from './db.js';

// Only seed a fresh/empty database. The server restarts on every deploy
// (Render's Start Command runs this before starting the API), and by the
// time real users have created their own records via the app's CRUD forms
// we must NOT wipe them — so bail out early if the database already has data.
const { count: existingInquiries } = db.prepare(`SELECT COUNT(*) AS count FROM inquiries`).get();
if (existingInquiries > 0) {
  console.log(`Database already has data (${existingInquiries} inquiries) — skipping seed.`);
  process.exit(0);
}

const tables = [
  'activities', 'financial_aid', 'tuition_invoices', 'students', 'families',
  'interviews', 'tours_events', 'applicants', 'inquiries', 'automations', 'users',
];
for (const t of tables) db.prepare(`DELETE FROM ${t}`).run();
for (const t of tables) db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(t);

// ---------- users (admissions & enrollment staff) ----------
const insertUser = db.prepare(`
  INSERT INTO users (name, email, role, initials, color)
  VALUES (@name, @email, @role, @initials, @color)
`);
const usersData = [
  { name: 'Dr. Elena Marsh', email: 'elena.marsh@ashfordprep.edu', role: 'Director of Admissions', initials: 'EM', color: '#7a2331' },
  { name: 'Jordan Whitfield', email: 'jordan.whitfield@ashfordprep.edu', role: 'Assistant Director of Admissions', initials: 'JW', color: '#b8862e' },
  { name: 'Priya Anand', email: 'priya.anand@ashfordprep.edu', role: 'Admissions Counselor', initials: 'PA', color: '#2f6f5e' },
  { name: 'Marcus Boone', email: 'marcus.boone@ashfordprep.edu', role: 'Admissions Counselor', initials: 'MB', color: '#3a5a8c' },
  { name: 'Sofia Delgado', email: 'sofia.delgado@ashfordprep.edu', role: 'Enrollment & Financial Aid Coordinator', initials: 'SD', color: '#7b5ea0' },
  { name: 'Nathaniel Cho', email: 'nathaniel.cho@ashfordprep.edu', role: 'Upper School Dean', initials: 'NC', color: '#a0522d' },
];
const userIds = usersData.map((u) => insertUser.run(u).lastInsertRowid);
const [ELENA, JORDAN, PRIYA, MARCUS, SOFIA, NATHANIEL] = userIds;

// ---------- inquiries ----------
const insertInquiry = db.prepare(`
  INSERT INTO inquiries (student_name, grade_applying_for, parent_name, parent_email, parent_phone, source, status, owner_user_id, created_at, notes)
  VALUES (@student_name, @grade_applying_for, @parent_name, @parent_email, @parent_phone, @source, @status, @owner_user_id, @created_at, @notes)
`);
const inquiriesData = [
  { student_name: 'Emma Castellanos', grade_applying_for: '5th Grade', parent_name: 'Diego Castellanos', parent_email: 'diego.castellanos@gmail.com', parent_phone: '(828) 555-0111', source: 'Website', status: 'New', owner_user_id: MARCUS, created_at: '2026-09-10', notes: 'Filled out the online inquiry form after seeing a Google ad.' },
  { student_name: 'Liam Ferreira', grade_applying_for: '2nd Grade', parent_name: 'Ana Ferreira', parent_email: 'ana.ferreira@outlook.com', parent_phone: '(828) 555-0122', source: 'Referral', status: 'Contacted', owner_user_id: PRIYA, created_at: '2026-09-05', notes: 'Referred by the Kim family, current Ashford parents.' },
  { student_name: 'Noah Whitcombe', grade_applying_for: '9th Grade', parent_name: 'Grace Whitcombe', parent_email: 'grace.whitcombe@gmail.com', parent_phone: '(828) 555-0133', source: 'School Fair', status: 'Nurturing', owner_user_id: MARCUS, created_at: '2026-08-20', notes: 'Met at the Asheville Independent Schools fair, interested in the STEM track.' },
  { student_name: 'Ava Okonkwo', grade_applying_for: 'Kindergarten', parent_name: 'Chidi Okonkwo', parent_email: 'chidi.okonkwo@gmail.com', parent_phone: '(828) 555-0144', source: 'Open House', status: 'Converted', owner_user_id: PRIYA, created_at: '2026-07-12', notes: 'Attended the spring Open House, moved into the applicant pipeline.' },
  { student_name: 'Ethan Park', grade_applying_for: '7th Grade', parent_name: 'Soo-Jin Park', parent_email: 'soojin.park@yahoo.com', parent_phone: '(828) 555-0155', source: 'Website', status: 'Converted', owner_user_id: JORDAN, created_at: '2026-07-01', notes: 'Relocating from Charlotte in December, wants a mid-year start.' },
  { student_name: 'Maya Brennan', grade_applying_for: '4th Grade', parent_name: 'Colin Brennan', parent_email: 'colin.brennan@gmail.com', parent_phone: '(828) 555-0166', source: 'Referral', status: 'Converted', owner_user_id: MARCUS, created_at: '2026-06-25', notes: 'Referred by a Board member.' },
  { student_name: 'Zoe Nakamura', grade_applying_for: '1st Grade', parent_name: 'Kenji Nakamura', parent_email: 'kenji.nakamura@gmail.com', parent_phone: '(828) 555-0177', source: 'Website', status: 'Converted', owner_user_id: PRIYA, created_at: '2026-05-30', notes: 'Strong interest in the Mandarin immersion elective.' },
  { student_name: 'Wyatt Douglas', grade_applying_for: '3rd Grade', parent_name: 'Renee Douglas', parent_email: 'renee.douglas@gmail.com', parent_phone: '(828) 555-0188', source: 'Open House', status: 'Converted', owner_user_id: JORDAN, created_at: '2026-04-18', notes: 'Enrolled for fall after a very positive shadow day.' },
  { student_name: 'Isabella Marquez', grade_applying_for: '6th Grade', parent_name: 'Luis Marquez', parent_email: 'luis.marquez@gmail.com', parent_phone: '(828) 555-0199', source: 'School Fair', status: 'Converted', owner_user_id: MARCUS, created_at: '2026-06-02', notes: 'Currently waitlisted, following up regularly.' },
  { student_name: 'Julian Osei', grade_applying_for: '10th Grade', parent_name: 'Abena Osei', parent_email: 'abena.osei@gmail.com', parent_phone: '(828) 555-0210', source: 'Website', status: 'Closed', owner_user_id: NATHANIEL, created_at: '2026-05-14', notes: 'Family chose to stay at current school for junior year.' },
  { student_name: 'Harper Lindqvist', grade_applying_for: 'Kindergarten', parent_name: 'Erik Lindqvist', parent_email: 'erik.lindqvist@gmail.com', parent_phone: '(828) 555-0221', source: 'Referral', status: 'New', owner_user_id: PRIYA, created_at: '2026-09-12', notes: 'Referred by the Simmons family.' },
  { student_name: 'Sofia Petrakis', grade_applying_for: '8th Grade', parent_name: 'Nikos Petrakis', parent_email: 'nikos.petrakis@gmail.com', parent_phone: '(828) 555-0232', source: 'Website', status: 'Contacted', owner_user_id: MARCUS, created_at: '2026-09-08', notes: 'Asked about the middle school robotics program.' },
];
const inquiryIds = inquiriesData.map((i) => insertInquiry.run(i).lastInsertRowid);
const [
  INQ_EMMA, INQ_LIAM, INQ_NOAH, INQ_AVA, INQ_ETHAN, INQ_MAYA, INQ_ZOE, INQ_WYATT,
  INQ_ISABELLA, INQ_JULIAN, INQ_HARPER, INQ_SOFIAP,
] = inquiryIds;

// ---------- applicants ----------
const insertApplicant = db.prepare(`
  INSERT INTO applicants (inquiry_id, student_name, grade_applying_for, parent_name, parent_email, parent_phone, stage, owner_user_id, application_date, decision_date, notes)
  VALUES (@inquiry_id, @student_name, @grade_applying_for, @parent_name, @parent_email, @parent_phone, @stage, @owner_user_id, @application_date, @decision_date, @notes)
`);
const applicantsData = [
  { inquiry_id: INQ_AVA, student_name: 'Ava Okonkwo', grade_applying_for: 'Kindergarten', parent_name: 'Chidi Okonkwo', parent_email: 'chidi.okonkwo@gmail.com', parent_phone: '(828) 555-0144', stage: 'Tour Scheduled', owner_user_id: PRIYA, application_date: null, decision_date: null, notes: 'Campus tour booked for next week.' },
  { inquiry_id: INQ_ETHAN, student_name: 'Ethan Park', grade_applying_for: '7th Grade', parent_name: 'Soo-Jin Park', parent_email: 'soojin.park@yahoo.com', parent_phone: '(828) 555-0155', stage: 'Application Submitted', owner_user_id: JORDAN, application_date: '2026-08-15', decision_date: null, notes: 'Transcripts received from Charlotte Country Day.' },
  { inquiry_id: INQ_MAYA, student_name: 'Maya Brennan', grade_applying_for: '4th Grade', parent_name: 'Colin Brennan', parent_email: 'colin.brennan@gmail.com', parent_phone: '(828) 555-0166', stage: 'Interview Scheduled', owner_user_id: MARCUS, application_date: '2026-08-05', decision_date: null, notes: 'Interview with Mr. Cho scheduled.' },
  { inquiry_id: INQ_ZOE, student_name: 'Zoe Nakamura', grade_applying_for: '1st Grade', parent_name: 'Kenji Nakamura', parent_email: 'kenji.nakamura@gmail.com', parent_phone: '(828) 555-0177', stage: 'Accepted', owner_user_id: PRIYA, application_date: '2026-06-20', decision_date: '2026-08-28', notes: 'Offer letter sent, awaiting enrollment deposit.' },
  { inquiry_id: INQ_WYATT, student_name: 'Wyatt Douglas', grade_applying_for: '3rd Grade', parent_name: 'Renee Douglas', parent_email: 'renee.douglas@gmail.com', parent_phone: '(828) 555-0188', stage: 'Enrolled', owner_user_id: JORDAN, application_date: '2026-05-01', decision_date: '2026-06-10', notes: 'Enrollment contract and deposit received.' },
  { inquiry_id: INQ_ISABELLA, student_name: 'Isabella Marquez', grade_applying_for: '6th Grade', parent_name: 'Luis Marquez', parent_email: 'luis.marquez@gmail.com', parent_phone: '(828) 555-0199', stage: 'Waitlisted', owner_user_id: MARCUS, application_date: '2026-06-20', decision_date: '2026-08-20', notes: 'Strong application, 6th grade is at capacity.' },
  { inquiry_id: INQ_JULIAN, student_name: 'Julian Osei', grade_applying_for: '10th Grade', parent_name: 'Abena Osei', parent_email: 'abena.osei@gmail.com', parent_phone: '(828) 555-0210', stage: 'Declined', owner_user_id: NATHANIEL, application_date: '2026-05-25', decision_date: '2026-06-15', notes: 'Family withdrew to stay at current school.' },
  { inquiry_id: null, student_name: 'Grace Thompson', grade_applying_for: '2nd Grade', parent_name: 'Melissa Thompson', parent_email: 'melissa.thompson@gmail.com', parent_phone: '(828) 555-0243', stage: 'Interview Scheduled', owner_user_id: PRIYA, application_date: '2026-08-22', decision_date: null, notes: 'Walk-in inquiry converted directly to application at the fall fair.' },
  { inquiry_id: null, student_name: 'Mason Lee', grade_applying_for: '9th Grade', parent_name: 'Grace Lee', parent_email: 'grace.lee@gmail.com', parent_phone: '(828) 555-0254', stage: 'Application Submitted', owner_user_id: NATHANIEL, application_date: '2026-09-01', decision_date: null, notes: 'Strong PSAT scores, interested in varsity soccer.' },
  { inquiry_id: null, student_name: 'Olivia Ruiz', grade_applying_for: '6th Grade', parent_name: 'Carmen Ruiz', parent_email: 'carmen.ruiz@gmail.com', parent_phone: '(828) 555-0265', stage: 'Enrolled', owner_user_id: JORDAN, application_date: '2026-04-10', decision_date: '2026-05-15', notes: 'Sibling of a current 9th grader.' },
  { inquiry_id: null, student_name: 'Benjamin Hart', grade_applying_for: '9th Grade', parent_name: 'Deborah Hart', parent_email: 'deborah.hart@gmail.com', parent_phone: '(828) 555-0276', stage: 'Enrolled', owner_user_id: MARCUS, application_date: '2026-03-20', decision_date: '2026-04-25', notes: 'Financial aid awarded, enrollment finalized.' },
  { inquiry_id: null, student_name: 'Chloe Fitzgerald', grade_applying_for: '5th Grade', parent_name: 'Patrick Fitzgerald', parent_email: 'patrick.fitzgerald@gmail.com', parent_phone: '(828) 555-0287', stage: 'Tour Scheduled', owner_user_id: PRIYA, application_date: null, decision_date: null, notes: 'Requested a tour focused on the arts program.' },
  { inquiry_id: null, student_name: 'Aiden Kowalski', grade_applying_for: '11th Grade', parent_name: 'Rachel Kowalski', parent_email: 'rachel.kowalski@gmail.com', parent_phone: '(828) 555-0298', stage: 'Accepted', owner_user_id: NATHANIEL, application_date: '2026-07-10', decision_date: '2026-08-30', notes: 'Transfer student, strong recommendation letters.' },
  { inquiry_id: null, student_name: 'Layla Haddad', grade_applying_for: 'Kindergarten', parent_name: 'Samir Haddad', parent_email: 'samir.haddad@gmail.com', parent_phone: '(828) 555-0309', stage: 'Inquiry', owner_user_id: MARCUS, application_date: null, decision_date: null, notes: 'Just started exploring options for next fall.' },
];
const applicantIds = applicantsData.map((a) => insertApplicant.run(a).lastInsertRowid);
const [
  APP_AVA, APP_ETHAN, APP_MAYA, APP_ZOE, APP_WYATT, APP_ISABELLA, APP_JULIAN,
  APP_GRACE, APP_MASON, APP_OLIVIA, APP_BENJAMIN, APP_CHLOE, APP_AIDEN, APP_LAYLA,
] = applicantIds;

// ---------- tours & events ----------
const insertTour = db.prepare(`
  INSERT INTO tours_events (type, title, date, capacity, attendees_count, location, notes)
  VALUES (@type, @title, @date, @capacity, @attendees_count, @location, @notes)
`);
const toursData = [
  { type: 'Open House', title: 'Fall Open House', date: '2026-09-05', capacity: 80, attendees_count: 64, location: 'Ashford Hall Auditorium', notes: 'Included a headmaster welcome and campus-wide tour.' },
  { type: 'Campus Tour', title: 'Weekday Campus Tour', date: '2026-09-18', capacity: 12, attendees_count: 8, location: 'Admissions Office', notes: 'Small-group tour led by admissions counselors.' },
  { type: 'Shadow Day', title: 'Middle School Shadow Day', date: '2026-09-22', capacity: 10, attendees_count: 6, location: 'Middle School Wing', notes: 'Prospective 6th-8th graders shadow current students.' },
  { type: 'Info Session', title: 'Virtual Admissions Info Session', date: '2026-09-25', capacity: 100, attendees_count: 41, location: 'Zoom Webinar', notes: 'Covers the application timeline and financial aid process.' },
  { type: 'Campus Tour', title: 'Saturday Family Tour', date: '2026-09-27', capacity: 20, attendees_count: 3, location: 'Admissions Office', notes: 'Weekend tour slot for working families.' },
  { type: 'Shadow Day', title: 'Upper School Shadow Day', date: '2026-10-02', capacity: 8, attendees_count: 0, location: 'Upper School Wing', notes: 'Prospective 9th-12th graders attend a full day of classes.' },
];
const tourIds = toursData.map((t) => insertTour.run(t).lastInsertRowid);
const [TOUR_OPENHOUSE, TOUR_WEEKDAY, TOUR_MSSHADOW, TOUR_INFOSESSION, TOUR_SATURDAY, TOUR_USSHADOW] = tourIds;

// ---------- interviews ----------
const insertInterview = db.prepare(`
  INSERT INTO interviews (applicant_id, interviewer_user_id, scheduled_at, status, notes)
  VALUES (@applicant_id, @interviewer_user_id, @scheduled_at, @status, @notes)
`);
const interviewsData = [
  { applicant_id: APP_MAYA, interviewer_user_id: NATHANIEL, scheduled_at: '2026-09-19 09:30', status: 'Scheduled', notes: 'Bring writing sample.' },
  { applicant_id: APP_GRACE, interviewer_user_id: PRIYA, scheduled_at: '2026-09-17 10:00', status: 'Scheduled', notes: 'Parent interview to follow immediately after.' },
  { applicant_id: APP_ZOE, interviewer_user_id: PRIYA, scheduled_at: '2026-08-20 13:00', status: 'Completed', notes: 'Warm, engaged, great fit for the 1st grade cohort.' },
  { applicant_id: APP_WYATT, interviewer_user_id: JORDAN, scheduled_at: '2026-05-28 11:00', status: 'Completed', notes: 'Very comfortable in the classroom visit.' },
  { applicant_id: APP_ISABELLA, interviewer_user_id: MARCUS, scheduled_at: '2026-08-10 14:30', status: 'Completed', notes: 'Strong academic interview, math placement recommended.' },
  { applicant_id: APP_JULIAN, interviewer_user_id: NATHANIEL, scheduled_at: '2026-06-05 15:00', status: 'No-show', notes: 'Family called to reschedule, then withdrew the application.' },
  { applicant_id: APP_AIDEN, interviewer_user_id: NATHANIEL, scheduled_at: '2026-08-25 09:00', status: 'Completed', notes: 'Impressive transfer transcript, cleared for acceptance.' },
  { applicant_id: APP_MASON, interviewer_user_id: NATHANIEL, scheduled_at: '2026-09-24 13:30', status: 'Scheduled', notes: 'Coach Reyes will join for a soccer program conversation.' },
];
insertInterview.run.bind(insertInterview);
interviewsData.forEach((iv) => insertInterview.run(iv));

// ---------- families ----------
const insertFamily = db.prepare(`
  INSERT INTO families (primary_guardian_name, secondary_guardian_name, email, phone, address, notes)
  VALUES (@primary_guardian_name, @secondary_guardian_name, @email, @phone, @address, @notes)
`);
const familiesData = [
  { primary_guardian_name: 'Renee Douglas', secondary_guardian_name: 'Patrick Douglas', email: 'renee.douglas@gmail.com', phone: '(828) 555-0188', address: '412 Blue Ridge Ave, Asheville, NC 28801', notes: 'Enrollment deposit paid in full.' },
  { primary_guardian_name: 'Carmen Ruiz', secondary_guardian_name: 'Miguel Ruiz', email: 'carmen.ruiz@gmail.com', phone: '(828) 555-0265', address: '88 Sunset Terrace, Asheville, NC 28803', notes: 'Two children currently enrolled.' },
  { primary_guardian_name: 'Deborah Hart', secondary_guardian_name: 'Michael Hart', email: 'deborah.hart@gmail.com', phone: '(828) 555-0276', address: '215 Chestnut St, Asheville, NC 28801', notes: 'Receiving need-based financial aid.' },
  { primary_guardian_name: 'Soo-Jin Kim', secondary_guardian_name: 'David Kim', email: 'soojin.kim@gmail.com', phone: '(828) 555-0321', address: '77 Merrimon Ave, Asheville, NC 28804', notes: 'Long-time Ashford family, refers frequently.' },
  { primary_guardian_name: 'Angela Simmons', secondary_guardian_name: 'Robert Simmons', email: 'angela.simmons@gmail.com', phone: '(828) 555-0332', address: '19 Kimberly Ave, Asheville, NC 28804', notes: null },
  { primary_guardian_name: 'Denise Johnson', secondary_guardian_name: null, email: 'denise.johnson@gmail.com', phone: '(828) 555-0343', address: '542 Hendersonville Rd, Asheville, NC 28803', notes: 'Single-guardian household, sibling discount applied.' },
  { primary_guardian_name: 'Karen Meyer', secondary_guardian_name: 'Thomas Meyer', email: 'karen.meyer@gmail.com', phone: '(828) 555-0354', address: '9 Beaverdam Rd, Asheville, NC 28804', notes: null },
];
const familyIds = familiesData.map((f) => insertFamily.run(f).lastInsertRowid);
const [F_DOUGLAS, F_RUIZ, F_HART, F_KIM, F_SIMMONS, F_JOHNSON, F_MEYER] = familyIds;

// ---------- students ----------
const insertStudent = db.prepare(`
  INSERT INTO students (name, grade, homeroom, family_id, enrollment_date, status)
  VALUES (@name, @grade, @homeroom, @family_id, @enrollment_date, @status)
`);
const studentsData = [
  { name: 'Wyatt Douglas', grade: '3rd Grade', homeroom: 'Mrs. Alcott', family_id: F_DOUGLAS, enrollment_date: '2026-08-17', status: 'Active' },
  { name: 'Olivia Ruiz', grade: '6th Grade', homeroom: 'Mr. Feldman', family_id: F_RUIZ, enrollment_date: '2026-08-17', status: 'Active' },
  { name: 'Diego Ruiz', grade: '9th Grade', homeroom: 'Ms. Alvarez', family_id: F_RUIZ, enrollment_date: '2024-08-19', status: 'Active' },
  { name: 'Benjamin Hart', grade: '9th Grade', homeroom: 'Ms. Alvarez', family_id: F_HART, enrollment_date: '2026-08-17', status: 'Active' },
  { name: 'Grace Hart', grade: '4th Grade', homeroom: 'Mr. Whitley', family_id: F_HART, enrollment_date: '2024-08-19', status: 'Active' },
  { name: 'Charlotte Kim', grade: 'Kindergarten', homeroom: 'Mrs. Patel', family_id: F_KIM, enrollment_date: '2026-08-17', status: 'Active' },
  { name: 'Daniel Kim', grade: '8th Grade', homeroom: 'Mr. Osei', family_id: F_KIM, enrollment_date: '2022-08-22', status: 'Active' },
  { name: 'Henry Simmons', grade: '1st Grade', homeroom: 'Mrs. Bell', family_id: F_SIMMONS, enrollment_date: '2025-08-18', status: 'Active' },
  { name: 'Amara Johnson', grade: '7th Grade', homeroom: 'Mr. Feldman', family_id: F_JOHNSON, enrollment_date: '2023-08-21', status: 'Active' },
  { name: 'Lucas Meyer', grade: '11th Grade', homeroom: 'Dr. Chapman', family_id: F_MEYER, enrollment_date: '2021-08-23', status: 'Active' },
  { name: 'Ivy Meyer', grade: '2nd Grade', homeroom: 'Mrs. Alcott', family_id: F_MEYER, enrollment_date: '2024-08-19', status: 'Active' },
];
insertStudent.run.bind(insertStudent);
studentsData.forEach((s) => insertStudent.run(s));

// ---------- tuition invoices ----------
const insertInvoice = db.prepare(`
  INSERT INTO tuition_invoices (family_id, term, amount_due, amount_paid, due_date, status)
  VALUES (@family_id, @term, @amount_due, @amount_paid, @due_date, @status)
`);
const invoicesData = [
  { family_id: F_DOUGLAS, term: '2026-2027 Fall', amount_due: 14500, amount_paid: 14500, due_date: '2026-08-01', status: 'Paid' },
  { family_id: F_RUIZ, term: '2026-2027 Fall', amount_due: 27600, amount_paid: 27600, due_date: '2026-08-01', status: 'Paid' },
  { family_id: F_RUIZ, term: '2026-2027 Spring', amount_due: 27600, amount_paid: 0, due_date: '2027-01-15', status: 'Pending' },
  { family_id: F_HART, term: '2026-2027 Fall', amount_due: 22800, amount_paid: 11400, due_date: '2026-08-01', status: 'Partial' },
  { family_id: F_KIM, term: '2026-2027 Fall', amount_due: 27200, amount_paid: 27200, due_date: '2026-08-01', status: 'Paid' },
  { family_id: F_KIM, term: '2026-2027 Spring', amount_due: 27200, amount_paid: 0, due_date: '2027-01-15', status: 'Pending' },
  { family_id: F_SIMMONS, term: '2026-2027 Fall', amount_due: 13800, amount_paid: 6000, due_date: '2026-08-15', status: 'Overdue' },
  { family_id: F_JOHNSON, term: '2026-2027 Fall', amount_due: 12200, amount_paid: 12200, due_date: '2026-08-01', status: 'Paid' },
  { family_id: F_MEYER, term: '2026-2027 Fall', amount_due: 27600, amount_paid: 9000, due_date: '2026-08-01', status: 'Overdue' },
  { family_id: F_MEYER, term: '2026-2027 Spring', amount_due: 27600, amount_paid: 0, due_date: '2027-01-15', status: 'Pending' },
];
insertInvoice.run.bind(insertInvoice);
invoicesData.forEach((i) => insertInvoice.run(i));

// ---------- financial aid ----------
const insertAid = db.prepare(`
  INSERT INTO financial_aid (family_id, program, amount_awarded, status, academic_year)
  VALUES (@family_id, @program, @amount_awarded, @status, @academic_year)
`);
const aidData = [
  { family_id: F_HART, program: 'Need-Based Grant', amount_awarded: 11400, status: 'Awarded', academic_year: '2026-2027' },
  { family_id: F_JOHNSON, program: 'Sibling Discount', amount_awarded: 1500, status: 'Awarded', academic_year: '2026-2027' },
  { family_id: F_SIMMONS, program: 'Need-Based Grant', amount_awarded: null, status: 'Under Review', academic_year: '2026-2027' },
  { family_id: F_MEYER, program: 'Merit Scholarship', amount_awarded: 5000, status: 'Awarded', academic_year: '2026-2027' },
  { family_id: F_RUIZ, program: 'Sibling Discount', amount_awarded: 2200, status: 'Awarded', academic_year: '2026-2027' },
  { family_id: F_KIM, program: 'Merit Scholarship', amount_awarded: null, status: 'Denied', academic_year: '2026-2027' },
];
insertAid.run.bind(insertAid);
aidData.forEach((a) => insertAid.run(a));

// ---------- activities (shared timeline log) ----------
const insertActivity = db.prepare(`
  INSERT INTO activities (type, subject, related_type, related_id, owner_user_id, occurred_at, notes)
  VALUES (@type, @subject, @related_type, @related_id, @owner_user_id, @occurred_at, @notes)
`);
const activitiesData = [
  { type: 'Call', subject: 'Called Diego Castellanos re: inquiry', related_type: 'inquiry', related_id: INQ_EMMA, owner_user_id: MARCUS, occurred_at: '2026-09-11 09:15', notes: 'Left voicemail, will follow up by email.' },
  { type: 'Email', subject: 'Sent application checklist to Grace Whitcombe', related_type: 'inquiry', related_id: INQ_NOAH, owner_user_id: MARCUS, occurred_at: '2026-09-09 14:00', notes: null },
  { type: 'Tour Attendance', subject: 'Okafor... Okonkwo family attended Open House', related_type: 'tour', related_id: TOUR_OPENHOUSE, owner_user_id: PRIYA, occurred_at: '2026-09-05 18:30', notes: 'Very positive feedback on the science labs.' },
  { type: 'Note', subject: 'Application file complete for Ethan Park', related_type: 'applicant', related_id: APP_ETHAN, owner_user_id: JORDAN, occurred_at: '2026-09-02 11:00', notes: 'Transcript and recommendation letters received.' },
  { type: 'Email', subject: 'Sent interview confirmation to Colin Brennan', related_type: 'applicant', related_id: APP_MAYA, owner_user_id: MARCUS, occurred_at: '2026-09-13 10:20', notes: null },
  { type: 'Call', subject: 'Discussed financial aid timeline with Angela Simmons', related_type: 'family', related_id: F_SIMMONS, owner_user_id: SOFIA, occurred_at: '2026-09-08 15:45', notes: 'Explained the overdue balance and set a payment plan.' },
  { type: 'Note', subject: 'Acceptance letter mailed to Kenji Nakamura', related_type: 'applicant', related_id: APP_ZOE, owner_user_id: PRIYA, occurred_at: '2026-08-28 09:00', notes: null },
  { type: 'Email', subject: 'Enrollment contract sent to the Ruiz family', related_type: 'family', related_id: F_RUIZ, owner_user_id: JORDAN, occurred_at: '2026-05-16 13:00', notes: null },
  { type: 'Call', subject: 'Followed up on waitlist status with Luis Marquez', related_type: 'applicant', related_id: APP_ISABELLA, owner_user_id: MARCUS, occurred_at: '2026-09-06 16:10', notes: 'Explained current 6th grade capacity constraints.' },
  { type: 'Note', subject: 'Logged shadow day feedback for Mason Lee', related_type: 'applicant', related_id: APP_MASON, owner_user_id: NATHANIEL, occurred_at: '2026-09-07 12:30', notes: 'Coaches spoke highly of his leadership on the field.' },
  { type: 'Email', subject: 'Sent financial aid award letter to Karen Meyer', related_type: 'family', related_id: F_MEYER, owner_user_id: SOFIA, occurred_at: '2026-07-30 10:00', notes: null },
  { type: 'Call', subject: 'Reminder call ahead of Grace Thompson interview', related_type: 'applicant', related_id: APP_GRACE, owner_user_id: PRIYA, occurred_at: '2026-09-14 09:00', notes: 'Confirmed 10am Thursday, parent interview to follow.' },
];
insertActivity.run.bind(insertActivity);
activitiesData.forEach((a) => insertActivity.run(a));

// ---------- automations ----------
const insertAutomation = db.prepare(`
  INSERT INTO automations (name, trigger_desc, action_desc, active, runs_30d)
  VALUES (@name, @trigger_desc, @action_desc, @active, @runs_30d)
`);
const automationsData = [
  { name: 'Send Tour Confirmation Email', trigger_desc: 'A family registers for a Campus Tour, Open House, or Shadow Day', action_desc: 'Send an automated confirmation email with visit details, parking, and a campus map', active: 1, runs_30d: 28 },
  { name: 'Notify Admissions Team on New Inquiry', trigger_desc: 'A new inquiry is submitted through the website form', action_desc: 'Post a summary to the admissions team channel and assign an owner round-robin', active: 1, runs_30d: 19 },
  { name: 'Flag Overdue Tuition After 14 Days', trigger_desc: 'A tuition invoice remains unpaid 14 days past its due date', action_desc: 'Mark the invoice Overdue and notify the Finance office for follow-up', active: 1, runs_30d: 6 },
  { name: 'Remind Family 3 Days Before Interview', trigger_desc: 'An admissions interview is scheduled 3 days out', action_desc: 'Send an automated reminder email and text to the parent and interviewer', active: 1, runs_30d: 11 },
  { name: 'Waitlist Movement Alert', trigger_desc: 'A grade-level seat opens up after an acceptance is declined', action_desc: 'Notify the admissions director to review the waitlist for that grade', active: 0, runs_30d: 0 },
];
insertAutomation.run.bind(insertAutomation);
automationsData.forEach((a) => insertAutomation.run(a));

console.log('Seed complete:');
console.log(`  users: ${usersData.length}`);
console.log(`  inquiries: ${inquiriesData.length}`);
console.log(`  applicants: ${applicantsData.length}`);
console.log(`  tours_events: ${toursData.length}`);
console.log(`  interviews: ${interviewsData.length}`);
console.log(`  families: ${familiesData.length}`);
console.log(`  students: ${studentsData.length}`);
console.log(`  tuition_invoices: ${invoicesData.length}`);
console.log(`  financial_aid: ${aidData.length}`);
console.log(`  activities: ${activitiesData.length}`);
console.log(`  automations: ${automationsData.length}`);
