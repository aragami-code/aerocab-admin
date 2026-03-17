import { create } from 'zustand';

interface AdminUser {
  id: string;
  phone: string;
  name: string | null;
  role: string;
}

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: AdminUser, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch {
    return true;
  }
}

export const useAdminAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (user, token) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');
    if (token && userStr) {
      try {
        if (isTokenExpired(token)) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          return;
        }
        const user = JSON.parse(userStr);
        if (user.role === 'admin') {
          set({ user, token, isAuthenticated: true });
        } else {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
        }
      } catch {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
  },
}));
