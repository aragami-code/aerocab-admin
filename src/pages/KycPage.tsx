import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, AlertCircle, CheckCircle, XCircle, Clock,
  ChevronLeft, ChevronRight, Eye, ShieldCheck, RefreshCw,
} from 'lucide-react';
import { adminApi } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function AuthImage({ fileUrl, token, alt }: { fileUrl: string; token: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || !fileUrl) return;
    const url = `${API_BASE}${fileUrl.replace('/api', '')}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        blobRef.current = objectUrl;
        setSrc(objectUrl);
      })
      .catch(() => setSrc(null));
    return () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
  }, [fileUrl, token]);

  if (!src) return <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">Chargement…</div>;
  return <img src={src} alt={alt} className="w-full h-40 object-cover" />;
}

function openAuthImage(fileUrl: string, token: string) {
  const url = `${API_BASE}${fileUrl.replace('/api', '')}`;
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
    });
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  not_started: { label: 'Non commencé', classes: 'text-gray-600 bg-gray-100' },
  submitted:   { label: 'En attente',   classes: 'text-amber-700 bg-amber-100' },
  approved:    { label: 'Approuvé',     classes: 'text-emerald-700 bg-emerald-100' },
  rejected:    { label: 'Refusé',       classes: 'text-red-700 bg-red-100' },
};

const DOC_LABELS: Record<string, string> = {
  cni_front: 'CNI Recto', cni_back: 'CNI Verso', passport: 'Passeport', selfie: 'Selfie',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

type KycUser = {
  id: string; name: string | null; phone: string; email: string | null;
  kycStatus: string;
  kycDocuments: { id: string; type: string; status: string; fileUrl: string; rejectionReason: string | null; createdAt: string }[];
  createdAt: string;
};

export function KycPage() {
  const [users, setUsers]         = useState<KycUser[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [selected, setSelected]   = useState<KycUser | null>(null);
  const [reason, setReason]       = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [token, setToken]         = useState('');

  useEffect(() => {
    setToken(localStorage.getItem('admin_token') ?? '');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getKycPending(page);
      setUsers(res.data);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur chargement KYC');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    if (action === 'reject' && !reason.trim()) {
      alert('Veuillez indiquer un motif de refus.');
      return;
    }
    setReviewing(true);
    try {
      await adminApi.reviewKyc(selected.id, action, reason || undefined);
      setSelected(null);
      setReason('');
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'Erreur lors de la décision KYC');
    } finally {
      setReviewing(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Vérification d'identité (KYC)
          </h1>
          <p className="text-sm text-gray-500 mt-1">{total} dossier{total !== 1 ? 's' : ''} en attente de vérification</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun dossier en attente</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Passager', 'Téléphone', 'Statut', 'Documents', 'Inscription', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => {
                const cfg = STATUS_CONFIG[u.kycStatus] ?? STATUS_CONFIG.submitted;
                return (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{u.name ?? '—'}</div>
                      <div className="text-xs text-gray-400">{u.email ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cfg.classes}`}>
                        {u.kycStatus === 'submitted' && <Clock className="w-3 h-3" />}
                        {u.kycStatus === 'approved'  && <CheckCircle className="w-3 h-3" />}
                        {u.kycStatus === 'rejected'  && <XCircle className="w-3 h-3" />}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.kycDocuments.map(d => (
                          <span key={d.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {DOC_LABELS[d.type] ?? d.type}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setSelected(u); setReason(''); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                      >
                        <Eye className="w-3 h-3" />
                        Examiner
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">{total} dossiers</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium self-center">{page}/{totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal review */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Examen KYC — {selected.name ?? selected.phone}</h2>
              <p className="text-sm text-gray-500 mt-1">{selected.phone} · {selected.email ?? '—'}</p>
            </div>

            {/* Documents */}
            <div className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Documents soumis</h3>
              <div className="grid grid-cols-2 gap-4">
                {selected.kycDocuments.map(doc => (
                  <div key={doc.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">{DOC_LABELS[doc.type] ?? doc.type}</span>
                      <button
                        onClick={() => openAuthImage(doc.fileUrl, token)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Voir
                      </button>
                    </div>
                    <AuthImage fileUrl={doc.fileUrl} token={token} alt={doc.type} />
                  </div>
                ))}
              </div>

              {/* Reason input for rejection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Motif de refus <span className="text-gray-400 font-normal">(optionnel si approbation)</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ex: Photo floue, document expiré..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleReview('reject')}
                disabled={reviewing}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {reviewing ? 'En cours...' : 'Refuser'}
              </button>
              <button
                onClick={() => handleReview('approve')}
                disabled={reviewing}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {reviewing ? 'En cours...' : 'Approuver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
