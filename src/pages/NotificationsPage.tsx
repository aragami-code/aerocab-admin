import { useEffect, useState } from 'react';
import {
  Bell, CheckCheck, User, Car, FileText, CreditCard,
  AlertTriangle, Clock, Banknote, Shield, Wifi,
} from 'lucide-react';
import { useNotificationsStore } from '../stores/notificationsStore';
import type { AdminNotification } from '../services/api';

function typeIcon(type: string) {
  if (type.startsWith('user.'))    return <User className="w-4 h-4" />;
  if (type.startsWith('driver.'))  return <Car className="w-4 h-4" />;
  if (type.startsWith('kyc.'))     return <Shield className="w-4 h-4" />;
  if (type.startsWith('payment.')) return <CreditCard className="w-4 h-4" />;
  if (type.startsWith('booking.')) return <AlertTriangle className="w-4 h-4" />;
  if (type.startsWith('receipt.')) return <FileText className="w-4 h-4" />;
  if (type === 'driver.withdrawal_request') return <Banknote className="w-4 h-4" />;
  return <Bell className="w-4 h-4" />;
}

function typeBg(type: string): string {
  if (type.startsWith('payment.') || type.startsWith('booking.')) return 'bg-error/15 text-error';
  if (type.startsWith('driver.withdrawal')) return 'bg-warning/15 text-warning';
  if (type.startsWith('kyc.') || type.startsWith('driver.')) return 'bg-accent/15 text-accent';
  if (type.startsWith('user.')) return 'bg-primary/10 text-primary';
  return 'bg-gray-100 text-gray-500';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

function NotifRow({ notif, onRead }: { notif: AdminNotification; onRead: (id: string) => void }) {
  return (
    <div
      onClick={() => !notif.read && onRead(notif.id)}
      className={`flex items-start gap-4 px-6 py-4 border-b border-gray-100 transition-colors ${
        notif.read ? 'bg-white' : 'bg-accent/5 cursor-pointer hover:bg-accent/10'
      }`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${typeBg(notif.type)}`}>
        {typeIcon(notif.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold truncate ${notif.read ? 'text-gray-600' : 'text-gray-900'}`}>
            {notif.title}
          </p>
          {!notif.read && (
            <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo(notif.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const { notifications, unreadCount, total, loading, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } =
    useNotificationsStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications(1, filter === 'unread');
    fetchUnreadCount();
  }, [filter]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout lu'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Tout marquer lu
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              filter === f
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f === 'all' ? `Toutes (${total})` : `Non lues (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Chargement...</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotifRow key={n.id} notif={n} onRead={markAsRead} />
          ))
        )}
      </div>
    </div>
  );
}
