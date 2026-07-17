import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { BrandingPage } from './pages/BrandingPage';
import { DriversPage } from './pages/DriversPage';
import { UsersPage } from './pages/UsersPage';
import { ReportsPage } from './pages/ReportsPage';
import { TariffsPage } from './pages/TariffsPage';
import { PromosPage } from './pages/PromosPage';
import { AirportsPage } from './pages/AirportsPage';
import { ForfaitsPage } from './pages/ForfaitsPage';
import ZonesPage from './pages/ZonesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { BookingsPage } from './pages/BookingsPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { MetricsPage } from './pages/MetricsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { RevenuePage } from './pages/RevenuePage';
import { AdminsPage } from './pages/AdminsPage';
import { RolesPage } from './pages/RolesPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import { KycPage } from './pages/KycPage';
import { SettingsPage } from './pages/SettingsPage';
import { FeatureFlagsPage } from './pages/FeatureFlagsPage';
import { BotPage } from './pages/BotPage';
import { CountryChangeRequestsPage } from './pages/CountryChangeRequestsPage';
import { PublicTrackingPage } from './pages/PublicTrackingPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AnnoncesPage } from './pages/AnnoncesPage';
import { PaysPage } from './pages/PaysPage';
import { LoginPage } from './pages/LoginPage';
import { SessionExpiredModal } from './components/SessionExpiredModal';
import { CountryProvider } from './contexts/CountryContext';
import { useAdminAuthStore } from './stores/authStore';
import { usePermissionsStore } from './stores/permissionsStore';
import { useNotificationsStore } from './stores/notificationsStore';
import { connectAdminSocket, disconnectAdminSocket } from './services/adminSocket';
import type { AdminNotification } from './services/api';

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
  const { permissions, status } = usePermissionsStore((s) => ({ permissions: s.permissions, status: s.status }));
  if (status === 'idle' || status === 'loading') return null;
  // Fail-closed: on error (permissions unknown) or missing permission, deny access.
  if (!permissions.includes(permission)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const hydrate = useAdminAuthStore((s) => s.hydrate);
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  const token = useAdminAuthStore((s) => s.token);
  const loadPermissions = usePermissionsStore((s) => s.load);
  const clearPermissions = usePermissionsStore((s) => s.clear);
  const { fetchUnreadCount, addNotification } = useNotificationsStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPermissions();
      fetchUnreadCount();
    } else {
      clearPermissions();
    }
  }, [isAuthenticated, loadPermissions, clearPermissions, fetchUnreadCount]);

  // WebSocket — rejoindre admin:dashboard et écouter les notifications
  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectAdminSocket();
      return;
    }

    const socket = connectAdminSocket(token);

    socket.on('admin:notification', (notif: AdminNotification) => {
      addNotification(notif);
    });

    return () => {
      socket.off('admin:notification');
    };
  }, [isAuthenticated, token, addNotification]);

  return (
    <CountryProvider>
    <SessionExpiredModal />
    <Routes>
      <Route path="/track/:token" element={<PublicTrackingPage />} />
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
        <Route path="/metrics"     element={<PermissionRoute permission="edit_settings"><MetricsPage /></PermissionRoute>} />
        <Route path="/analytics"   element={<PermissionRoute permission="view_stats"><AnalyticsPage /></PermissionRoute>} />
        <Route path="/revenue"     element={<PermissionRoute permission="view_stats"><RevenuePage /></PermissionRoute>} />
        <Route path="/bookings"    element={<PermissionRoute permission="view_bookings"><BookingsPage /></PermissionRoute>} />
        <Route path="/drivers"     element={<PermissionRoute permission="view_drivers"><DriversPage /></PermissionRoute>} />
        <Route path="/users"       element={<PermissionRoute permission="view_users"><UsersPage /></PermissionRoute>} />
        <Route path="/reports"     element={<PermissionRoute permission="view_reports"><ReportsPage /></PermissionRoute>} />
        <Route path="/tariffs"     element={<PermissionRoute permission="view_tariffs"><TariffsPage /></PermissionRoute>} />
        <Route path="/airports"    element={<PermissionRoute permission="view_airports"><AirportsPage /></PermissionRoute>} />
        <Route path="/forfaits"    element={<PermissionRoute permission="view_tariffs"><ForfaitsPage /></PermissionRoute>} />
        <Route path="/zones"       element={<PermissionRoute permission="view_tariffs"><ZonesPage /></PermissionRoute>} />
        <Route path="/promos"      element={<PermissionRoute permission="view_promos"><PromosPage /></PermissionRoute>} />
        <Route path="/referrals"   element={<PermissionRoute permission="view_referrals"><ReferralsPage /></PermissionRoute>} />
        <Route path="/audit"       element={<PermissionRoute permission="view_audit_logs"><AuditLogsPage /></PermissionRoute>} />
        <Route path="/withdrawals" element={<PermissionRoute permission="view_withdrawals"><WithdrawalsPage /></PermissionRoute>} />
        <Route path="/kyc"             element={<PermissionRoute permission="view_users"><KycPage /></PermissionRoute>} />
        <Route path="/country-changes" element={<PermissionRoute permission="edit_driver_profile"><CountryChangeRequestsPage /></PermissionRoute>} />
        <Route path="/admins"          element={<PermissionRoute permission="view_admins"><AdminsPage /></PermissionRoute>} />
        <Route path="/roles"       element={<PermissionRoute permission="view_roles"><RolesPage /></PermissionRoute>} />
        <Route path="/settings"       element={<PermissionRoute permission="edit_settings"><SettingsPage /></PermissionRoute>} />
        <Route path="/feature-flags"  element={<PermissionRoute permission="manage_feature_flags"><FeatureFlagsPage /></PermissionRoute>} />
        <Route path="/bot"            element={<PermissionRoute permission="edit_settings"><BotPage /></PermissionRoute>} />
        <Route path="/annonces"       element={<PermissionRoute permission="manage_announcements"><AnnoncesPage /></PermissionRoute>} />
        <Route path="/branding"   element={<PermissionRoute permission="manage_branding"><BrandingPage /></PermissionRoute>} />
        <Route path="/pays"           element={<PermissionRoute permission="manage_countries"><PaysPage /></PermissionRoute>} />
        <Route path="/notifications"  element={<NotificationsPage />} />
      </Route>
    </Routes>
    </CountryProvider>
  );
}
