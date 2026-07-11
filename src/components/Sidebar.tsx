import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  Users,
  AlertTriangle,
  LogOut,
  Plane,
  SlidersHorizontal,
  Tag,
  ClipboardList,
  Share2,
  CalendarClock,
  Activity,
  BarChart3,
  UserCog,
  Shield,
  ShieldCheck,
  Banknote,
  Settings,
  ToggleLeft,
  MapPin,
  Layers,
  Bot,
  Globe,
  Bell,
  LineChart,
  Megaphone,
  Wallet,
  Palette,
} from 'lucide-react';
import { useAdminAuthStore } from '../stores/authStore';
import { usePermission } from './Can';
import { useNotificationsStore } from '../stores/notificationsStore';
import { CountrySelector } from './CountrySelector';

interface NavItem {
  path: string;
  label: string;
  icon: any;
  permission?: string;
  section?: string;
}

const navItems: NavItem[] = [
  { path: '/',            label: 'Dashboard',        icon: LayoutDashboard,  section: 'main' },
  { path: '/monitoring',  label: 'Monitoring',        icon: Activity,         section: 'main', permission: 'view_active_bookings' },
  { path: '/analytics',   label: 'Analytics',         icon: BarChart3,        section: 'main', permission: 'view_stats' },
  { path: '/revenue',     label: 'Revenus',           icon: Wallet,           section: 'main', permission: 'view_stats' },
  { path: '/metrics',     label: 'Métriques Infra',   icon: LineChart,        section: 'admin', permission: 'edit_settings' },
  { path: '/bookings',    label: 'Réservations',      icon: CalendarClock,    section: 'main', permission: 'view_bookings' },
  { path: '/drivers',     label: 'Chauffeurs',        icon: Car,              section: 'main', permission: 'view_drivers' },
  { path: '/users',       label: 'Utilisateurs',      icon: Users,            section: 'main', permission: 'view_users' },
  { path: '/reports',     label: 'Signalements',      icon: AlertTriangle,    section: 'main', permission: 'view_reports' },
  { path: '/tariffs',     label: 'Tarifs & Points',   icon: SlidersHorizontal,section: 'main', permission: 'view_tariffs' },
  { path: '/airports',    label: 'Aéroports',         icon: Plane,            section: 'main', permission: 'view_airports' },
  { path: '/forfaits',    label: 'Forfaits trajet',   icon: MapPin,           section: 'main', permission: 'view_tariffs' },
  { path: '/zones',       label: 'Zones tarifaires',  icon: Layers,           section: 'main', permission: 'view_tariffs' },
  { path: '/promos',      label: 'Codes Promo',       icon: Tag,              section: 'main', permission: 'view_promos' },
  { path: '/referrals',   label: 'Parrainage',        icon: Share2,           section: 'main', permission: 'view_referrals' },
  { path: '/withdrawals', label: 'Retraits',          icon: Banknote,         section: 'main', permission: 'view_withdrawals' },
  { path: '/kyc',             label: 'Vérif. Identité',   icon: ShieldCheck,  section: 'main', permission: 'view_users' },
  { path: '/country-changes', label: 'Chgt de pays',      icon: Globe,        section: 'main', permission: 'edit_driver_profile' },
  { path: '/audit',           label: 'Journal d\'audit',  icon: ClipboardList,section: 'main', permission: 'view_audit_logs' },
  { path: '/admins',        label: 'Administrateurs',   icon: UserCog,     section: 'admin', permission: 'view_admins' },
  { path: '/roles',         label: 'Rôles',             icon: Shield,      section: 'admin', permission: 'view_roles' },
  { path: '/feature-flags', label: 'Feature Flags',     icon: ToggleLeft,    section: 'admin', permission: 'manage_feature_flags' },
  { path: '/bot',           label: 'Bot Assistant',     icon: Bot,           section: 'admin', permission: 'edit_settings' },
  { path: '/settings',      label: 'Configuration',     icon: Settings,      section: 'admin', permission: 'edit_settings' },
  { path: '/annonces',      label: 'Annonces',          icon: Megaphone,     section: 'admin', permission: 'manage_announcements' },
  { path: '/branding',      label: 'Apparence',         icon: Palette,       section: 'admin', permission: 'manage_branding' },
  { path: '/pays',          label: 'Pays',              icon: Globe,         section: 'admin', permission: 'manage_countries' },
];

function NavItemComponent({ item, location }: { item: NavItem; location: any }) {
  const hasPermission = usePermission(item.permission ?? '');
  if (item.permission && !hasPermission) return null;

  const Icon = item.icon;
  const isActive =
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path);

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
        isActive
          ? 'bg-white/15 text-accent shadow-sm backdrop-blur-sm'
          : 'text-white/60 hover:bg-white/8 hover:text-white/90'
      }`}
    >
      <Icon
        className={`w-[18px] h-[18px] transition-colors duration-200 ${
          isActive ? 'text-accent' : 'text-white/40 group-hover:text-white/70'
        }`}
        strokeWidth={isActive ? 2.5 : 2}
      />
      <span>{item.label}</span>
      {isActive && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-sm shadow-accent/50" />
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAdminAuthStore((s) => s.logout);
  const user = useAdminAuthStore((s) => s.user);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-72 bg-gradient-to-b from-primary to-primary-dark text-white flex flex-col h-screen sticky top-0 overflow-hidden">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Plane className="w-5 h-5 text-primary-dark" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-heading tracking-tight">
                AeroGo 24
              </h1>
              <p className="text-xs text-white/50 font-medium">Administration</p>
            </div>
          </div>
          {/* Bell icon with badge */}
          <NavLink
            to="/notifications"
            className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-white/70" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-accent text-primary-dark text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        </div>
        {/* Country selector */}
        <div className="mt-4">
          <CountrySelector />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold px-3 mb-3">
          Menu principal
        </p>
        <div className="space-y-1">
          {navItems.filter(i => i.section === 'main').map((item) => (
            <NavItemComponent key={item.path} item={item} location={location} />
          ))}
        </div>

        <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold px-3 mt-5 mb-3">
          Administration
        </p>
        <div className="space-y-1">
          {navItems.filter(i => i.section === 'admin').map((item) => (
            <NavItemComponent key={item.path} item={item} location={location} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 pb-6 shrink-0">
        <div className="border-t border-white/10 pt-4">
          {user && (
            <div className="px-4 py-2 mb-2">
              <p className="text-xs text-white/50 truncate">{user.name || user.phone}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all duration-200 w-full cursor-pointer"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
            <span>Deconnexion</span>
          </button>
          <p className="text-[10px] text-white/20 text-center mt-3">
            AeroGo 24 Connect v0.1.0
          </p>
        </div>
      </div>
    </aside>
  );
}
