import { useState, useEffect } from 'react';
import {
  Loader2, AlertCircle, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, Banknote, TrendingUp,
  AlertTriangle, Eye, Download,
} from 'lucide-react';
import { adminApi } from '../services/api';
import { Can } from '../components/Can';

const STATUS_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  pending:  { label: 'En attente', classes: 'text-amber-700 bg-amber-100',   dot: 'bg-amber-400' },
  approved: { label: 'Approuvé',   classes: 'text-blue-700 bg-blue-100',     dot: 'bg-blue-500' },
  rejected: { label: 'Rejeté',     classes: 'text-red-700 bg-red-100',       dot: 'bg-red-500' },
  paid:     { label: 'Payé',       classes: 'text-emerald-700 bg-emerald-100', dot: 'bg-emerald-500' },
};

const METHOD_LABELS: Record<string, string> = {
  orange_money:  'Orange Money',
  mtn_momo:      'MTN MoMo',
  bank_transfer: 'Virement',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState({ total: 0, totalPages: 1, page: 1, limit: 20 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [noteModal, setNoteModal]     = useState<{ id: string; nextStatus: 'approved' | 'rejected' | 'paid' } | null>(null);
  const [adminNote, setAdminNote]     = useState('');
  const [detailId, setDetailId]       = useState<string | null>(null);
  const [stats, setStats]             = useState<{ total: number; byStatus: { pending: number; approved: number; paid: number; rejected: number }; totalPaidAmount: number } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    adminApi.getWithdrawalStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [statusFilter, page]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getWithdrawals({ status: statusFilter || undefined, page });
      setWithdrawals(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, nextStatus: 'approved' | 'rejected' | 'paid') => {
    if (nextStatus === 'rejected' || nextStatus === 'paid') {
      setNoteModal({ id, nextStatus });
      setAdminNote('');
      return;
    }
    await executeAction(id, nextStatus);
  };

  const executeAction = async (id: string, status: 'approved' | 'rejected' | 'paid', note?: string) => {
    try {
      setActionLoading(id);
      await adminApi.processWithdrawal(id, status, note);
      await load();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
      setNoteModal(null);
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      await adminApi.downloadCsv('/admin/export/withdrawals', 'withdrawals.csv');
    } catch { /* ignore */ } finally {
      setExportLoading(false);
    }
  };

  // KPIs depuis l'API stats (totalité DB, pas seulement la page courante)
  const lateCount = withdrawals.filter((w) => {
    if (w.status !== 'pending') return false;
    return (Date.now() - new Date(w.createdAt).getTime()) / 3600000 > 24;
  }).length;

  // Timeline = 8 derniers retraits triés par date
  const timeline = [...withdrawals]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const filters = [
    { value: '',         label: 'Tous' },
    { value: 'pending',  label: 'En attente' },
    { value: 'approved', label: 'Approuvés' },
    { value: 'paid',     label: 'Payés' },
    { value: 'rejected', label: 'Rejetés' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">Finances chauffeurs</h2>
          <p className="text-sm text-gray-400 mt-1">
            Suivi des versements, montants dus et état des retraits chauffeurs.
          </p>
        </div>
        <Can permission="view_withdrawals">
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Exporter CSV
          </button>
        </Can>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total payé (tous)', value: fmt(stats?.totalPaidAmount ?? 0), icon: CheckCircle, color: 'emerald' },
          { label: 'En attente', value: String(stats?.byStatus.pending ?? 0), icon: Clock, color: 'amber' },
          { label: 'Approuvés', value: String(stats?.byStatus.approved ?? 0), icon: Banknote, color: 'blue' },
          { label: 'Retards >24h (page)', value: String(lateCount), icon: AlertTriangle, color: lateCount > 0 ? 'red' : 'gray' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              color === 'amber'   ? 'bg-amber-100'   :
              color === 'emerald' ? 'bg-emerald-100' :
              color === 'blue'    ? 'bg-blue-100'    :
              color === 'red'     ? 'bg-red-100'     : 'bg-gray-100'
            }`}>
              <Icon className={`w-5 h-5 ${
                color === 'amber'   ? 'text-amber-600'   :
                color === 'emerald' ? 'text-emerald-600' :
                color === 'blue'    ? 'text-blue-600'    :
                color === 'red'     ? 'text-red-600'     : 'text-gray-500'
              }`} strokeWidth={2} />
            </div>
            <p className={`text-xl font-bold tracking-tight ${
              color === 'amber'   ? 'text-amber-600'   :
              color === 'emerald' ? 'text-emerald-600' :
              color === 'blue'    ? 'text-blue-700'    :
              color === 'red'     ? 'text-red-600'     : 'text-gray-700'
            }`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle size={16} /><span className="text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Table */}
        <div className="lg:col-span-2">
          {/* Filters */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  statusFilter === f.value
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Chauffeur</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Méthode</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-sm text-gray-400">
                        Aucun retrait trouvé
                      </td>
                    </tr>
                  ) : withdrawals.map((w) => {
                    const cfg = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.pending;
                    const isActing = actionLoading === w.id;
                    return (
                      <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900">{w.user?.name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{w.user?.phone ?? ''}</p>
                        </td>
                        <td className="px-5 py-4 font-bold text-gray-900">{fmt(w.amount ?? 0)}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {METHOD_LABELS[w.method] ?? w.method}
                          <p className="text-xs text-gray-400 font-mono">{w.mobileNumber}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${cfg.classes}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          {w.adminNote && (
                            <p className="mt-1 text-xs text-gray-400 italic truncate max-w-[120px]">{w.adminNote}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setDetailId(detailId === w.id ? null : w.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <Can permission="manage_withdrawals">
                            {w.status === 'pending' && (
                              <>
                                <button
                                  disabled={isActing}
                                  onClick={() => handleAction(w.id, 'approved')}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isActing ? <Loader2 size={12} className="animate-spin" /> : 'Approuver'}
                                </button>
                                <button
                                  disabled={isActing}
                                  onClick={() => handleAction(w.id, 'rejected')}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Rejeter
                                </button>
                              </>
                            )}
                            {w.status === 'approved' && (
                              <button
                                disabled={isActing}
                                onClick={() => handleAction(w.id, 'paid')}
                                className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isActing ? <Loader2 size={12} className="animate-spin" /> : 'Marquer payé'}
                              </button>
                            )}
                            </Can>
                          </div>
                          {/* Mini détail expandable */}
                          {detailId === w.id && (
                            <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2 space-y-1">
                              <p>Date : {fmtDate(w.createdAt)}</p>
                              <p>Numéro : <span className="font-mono">{w.mobileNumber}</span></p>
                              {w.adminNote && <p>Note : {w.adminNote}</p>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">{pagination.total} retrait(s)</p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs text-gray-500">{page} / {pagination.totalPages}</span>
                    <button
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Timeline</h3>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucune activité récente</p>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-4">
                {timeline.map((w) => {
                  const cfg = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.pending;
                  return (
                    <div key={w.id} className="flex items-start gap-3 relative">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${cfg.classes}`}>
                        {w.status === 'paid'     ? <CheckCircle className="w-3.5 h-3.5" /> :
                         w.status === 'rejected' ? <XCircle className="w-3.5 h-3.5" /> :
                         w.status === 'approved' ? <CheckCircle className="w-3.5 h-3.5" /> :
                                                   <Clock className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {w.user?.name ?? '—'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {METHOD_LABELS[w.method] ?? w.method}
                            </p>
                          </div>
                          <p className={`text-xs font-bold flex-shrink-0 ${
                            w.status === 'paid'     ? 'text-emerald-600' :
                            w.status === 'rejected' ? 'text-red-500' :
                            w.status === 'approved' ? 'text-blue-600' : 'text-amber-600'
                          }`}>
                            {fmt(w.amount ?? 0)}
                          </p>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(w.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal note */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl mx-4">
            <h2 className="text-base font-bold text-gray-900 mb-3">
              {noteModal.nextStatus === 'rejected' ? 'Rejeter la demande' : 'Marquer comme payé'}
            </h2>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Note admin (optionnel)</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Motif, référence de paiement…"
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setNoteModal(null)}
                className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => executeAction(noteModal.id, noteModal.nextStatus, adminNote || undefined)}
                className={`flex-1 py-2.5 text-sm text-white rounded-xl font-semibold cursor-pointer ${
                  noteModal.nextStatus === 'rejected'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
