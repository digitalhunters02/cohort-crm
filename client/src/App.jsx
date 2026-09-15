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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/inquiries" element={<Inquiries />} />
      <Route path="/pipeline" element={<Pipeline />} />
      <Route path="/tours" element={<ToursEvents />} />
      <Route path="/interviews" element={<Interviews />} />
      <Route path="/students" element={<Students />} />
      <Route path="/families" element={<Families />} />
      <Route path="/tuition" element={<Tuition />} />
      <Route path="/financial-aid" element={<FinancialAid />} />
      <Route path="/automations" element={<Automations />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
