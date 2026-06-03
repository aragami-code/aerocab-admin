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
  Banknote,
  Settings,
  ToggleLeft,
  MapPin,
  Megaphone,
} from 'lucide-react';
import { useAdminAuthStore } from '../stores/authStore';
import { usePermission } from './Can';
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
  { path: '/bookings',    label: 'Réservations',      icon: CalendarClock,    section: 'main', permission: 'view_bookings' },
  { path: '/drivers',     label: 'Chauffeurs',        icon: Car,              section: 'main', permission: 'view_drivers' },
  { path: '/users',       label: 'Utilisateurs',      icon: Users,            section: 'main', permission: 'view_users' },
  { path: '/reports',     label: 'Signalements',      icon: AlertTriangle,    section: 'main', permission: 'view_reports' },
  { path: '/tariffs',     label: 'Tarifs & Points',   icon: SlidersHorizontal,section: 'main', permission: 'view_tariffs' },
  { path: '/airports',    label: 'Aéroports',         icon: Plane,            section: 'main', permission: 'view_airports' },
  { path: '/forfaits',    label: 'Forfaits trajet',   icon: MapPin,           section: 'main', permission: 'view_tariffs' },
  { path: '/promos',      label: 'Codes Promo',       icon: Tag,              section: 'main', permission: 'view_promos' },
  { path: '/referrals',   label: 'Parrainage',        icon: Share2,           section: 'main', permission: 'view_referrals' },
  { path: '/withdrawals', label: 'Retraits',          icon: Banknote,         section: 'main', permission: 'view_withdrawals' },
  { path: '/audit',       label: 'Journal d\'audit',  icon: ClipboardList,    section: 'main', permission: 'view_audit_logs' },
  { path: '/admins',        label: 'Administrateurs',   icon: UserCog,     section: 'admin', permission: 'view_admins' },
  { path: '/roles',         label: 'Rôles',             icon: Shield,      section: 'admin', permission: 'view_roles' },
  { path: '/feature-flags', label: 'Feature Flags',     icon: ToggleLeft,  section: 'admin', permission: 'manage_feature_flags' },
  { path: '/settings',      label: 'Configuration',     icon: Settings,    section: 'admin', permission: 'edit_settings' },
  { path: '/annonces',      label: 'Annonces',          icon: Megaphone,   section: 'admin', permission: 'manage_announcements' },
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-72 bg-gradient-to-b from-primary to-primary-dark text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-white/10">
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
        {/* Country selector */}
        <div className="mt-4">
          <CountrySelector />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3">
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
      <div className="px-4 pb-6">
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
