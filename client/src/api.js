// In local dev, "/api" is proxied to the local server (see vite.config.js).
// In production there's no such proxy, so VITE_API_URL must point at the
// deployed backend's base URL (e.g. https://cohort-crm-api.onrender.com).
// Exported so Settings can show the exact webhook callback URL to paste
// into Meta's WhatsApp console.
export const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

async function handle(r) {
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
}

function get(path) {
  return fetch(BASE + path).then(handle);
}

function post(path, body) {
  return fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle);
}

function put(path, body) {
  return fetch(BASE + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle);
}

function patch(path, body) {
  return fetch(BASE + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle);
}

function del(path) {
  return fetch(BASE + path, { method: 'DELETE' }).then(handle);
}

const api = {
  dashboard: () => get('/dashboard'),
  reports: () => get('/reports'),

  // ---- staff (users) ----
  users: () => get('/users'),
  createUser: (data) => post('/users', data),
  updateUser: (id, data) => put(`/users/${id}`, data),
  deleteUser: (id) => del(`/users/${id}`),

  // ---- inquiries ----
  inquiries: () => get('/inquiries'),
  createInquiry: (data) => post('/inquiries', data),
  updateInquiry: (id, data) => put(`/inquiries/${id}`, data),
  deleteInquiry: (id) => del(`/inquiries/${id}`),

  // ---- applicants ----
  applicants: () => get('/applicants'),
  createApplicant: (data) => post('/applicants', data),
  updateApplicant: (id, data) => put(`/applicants/${id}`, data),
  deleteApplicant: (id) => del(`/applicants/${id}`),
  setApplicantStage: (id, stage) => patch(`/applicants/${id}/stage`, { stage }),

  // ---- tours & events ----
  tours: () => get('/tours-events'),
  createTour: (data) => post('/tours-events', data),
  updateTour: (id, data) => put(`/tours-events/${id}`, data),
  deleteTour: (id) => del(`/tours-events/${id}`),

  // ---- interviews ----
  interviews: () => get('/interviews'),
  createInterview: (data) => post('/interviews', data),
  updateInterview: (id, data) => put(`/interviews/${id}`, data),
  deleteInterview: (id) => del(`/interviews/${id}`),

  // ---- families ----
  families: () => get('/families'),
  createFamily: (data) => post('/families', data),
  updateFamily: (id, data) => put(`/families/${id}`, data),
  deleteFamily: (id) => del(`/families/${id}`),

  // ---- students ----
  students: () => get('/students'),
  createStudent: (data) => post('/students', data),
  updateStudent: (id, data) => put(`/students/${id}`, data),
  deleteStudent: (id) => del(`/students/${id}`),

  // ---- tuition invoices ----
  invoices: () => get('/tuition-invoices'),
  createInvoice: (data) => post('/tuition-invoices', data),
  updateInvoice: (id, data) => put(`/tuition-invoices/${id}`, data),
  deleteInvoice: (id) => del(`/tuition-invoices/${id}`),

  // ---- financial aid ----
  financialAid: () => get('/financial-aid'),
  createFinancialAid: (data) => post('/financial-aid', data),
  updateFinancialAid: (id, data) => put(`/financial-aid/${id}`, data),
  deleteFinancialAid: (id) => del(`/financial-aid/${id}`),

  // ---- activities ----
  activities: () => get('/activities'),
  createActivity: (data) => post('/activities', data),
  deleteActivity: (id) => del(`/activities/${id}`),

  // ---- automations ----
  automations: () => get('/automations'),
  createAutomation: (data) => post('/automations', data),
  toggleAutomation: (id) => patch(`/automations/${id}/toggle`, {}),
  deleteAutomation: (id) => del(`/automations/${id}`),

  // ---- WhatsApp Business (shared, whole-school connection) ----
  whatsappStatus: () => get('/integrations/whatsapp/status'),
  whatsappConnect: (data) => post('/integrations/whatsapp/connect', data),
  whatsappDisconnect: () => post('/integrations/whatsapp/disconnect', {}),
  whatsappConversations: () => get('/integrations/whatsapp/conversations'),
  whatsappConversation: (phone) => get(`/integrations/whatsapp/conversations/${encodeURIComponent(phone)}`),
  whatsappSend: (to, text) => post('/integrations/whatsapp/send', { to, text }),
};

export default api;
