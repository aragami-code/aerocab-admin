import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { DriversPage } from './pages/DriversPage';
import { UsersPage } from './pages/UsersPage';
import { AccessPage } from './pages/AccessPage';
import { ReportsPage } from './pages/ReportsPage';
import { TariffsPage } from './pages/TariffsPage';
import { PromosPage } from './pages/PromosPage';
import { AirportsPage } from './pages/AirportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { BookingsPage } from './pages/BookingsPage';
import { LoginPage } from './pages/LoginPage';
import { useAdminAuthStore } from './stores/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const hydrate = useAdminAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={
        <AuthGuard><LoginPage /></AuthGuard>
      } />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/access" element={<AccessPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/tariffs" element={<TariffsPage />} />
        <Route path="/airports" element={<AirportsPage />} />
        <Route path="/promos" element={<PromosPage />} />
        <Route path="/referrals" element={<ReferralsPage />} />
        <Route path="/audit" element={<AuditLogsPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
      </Route>
    </Routes>
  );
}
