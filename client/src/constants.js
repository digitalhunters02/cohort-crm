// Validated categorical hex values used for chart marks. Keep these exact —
// do not substitute the softer Tailwind badge tokens here, those are
// accessibility-adjusted for text-on-white.
export const STAGE_COLORS = {
  Inquiry: '#8b8478',
  'Tour Scheduled': '#3a6a94',
  'Application Submitted': '#a8791f',
  'Interview Scheduled': '#71578f',
  Accepted: '#3f7a3a',
  Waitlisted: '#b8862e',
  Enrolled: '#7a2331',
  Declined: '#c0475a',
};

export const STAGE_TONE = {
  Inquiry: 'neutral',
  'Tour Scheduled': 'blue',
  'Application Submitted': 'amber',
  'Interview Scheduled': 'violet',
  Accepted: 'green',
  Waitlisted: 'gold',
  Enrolled: 'brand',
  Declined: 'rose',
};

export const STAGES = [
  'Inquiry', 'Tour Scheduled', 'Application Submitted', 'Interview Scheduled',
  'Accepted', 'Waitlisted', 'Enrolled', 'Declined',
];

export const INQUIRY_STATUSES = ['New', 'Contacted', 'Nurturing', 'Converted', 'Closed'];
export const INQUIRY_STATUS_TONE = {
  New: 'blue',
  Contacted: 'amber',
  Nurturing: 'violet',
  Converted: 'green',
  Closed: 'neutral',
};

export const INQUIRY_SOURCES = ['Website', 'Referral', 'School Fair', 'Open House', 'Other'];

export const TOUR_TYPES = ['Campus Tour', 'Open House', 'Shadow Day', 'Info Session'];
export const TOUR_TYPE_TONE = {
  'Campus Tour': 'blue',
  'Open House': 'brand',
  'Shadow Day': 'teal',
  'Info Session': 'violet',
};

export const INTERVIEW_STATUSES = ['Scheduled', 'Completed', 'No-show', 'Cancelled'];
export const INTERVIEW_STATUS_TONE = {
  Scheduled: 'blue',
  Completed: 'green',
  'No-show': 'rose',
  Cancelled: 'neutral',
};

export const STUDENT_STATUSES = ['Active', 'Withdrawn', 'Graduated'];
export const STUDENT_STATUS_TONE = {
  Active: 'green',
  Withdrawn: 'rose',
  Graduated: 'gold',
};

export const GRADES = [
  'Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade',
  '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade',
];

export const TUITION_STATUSES = ['Paid', 'Partial', 'Overdue', 'Pending'];
export const TUITION_STATUS_TONE = {
  Paid: 'green',
  Partial: 'amber',
  Overdue: 'rose',
  Pending: 'neutral',
};

export const AID_STATUSES = ['Under Review', 'Awarded', 'Denied'];
export const AID_STATUS_TONE = {
  'Under Review': 'amber',
  Awarded: 'green',
  Denied: 'rose',
};

export const AID_PROGRAMS = ['Need-Based Grant', 'Merit Scholarship', 'Sibling Discount', 'Faculty Discount'];

export const ACTIVITY_TYPES = ['Call', 'Email', 'Note', 'Tour Attendance', 'Task'];
export const ACTIVITY_ICON = {
  Call: 'phone',
  Email: 'mail',
  Note: 'clipboardList',
  'Tour Attendance': 'calendar',
  Task: 'checkCircle',
};

export const STAFF_COLORS = ['#7a2331', '#a8791f', '#3a6a94', '#3f7a3a', '#71578f', '#b8862e', '#3c7d68'];
