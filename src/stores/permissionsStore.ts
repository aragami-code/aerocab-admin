import { create } from 'zustand';
import { adminApi } from '../services/api';

type PermissionsStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface PermissionsState {
  permissions: string[];
  status: PermissionsStatus;
  load: () => Promise<void>;
  clear: () => void;
}

export const usePermissionsStore = create<PermissionsState>((set) => ({
  permissions: [],
  status: 'idle',

  load: async () => {
    set({ status: 'loading' });
    try {
      const perms = await adminApi.getMyPermissions();
      set({ permissions: perms, status: 'loaded' });
    } catch {
      // Fail-closed: on error we do NOT know the admin's real permissions.
      // Deny everything until a retry succeeds — never assume full access.
      set({ permissions: [], status: 'error' });
    }
  },

  clear: () => set({ permissions: [], status: 'idle' }),
}));
