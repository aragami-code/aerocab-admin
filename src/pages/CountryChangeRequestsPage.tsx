import { useState, useEffect } from 'react';
import {
  Globe, Loader2, AlertCircle, CheckCircle, XCircle, Clock,
  ChevronDown, X,
} from 'lucide-react';
import { adminApi } from '../services/api';
import { Can } from '../components/Can';

const STATUS_CONFIG: Record<string, { label: string; icon: any; classes: string }> = {
  pending:  { label: 'En attente', icon: Clock,        classes: 'text-amber-600 bg-amber-50 border-amber-200' },
  approved: { label: 'Approuvé',   icon: CheckCircle,  classes: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  rejected: { label: 'Rejeté',     icon: XCircle,      classes: 'text-red-500 bg-red-50 border-red-200' },
};

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--';

export function CountryChangeRequestsPage() {
  const [requests, setRequests]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  // Review modal
  const [selected, setSelected]       = useState<any | null>(null);
  const [action, setAction]           = useState<'approved' | 'rejected'>('approved');
  const [adminNote, setAdminNote]     = useState('');
  const [reviewing, setReviewing]     = useState(false);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      setLoading(true); setError('');
      const data = await adminApi.listCountryChangeRequests(statusFilter || undefined);
      setRequests(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const openReview = (req: any) => {
    setSelected(req);
    setAction('approved');
    setAdminNote('');
  };

  const submitReview = async () => {
    if (!selected) return;
    setReviewing(true);
    try {
      await adminApi.reviewCountryChangeRequest(selected.id, action, adminNote.trim() || undefined);
      setSelected(null);
      load();
    } catch (e: any) {
      alert(e.message || 'Erreur');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">Demandes de changement de pays</h2>
          <p className="text-sm text-gray-400 mt-1">Gérer les demandes de mobilité internationale des chauffeurs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-600">{requests.length} demande{requests.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Tous</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvés</option>
              <option value="rejected">Rejetés</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-gray-500">{error}</p>
          <button onClick={load} className="text-sm text-primary font-medium hover:underline cursor-pointer">Réessayer</button>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Globe className="w-10 h-10 text-gray-200" />
          <p className="text-sm text-gray-400">Aucune demande {statusFilter ? `avec le statut "${statusFilter}"` : ''}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Chauffeur</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Changement</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Raison</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Statut</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Date</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((req) => {
                const st = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
                const Icon = st.icon;
                return (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {req.driverProfile?.user?.name || '—'}
                        </p>
                        <p className="text-xs text-gray-400">{req.driverProfile?.user?.phone || '—'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          {req.currentCountry}
                        </span>
                        <span className="text-gray-300">→</span>
                        <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {req.requestedCountry}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-xs text-gray-500 truncate" title={req.reason}>{req.reason}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${st.classes}`}>
                        <Icon className="w-3 h-3" />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-400">{fmtDate(req.createdAt)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' ? (
                        <Can permission="edit_driver_profile">
                          <button
                            onClick={() => openReview(req)}
                            className="text-xs font-medium text-primary hover:text-primary/70 transition-colors cursor-pointer"
                          >
                            Traiter
                          </button>
                        </Can>
                      ) : (
                        <div className="text-right">
                          {req.adminNote && (
                            <p className="text-xs text-gray-400 italic truncate max-w-[160px] text-right" title={req.adminNote}>
                              {req.adminNote}
                            </p>
                          )}
                          {req.reviewedAt && (
                            <p className="text-xs text-gray-300">{fmtDate(req.reviewedAt)}</p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-lg">Traiter la demande</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Chauffeur :</span>
                <span className="font-medium text-gray-900">{selected.driverProfile?.user?.name || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Changement :</span>
                <span className="font-semibold text-gray-700 bg-gray-200 px-1.5 py-0.5 rounded text-xs">{selected.currentCountry}</span>
                <span className="text-gray-400">→</span>
                <span className="font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">{selected.requestedCountry}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Raison : </span>
                <span className="text-gray-700">{selected.reason}</span>
              </div>
            </div>

            {/* Decision */}
            <div className="space-y-3 mb-5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Décision</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAction('approved')}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 transition-colors cursor-pointer ${
                    action === 'approved'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  ✅ Approuver
                </button>
                <button
                  onClick={() => setAction('rejected')}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 transition-colors cursor-pointer ${
                    action === 'rejected'
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  ❌ Rejeter
                </button>
              </div>
            </div>

            {/* Note */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Note admin {action === 'rejected' ? '(recommandé)' : '(facultatif)'}
              </label>
              <textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder={action === 'approved' ? 'Justificatifs vérifiés…' : 'Raison du refus…'}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              onClick={submitReview}
              disabled={reviewing}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                action === 'approved'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {reviewing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : action === 'approved' ? 'Confirmer l\'approbation' : 'Confirmer le rejet'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
