import { useState, useEffect } from 'react';
import {
  Car,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { adminApi } from '../services/api';

const statusConfig = {
  approved: { label: 'Approuve', icon: CheckCircle, classes: 'text-emerald-600 bg-emerald-50' },
  pending: { label: 'En attente', icon: Clock, classes: 'text-amber-600 bg-amber-50' },
  rejected: { label: 'Rejete', icon: XCircle, classes: 'text-red-500 bg-red-50' },
  suspended: { label: 'Suspendu', icon: XCircle, classes: 'text-gray-500 bg-gray-100' },
};

export function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{driverId: string; name: string} | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailDriver, setDetailDriver] = useState<any>(null);

  useEffect(() => {
    loadDrivers();
  }, [statusFilter, page]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.getDrivers({
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setDrivers(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (driverId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      setActionLoading(driverId);
      await adminApi.verifyDriver(driverId, action, reason);
      await loadDrivers();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredDrivers = search
    ? drivers.filter((d) =>
        (d.user?.name || d.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.user?.phone || d.phone || '').includes(search)
      )
    : drivers;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">
            Gestion des Chauffeurs
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Validation des documents et gestion des profils chauffeurs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuves</option>
            <option value="rejected">Rejetes</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un chauffeur..."
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
          <button onClick={loadDrivers} className="text-sm text-primary font-medium hover:underline cursor-pointer">
            Reessayer
          </button>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Chauffeur</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Vehicule</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Statut</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Note</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                      Aucun chauffeur trouve
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((driver) => {
                    const driverStatus = driver.status || 'pending';
                    const status = statusConfig[driverStatus as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    const name = driver.user?.name || driver.name || 'Sans nom';
                    const phone = driver.user?.phone || driver.phone || '';
                    const vehicle = [driver.vehicleBrand, driver.vehicleModel, driver.vehicleYear].filter(Boolean).join(' ') || 'Non renseigne';

                    return (
                      <tr key={driver.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{name}</p>
                              <p className="text-xs text-gray-400">{phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Car className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600">{vehicle}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${status.classes}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {driver.ratingAvg ? `${Number(driver.ratingAvg).toFixed(1)}/5` : '--'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const detail = await adminApi.getDriverDetail(driver.id);
                                  setDetailDriver(detail);
                                } catch (err: any) { alert(err.message || 'Erreur'); }
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Voir
                            </button>
                            {driverStatus === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    if (!window.confirm(`Approuver le chauffeur ${name} ?`)) return;
                                    handleVerify(driver.id, 'approve');
                                  }}
                                  disabled={actionLoading === driver.id}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  Approuver
                                </button>
                                <button
                                  onClick={() => setRejectModal({ driverId: driver.id, name })}
                                  disabled={actionLoading === driver.id}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <ShieldX className="w-3 h-3" />
                                  Rejeter
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-gray-400">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} chauffeurs)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Rejection modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Rejeter le chauffeur</h3>
            <p className="text-sm text-gray-500 mb-4">
              Veuillez indiquer la raison du rejet pour {rejectModal.name}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Raison du rejet..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  await handleVerify(rejectModal.driverId, 'reject', rejectReason);
                  setRejectModal(null);
                  setRejectReason('');
                }}
                disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver detail modal */}
      {detailDriver && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Detail chauffeur</h3>
              <button onClick={() => setDetailDriver(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-xl">&times;</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm text-gray-500">Nom</span>
                <span className="text-sm font-medium">{detailDriver.user?.name || 'Sans nom'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm text-gray-500">Telephone</span>
                <span className="text-sm font-medium">{detailDriver.user?.phone || '--'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm text-gray-500">Vehicule</span>
                <span className="text-sm font-medium">{detailDriver.vehicleBrand} {detailDriver.vehicleModel} ({detailDriver.vehicleColor})</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm text-gray-500">Plaque</span>
                <span className="text-sm font-medium">{detailDriver.vehiclePlate}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm text-gray-500">Langues</span>
                <span className="text-sm font-medium">{(detailDriver.languages || []).join(', ')}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm text-gray-500">Note</span>
                <span className="text-sm font-medium">{detailDriver.ratingAvg ? `${Number(detailDriver.ratingAvg).toFixed(1)}/5 (${detailDriver.ratingCount} avis)` : 'Aucun avis'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm text-gray-500">Statut</span>
                <span className="text-sm font-medium">{detailDriver.status}</span>
              </div>
              {detailDriver.documents && detailDriver.documents.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Documents ({detailDriver.documents.length})</p>
                  <div className="space-y-2">
                    {detailDriver.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-xs">
                        <span className="font-medium">{doc.type}</span>
                        <span className={doc.status === 'approved' ? 'text-emerald-600' : doc.status === 'rejected' ? 'text-red-500' : 'text-amber-600'}>
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
