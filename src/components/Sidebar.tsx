import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  Users,
  Ticket,
  AlertTriangle,
  LogOut,
  Plane,
} from 'lucide-react';
import { useAdminAuthStore } from '../stores/authStore';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/drivers', label: 'Chauffeurs', icon: Car },
  { path: '/users', label: 'Utilisateurs', icon: Users },
  { path: '/access', label: 'Acces 48h', icon: Ticket },
  { path: '/reports', label: 'Signalements', icon: AlertTriangle },
];

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
              AeroCab
            </h1>
            <p className="text-xs text-white/50 font-medium">Administration</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold px-3 mb-3">
          Menu principal
        </p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
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
                    isActive
                      ? 'text-accent'
                      : 'text-white/40 group-hover:text-white/70'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-sm shadow-accent/50" />
                )}
              </NavLink>
            );
          })}
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
            AeroCab Connect v0.1.0
          </p>
        </div>
      </div>
    </aside>
  );
}
