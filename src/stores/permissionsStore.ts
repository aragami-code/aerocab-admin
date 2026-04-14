import { create } from 'zustand';
import { adminApi } from '../services/api';

interface PermissionsState {
  permissions: string[];
  loaded: boolean;
  load: () => Promise<void>;
  clear: () => void;
}

export const usePermissionsStore = create<PermissionsState>((set) => ({
  permissions: [],
  loaded: false,

  load: async () => {
    try {
      const perms = await adminApi.getMyPermissions();
      set({ permissions: perms, loaded: true });
    } catch {
      // Super-admin fallback: if endpoint fails, assume all access
      set({ permissions: [], loaded: true });
    }
  },

  clear: () => set({ permissions: [], loaded: false }),
}));
