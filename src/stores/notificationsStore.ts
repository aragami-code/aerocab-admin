import { create } from 'zustand';
import { adminApi, type AdminNotification } from '../services/api';

interface NotificationsState {
  notifications: AdminNotification[];
  unreadCount: number;
  total: number;
  page: number;
  loading: boolean;
  fetchNotifications: (page?: number, unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notif: AdminNotification) => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  page: 1,
  loading: false,

  fetchNotifications: async (page = 1, unreadOnly = false) => {
    set({ loading: true });
    try {
      const res = await adminApi.getNotifications({ page, limit: 30, unread: unreadOnly });
      set({ notifications: res.data, total: res.total, page: res.page, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await adminApi.getUnreadNotificationCount();
      set({ unreadCount: res.count });
    } catch {}
  },

  markAsRead: async (id: string) => {
    await adminApi.markNotificationRead(id);
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n,
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllAsRead: async () => {
    await adminApi.markAllNotificationsRead();
    set((s) => ({
      notifications: s.notifications.map((n) => ({
        ...n, read: true, readAt: new Date().toISOString(),
      })),
      unreadCount: 0,
    }));
  },

  addNotification: (notif: AdminNotification) => {
    set((s) => ({
      notifications: [notif, ...s.notifications],
      unreadCount: s.unreadCount + 1,
      total: s.total + 1,
    }));
  },
}));
