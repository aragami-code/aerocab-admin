import { useState, useEffect } from 'react';
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
} from 'lucide-react';
import { adminApi } from '../services/api';

const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
  pending:  { label: 'En attente', classes: 'text-amber-600 bg-amber-50',   icon: <Clock size={14} /> },
  approved: { label: 'Approuvé',   classes: 'text-blue-600 bg-blue-50',     icon: <CheckCircle size={14} /> },
  rejected: { label: 'Rejeté',     classes: 'text-red-600 bg-red-50',       icon: <XCircle size={14} /> },
  paid:     { label: 'Payé',       classes: 'text-emerald-600 bg-emerald-50', icon: <CheckCircle size={14} /> },
};

const METHOD_LABELS: Record<string, string> = {
  orange_money:  'Orange Money',
  mtn_momo:      'MTN MoMo',
  bank_transfer: 'Virement',
};

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
    // Pour rejected et paid on ouvre la modale note
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote size={22} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Retraits chauffeurs</h1>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-card"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvés</option>
          <option value="rejected">Rejetés</option>
          <option value="paid">Payés</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle size={16} /><span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Chauffeur</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Montant</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Méthode</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Numéro</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">
                    Aucun retrait trouvé.
                  </td>
                </tr>
              ) : withdrawals.map((w) => {
                const cfg = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.pending;
                const isActing = actionLoading === w.id;
                return (
                  <tr key={w.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{w.user?.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{w.user?.phone ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(w.amount)}</td>
                    <td className="px-4 py-3">{METHOD_LABELS[w.method] ?? w.method}</td>
                    <td className="px-4 py-3 font-mono text-xs">{w.mobileNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.classes}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {w.adminNote && (
                        <div className="mt-1 text-xs text-muted-foreground italic">Note : {w.adminNote}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(w.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      {w.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            disabled={isActing}
                            onClick={() => handleAction(w.id, 'approved')}
                            className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isActing ? <Loader2 size={12} className="animate-spin" /> : 'Approuver'}
                          </button>
                          <button
                            disabled={isActing}
                            onClick={() => handleAction(w.id, 'rejected')}
                            className="px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            Rejeter
                          </button>
                        </div>
                      )}
                      {w.status === 'approved' && (
                        <button
                          disabled={isActing}
                          onClick={() => handleAction(w.id, 'paid')}
                          className="px-2 py-1 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isActing ? <Loader2 size={12} className="animate-spin" /> : 'Marquer payé'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{pagination.total} retrait(s)</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1 rounded border border-border disabled:opacity-40 hover:bg-muted"
            >
              <ChevronLeft size={16} />
            </button>
            <span>Page {page} / {pagination.totalPages}</span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1 rounded border border-border disabled:opacity-40 hover:bg-muted"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal note */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-3">
              {noteModal.nextStatus === 'rejected' ? 'Rejeter la demande' : 'Marquer comme payé'}
            </h2>
            <label className="block text-sm font-medium mb-1">Note admin (optionnel)</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Motif, référence de paiement..."
              className="w-full border border-border rounded-lg p-2 text-sm"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setNoteModal(null)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
              >
                Annuler
              </button>
              <button
                onClick={() => executeAction(noteModal.id, noteModal.nextStatus, adminNote || undefined)}
                className={`px-4 py-2 text-sm text-white rounded-lg font-semibold ${
                  noteModal.nextStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
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
