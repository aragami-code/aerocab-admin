import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { adminApi } from '../services/api';

const statusConfig: Record<string, { label: string; classes: string }> = {
  open:          { label: 'Ouvert',       classes: 'text-amber-600 bg-amber-50' },
  investigating: { label: 'En cours',     classes: 'text-blue-600 bg-blue-50' },
  resolved:      { label: 'Résolu',       classes: 'text-emerald-600 bg-emerald-50' },
  dismissed:     { label: 'Rejeté',       classes: 'text-gray-500 bg-gray-100' },
};

export function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [statusFilter, page]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.getReports({
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setReports(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string, action: 'resolved' | 'dismissed') => {
    try {
      setActionLoading(id);
      await adminApi.resolveReport(id, action);
      await loadReports();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReports = search
    ? reports.filter((r) =>
        (r.reason || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.reporter?.name || r.reporter?.phone || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.reported?.name || r.reported?.phone || '').toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  const openCount = reports.filter((r) => r.status === 'open' || r.status === 'investigating').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">Signalements</h2>
          <p className="text-sm text-gray-400 mt-1">Signalements et réclamations à traiter</p>
        </div>
        <div className="flex items-center gap-3">
          {openCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-500">{openCount} en attente</span>
            </div>
          )}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tous les statuts</option>
            <option value="open">Ouverts</option>
            <option value="investigating">En cours</option>
            <option value="resolved">Résolus</option>
            <option value="dismissed">Rejetés</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par raison, signalant ou signalé..."
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
          <button onClick={loadReports} className="text-sm text-primary font-medium hover:underline cursor-pointer">
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Signalant</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Signalé</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Raison</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Statut</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Date</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                      Aucun signalement trouvé
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const st = statusConfig[report.status] || statusConfig.open;
                    const isOpen = report.status === 'open' || report.status === 'investigating';
                    const reporterName = report.reporter?.name || report.reporter?.phone || '—';
                    const reportedName = report.reported?.name || report.reported?.phone || '—';
                    const date = report.createdAt
                      ? new Date(report.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—';

                    return (
                      <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">{reporterName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{reportedName}</span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-sm text-gray-700 truncate" title={report.reason}>{report.reason}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${st.classes}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">{date}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {isOpen && (
                              <>
                                <button
                                  onClick={() => handleResolve(report.id, 'resolved')}
                                  disabled={actionLoading === report.id}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Résoudre
                                </button>
                                <button
                                  onClick={() => handleResolve(report.id, 'dismissed')}
                                  disabled={actionLoading === report.id}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <XCircle className="w-3 h-3" />
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

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-gray-400">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} signalements)
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
    </div>
  );
}
