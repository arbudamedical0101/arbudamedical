import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, Role } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { Loading } from '@/components/ui';
import { ReactNode } from 'react';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Billing from '@/pages/Billing';
import Sales from '@/pages/Sales';
import Stock from '@/pages/Stock';
import Medicines from '@/pages/Medicines';
import Purchases from '@/pages/Purchases';
import Suppliers from '@/pages/Suppliers';
import Customers from '@/pages/Customers';
import Doctors from '@/pages/Doctors';
import ScheduleH1 from '@/pages/ScheduleH1';
import Prescriptions from '@/pages/Prescriptions';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import UsersPage from '@/pages/Users';
import AuditLogs from '@/pages/AuditLogs';

function Protected({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading, can } = useAuth();
  if (loading) return <Loading label="Starting up…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !can(...roles)) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* Public storefront landing page */}
      <Route path="/" element={<Landing />} />

      <Route path="/login" element={loading ? <Loading /> : user ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/billing" element={<Protected><Billing /></Protected>} />
      <Route path="/sales" element={<Protected><Sales /></Protected>} />
      <Route path="/customers" element={<Protected><Customers /></Protected>} />
      <Route path="/prescriptions" element={<Protected><Prescriptions /></Protected>} />

      <Route path="/stock" element={<Protected roles={['pharmacist']}><Stock /></Protected>} />
      <Route path="/medicines" element={<Protected roles={['pharmacist']}><Medicines /></Protected>} />
      <Route path="/purchases" element={<Protected roles={['pharmacist']}><Purchases /></Protected>} />
      <Route path="/suppliers" element={<Protected roles={['pharmacist']}><Suppliers /></Protected>} />
      <Route path="/doctors" element={<Protected roles={['pharmacist']}><Doctors /></Protected>} />
      <Route path="/h1-register" element={<Protected roles={['pharmacist']}><ScheduleH1 /></Protected>} />
      <Route path="/reports" element={<Protected roles={['pharmacist']}><Reports /></Protected>} />

      <Route path="/settings" element={<Protected roles={['admin']}><Settings /></Protected>} />
      <Route path="/users" element={<Protected roles={['admin']}><UsersPage /></Protected>} />
      <Route path="/audit" element={<Protected roles={['admin']}><AuditLogs /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
