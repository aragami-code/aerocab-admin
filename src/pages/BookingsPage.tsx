import { useState, useEffect } from 'react';
import {
  CalendarClock,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Car,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Ban,
} from 'lucide-react';
import { adminApi } from '../services/api';

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending:            { label: 'En attente',   classes: 'text-amber-600 bg-amber-50' },
  confirmed:          { label: 'Confirmée',     classes: 'text-blue-600 bg-blue-50' },
  arrived_at_airport: { label: 'Chauffeur arrivé', classes: 'text-indigo-600 bg-indigo-50' },
  in_progress:        { label: 'En cours',      classes: 'text-purple-600 bg-purple-50' },
  completed:          { label: 'Terminée',      classes: 'text-emerald-600 bg-emerald-50' },
  cancelled:          { label: 'Annulée',       classes: 'text-red-500 bg-red-50' },
};

export function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 20 });
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => { loadBookings(); }, [statusFilter, page]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.getBookings({ status: statusFilter || undefined, page, limit: 20 });
      setBookings(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string, destination: string) => {
    if (!window.confirm(`Annuler la réservation vers "${destination}" ?`)) return;
    try {
      setCancellingId(id);
      await adminApi.cancelBookingAdmin(id);
      await loadBookings();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'annulation');
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = search
    ? bookings.filter((b) =>
        (b.destination || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.passenger?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.passenger?.phone || '').includes(search)
      )
    : bookings;

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">Réservations</h2>
          <p className="text-sm text-gray-400 mt-1">Suivi et gestion de toutes les courses</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="confirmed">Confirmées</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminées</option>
          <option value="cancelled">Annulées</option>
        </select>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par passager ou destination..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-gray-500">{error}</p>
          <button onClick={loadBookings} className="text-sm text-primary font-medium hover:underline cursor-pointer">Réessayer</button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Passager</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Destination</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Chauffeur</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Statut</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Prix</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Date</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                      Aucune réservation trouvée
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => {
                    const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
                    const canCancel = !['completed', 'cancelled'].includes(b.status);
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-900">{b.passenger?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{b.passenger?.phone || ''}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-700 max-w-[160px] truncate">{b.destination || '—'}</p>
                          <p className="text-xs text-gray-400">{b.departureAirport || ''} · {b.vehicleType?.toUpperCase() || ''}</p>
                        </td>
                        <td className="px-5 py-4">
                          {b.driverProfile ? (
                            <div>
                              <p className="text-sm text-gray-700">{b.driverProfile.user?.name || '—'}</p>
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${b.driverProfile.driverType === 'internal' ? 'text-primary bg-primary/10' : 'text-emerald-700 bg-emerald-50'}`}>
                                {b.driverProfile.driverType === 'internal' ? 'Flotte AeroGo' : 'Partenaire'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Non assigné</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg ${cfg.classes}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {(b.estimatedPrice ?? 0).toLocaleString()} pts
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs text-gray-500">{formatDate(b.createdAt)}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {canCancel && (
                            <button
                              onClick={() => handleCancel(b.id, b.destination)}
                              disabled={cancellingId === b.id}
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {cancellingId === b.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Ban className="w-3 h-3" />
                              }
                              Annuler
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-gray-400">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} réservations)
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(page + 1)} disabled={page >= pagination.totalPages} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
