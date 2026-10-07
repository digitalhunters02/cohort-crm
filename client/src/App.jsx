import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Inquiries from './pages/Inquiries.jsx';
import Pipeline from './pages/Pipeline.jsx';
import ToursEvents from './pages/ToursEvents.jsx';
import Interviews from './pages/Interviews.jsx';
import Students from './pages/Students.jsx';
import Families from './pages/Families.jsx';
import Tuition from './pages/Tuition.jsx';
import FinancialAid from './pages/FinancialAid.jsx';
import Automations from './pages/Automations.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import WhatsApp from './pages/WhatsApp.jsx';
import Login from './pages/Login.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import { Terms, Privacy } from './pages/Legal.jsx';
import PlanGate from './plans/PlanGate.jsx';
import { useAuth } from './auth/AuthContext.jsx';
import ForcedPasswordChange from './auth/ForcedPasswordChange.jsx';
import { useT } from './auth/i18n.js';

export default function App() {
  const { token, account, checking } = useAuth();
  const { t } = useT();

  if (checking) {
    return <div className="min-h-[100dvh] flex items-center justify-center text-sm text-muted">{t('loading')}</div>;
  }

  // Signed out: only the sign-in flow and the legal pages are reachable.
  if (!token) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // Owner issued a temporary password: it must be replaced before anything else.
  if (account?.mustChangePassword) return <ForcedPasswordChange />;

  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/inquiries" element={<Inquiries />} />
      <Route path="/pipeline" element={<Pipeline />} />
      <Route path="/tours" element={<ToursEvents />} />
      <Route path="/interviews" element={<PlanGate feature="interviews" title="Interviews"><Interviews /></PlanGate>} />
      <Route path="/students" element={<Students />} />
      <Route path="/families" element={<Families />} />
      <Route path="/tuition" element={<PlanGate feature="tuition" title="Tuition"><Tuition /></PlanGate>} />
      <Route path="/financial-aid" element={<PlanGate feature="financial_aid" title="Financial Aid"><FinancialAid /></PlanGate>} />
      <Route path="/whatsapp" element={<PlanGate feature="whatsapp" title="WhatsApp"><WhatsApp /></PlanGate>} />
      <Route path="/automations" element={<PlanGate feature="automations" title="Automations"><Automations /></PlanGate>} />
      <Route path="/reports" element={<PlanGate feature="reports" title="Reports"><Reports /></PlanGate>} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
