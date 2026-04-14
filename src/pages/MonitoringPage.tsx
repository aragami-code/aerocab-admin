import { useState, useEffect, useCallback } from 'react';
import { MapPin, User, Car, RefreshCw, Loader2, Activity, Navigation } from 'lucide-react';
import { adminApi } from '../services/api';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed:          { label: 'Confirmée',       color: 'bg-blue-100 text-blue-700' },
  arrived_at_airport: { label: 'À l\'aéroport',  color: 'bg-yellow-100 text-yellow-700' },
  in_progress:        { label: 'En cours',        color: 'bg-green-100 text-green-700' },
};

const TYPE_LABELS: Record<string, string> = {
  ARRIVAL:       'Arrivée',
  DEPARTURE:     'Départ',
  INTERNATIONAL: 'International',
};

export function MonitoringPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      const [b, d] = await Promise.all([
        adminApi.getActiveBookings(),
        adminApi.getOnlineDrivers(),
      ]);
      setBookings(b);
      setDrivers(d);
      setLastRefresh(new Date());
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-800">Monitoring</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Temps réel — actualisé le {lastRefresh.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{bookings.length}</p>
            <p className="text-sm text-slate-500">Courses actives</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Navigation className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{drivers.length}</p>
            <p className="text-sm text-slate-500">Chauffeurs en ligne</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Active Bookings */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-slate-800">Courses actives</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Aucune course active
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {bookings.map((b) => {
                const statusCfg = STATUS_LABELS[b.status] ?? { label: b.status, color: 'bg-slate-100 text-slate-700' };
                return (
                  <div key={b.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">#{b.id.slice(-6)}</span>
                        <span className="text-xs font-medium text-slate-500">
                          {TYPE_LABELS[b.type] ?? b.type}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{b.passenger?.name ?? b.passenger?.phone ?? '—'}</span>
                      </div>
                      {b.driverProfile && (
                        <div className="flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {b.driverProfile.user?.name ?? '—'}
                            {b.driverProfile.vehicleBrand ? ` · ${b.driverProfile.vehicleBrand}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    {b.pickupAddress && (
                      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {b.pickupAddress}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Online Drivers */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-slate-800">Chauffeurs en ligne</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Aucun chauffeur disponible
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {drivers.map((d) => (
                <div key={d.id} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {(d.user?.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{d.user?.name ?? d.user?.phone ?? '—'}</p>
                      <p className="text-xs text-slate-400">
                        {d.driverType ?? 'Standard'} · {d.vehicleBrand} {d.vehicleModel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{d.totalRides} courses</p>
                    {d.latitude && (
                      <p className="text-xs text-slate-400">
                        {d.latitude.toFixed(4)}, {d.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
