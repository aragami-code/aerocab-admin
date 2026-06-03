import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { DriversPage } from './pages/DriversPage';
import { UsersPage } from './pages/UsersPage';
import { ReportsPage } from './pages/ReportsPage';
import { TariffsPage } from './pages/TariffsPage';
import { PromosPage } from './pages/PromosPage';
import { AirportsPage } from './pages/AirportsPage';
import { ForfaitsPage } from './pages/ForfaitsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { BookingsPage } from './pages/BookingsPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AdminsPage } from './pages/AdminsPage';
import { RolesPage } from './pages/RolesPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import { SettingsPage } from './pages/SettingsPage';
import { FeatureFlagsPage } from './pages/FeatureFlagsPage';
import { LoginPage } from './pages/LoginPage';
import { AnnoncesPage } from './pages/AnnoncesPage';
import { CountryProvider } from './contexts/CountryContext';
import { useAdminAuthStore } from './stores/authStore';
import { usePermissionsStore } from './stores/permissionsStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PermissionRoute({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { permissions, loaded } = usePermissionsStore((s) => ({ permissions: s.permissions, loaded: s.loaded }));
  if (!loaded) return null;
  // Empty permissions = super_admin (all access)
  if (permissions.length > 0 && !permissions.includes(permission)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const hydrate = useAdminAuthStore((s) => s.hydrate);
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  const loadPermissions = usePermissionsStore((s) => s.load);
  const clearPermissions = usePermissionsStore((s) => s.clear);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPermissions();
    } else {
      clearPermissions();
    }
  }, [isAuthenticated, loadPermissions, clearPermissions]);

  return (
    <CountryProvider>
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
        <Route path="/monitoring"  element={<PermissionRoute permission="view_active_bookings"><MonitoringPage /></PermissionRoute>} />
        <Route path="/analytics"   element={<PermissionRoute permission="view_stats"><AnalyticsPage /></PermissionRoute>} />
        <Route path="/bookings"    element={<PermissionRoute permission="view_bookings"><BookingsPage /></PermissionRoute>} />
        <Route path="/drivers"     element={<PermissionRoute permission="view_drivers"><DriversPage /></PermissionRoute>} />
        <Route path="/users"       element={<PermissionRoute permission="view_users"><UsersPage /></PermissionRoute>} />
        <Route path="/reports"     element={<PermissionRoute permission="view_reports"><ReportsPage /></PermissionRoute>} />
        <Route path="/tariffs"     element={<PermissionRoute permission="view_tariffs"><TariffsPage /></PermissionRoute>} />
        <Route path="/airports"    element={<PermissionRoute permission="view_airports"><AirportsPage /></PermissionRoute>} />
        <Route path="/forfaits"    element={<PermissionRoute permission="view_tariffs"><ForfaitsPage /></PermissionRoute>} />
        <Route path="/promos"      element={<PermissionRoute permission="view_promos"><PromosPage /></PermissionRoute>} />
        <Route path="/referrals"   element={<PermissionRoute permission="view_referrals"><ReferralsPage /></PermissionRoute>} />
        <Route path="/audit"       element={<PermissionRoute permission="view_audit_logs"><AuditLogsPage /></PermissionRoute>} />
        <Route path="/withdrawals" element={<PermissionRoute permission="view_withdrawals"><WithdrawalsPage /></PermissionRoute>} />
        <Route path="/admins"      element={<PermissionRoute permission="view_admins"><AdminsPage /></PermissionRoute>} />
        <Route path="/roles"       element={<PermissionRoute permission="view_roles"><RolesPage /></PermissionRoute>} />
        <Route path="/settings"       element={<PermissionRoute permission="edit_settings"><SettingsPage /></PermissionRoute>} />
        <Route path="/feature-flags"  element={<PermissionRoute permission="manage_feature_flags"><FeatureFlagsPage /></PermissionRoute>} />
        <Route path="/annonces"       element={<PermissionRoute permission="manage_announcements"><AnnoncesPage /></PermissionRoute>} />
      </Route>
    </Routes>
    </CountryProvider>
  );
}
