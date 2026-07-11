import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle, Search, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, CheckCircle, XCircle,
  X, Send, MessageSquare, RotateCcw, ImageIcon, ShieldOff, Zap,
} from 'lucide-react';
import { adminApi } from '../services/api';
import { PageStats } from '../components/PageStats';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const statusConfig: Record<string, { label: string; classes: string }> = {
  open:          { label: 'Ouvert',    classes: 'text-amber-600 bg-amber-50' },
  investigating: { label: 'En cours',  classes: 'text-blue-600 bg-blue-50' },
  resolved:      { label: 'Résolu',    classes: 'text-emerald-600 bg-emerald-50' },
  dismissed:     { label: 'Rejeté',    classes: 'text-gray-500 bg-gray-100' },
};

// ── Logique de gravité (miroir du backend) ────────────────────────────────────
type Severity = 'minor' | 'moderate' | 'major';
const CATEGORY_SEVERITY: Record<string, Severity> = {
  'Propreté du véhicule': 'minor', 'Retard important': 'minor', 'Problème technique': 'minor',
  'Autre problème': 'minor', 'Problème avec le prix': 'moderate', 'Problème de paiement': 'moderate',
  'Comportement du chauffeur': 'major', 'Comportement du passager': 'major', 'Accident / Incident': 'major',
};
const SANCTIONS_BY_SEVERITY = {
  minor:    { label: 'Mineur',   color: 'text-amber-600 bg-amber-50 border-amber-200',    points: 100, score: 0.1, days: 1 },
  moderate: { label: 'Modéré',   color: 'text-orange-600 bg-orange-50 border-orange-200', points: 250, score: 0.3, days: 3 },
  major:    { label: 'Majeur',   color: 'text-red-600 bg-red-50 border-red-200',           points: 500, score: 0.5, days: 7 },
};
function getSeverity(reason: string): Severity {
  const category = reason.split(':')[0].trim();
  return CATEGORY_SEVERITY[category] ?? 'minor';
}

type Msg = { id: string; senderRole: 'user' | 'admin' | 'system'; message: string; imageUrl?: string | null; createdAt: string; sender: { name?: string } };
type Report = {
  id: string; reason: string; status: string; resolution?: string; createdAt: string;
  reporter: { id: string; name?: string; phone?: string };
  reported?: { id: string; name?: string; phone?: string };
  messages: Msg[];
};

type ResolveModal = { id: string; action: 'resolved' | 'dismissed' } | null;
type RevokeState = { liftSuspension: boolean; restorePoints: boolean; restoreScore: boolean };

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Thread panel
  const [selected, setSelected] = useState<Report | null>(null);
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve modal
  const [resolveModal, setResolveModal] = useState<ResolveModal>(null);
  const [resolution, setResolution] = useState('');

  // Revoke sanctions
  const [revokeState, setRevokeState] = useState<RevokeState>({ liftSuspension: false, restorePoints: false, restoreScore: false });
  const [revokeLoading, setRevokeLoading] = useState(false);

  useEffect(() => { loadReports(); }, [statusFilter, page]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selected?.messages?.length]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.getReports({ status: statusFilter || undefined, page, limit: 10 });
      setReports(result.data as Report[]);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const openPanel = async (report: Report) => {
    setSelected(report);
    setNewMsg('');
    try {
      const fresh = await adminApi.getReportById(report.id);
      setSelected(fresh as Report);
    } catch {}
  };

  const sendMessage = async () => {
    if (!selected || (!newMsg.trim() && !pendingImage) || sendingMsg) return;
    setSendingMsg(true);
    try {
      let imageUrl: string | undefined;
      if (pendingImage) {
        const res = await adminApi.uploadTicketImage(pendingImage);
        imageUrl = res.url;
      }
      const msg = await adminApi.addReportMessage(selected.id, newMsg.trim() || ' ', imageUrl);
      const updated = { ...selected, status: selected.status === 'open' ? 'investigating' : selected.status, messages: [...(selected.messages ?? []), msg] };
      setSelected(updated as Report);
      setReports(prev => prev.map(r => r.id === updated.id ? { ...r, status: updated.status } : r));
      setNewMsg('');
      setPendingImage(null);
      setPendingPreview(null);
    } catch (e: any) {
      alert(e.message || 'Erreur envoi');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImage(file);
    setPendingPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const removePendingImage = () => {
    setPendingImage(null);
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingPreview(null);
  };

  const getImageUrl = (url: string) => {
    if (!url) return '';
    const filename = url.split('/').pop() ?? '';
    if (!filename.startsWith('ticket-')) return url;
    return `/api/ticket-images/${filename}`;
  };

  const openModal = (id: string, action: 'resolved' | 'dismissed') => {
    setResolution('');
    setResolveModal({ id, action });
  };

  const closeModal = () => { setResolveModal(null); setResolution(''); };

  const handleReopen = async () => {
    if (!selected) return;
    try {
      setActionLoading(selected.id);
      await adminApi.reopenReport(selected.id);
      await loadReports();
      setSelected(prev => prev ? { ...prev, status: 'open', resolution: undefined } : null);
    } catch (err: any) {
      alert(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    const { id, action } = resolveModal;
    try {
      setActionLoading(id);
      closeModal();
      await adminApi.resolveReport(id, action, resolution.trim() || undefined);
      await loadReports();
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: action } : null);
    } catch (err: any) {
      alert(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async () => {
    if (!selected || revokeLoading) return;
    if (!revokeState.liftSuspension && !revokeState.restorePoints && !revokeState.restoreScore) {
      alert('Sélectionnez au moins une action');
      return;
    }
    try {
      setRevokeLoading(true);
      const result = await adminApi.revokeSanctions(selected.id, revokeState);
      alert(result.message || 'Sanctions mises à jour');
      const fresh = await adminApi.getReportById(selected.id);
      setSelected(fresh as Report);
      setRevokeState({ liftSuspension: false, restorePoints: false, restoreScore: false });
    } catch (e: any) {
      alert(e.message || 'Erreur');
    } finally {
      setRevokeLoading(false);
    }
  };

  const filteredReports = search
    ? reports.filter(r =>
        (r.reason || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.reporter?.name || r.reporter?.phone || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.reported?.name || r.reported?.phone || '').toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  const openCount = reports.filter(r => r.status === 'open' || r.status === 'investigating').length;
  const isOpen = selected && (selected.status === 'open' || selected.status === 'investigating');

  return (
    <div className="flex gap-6" style={{ minHeight: 0 }}>
      {/* Left: table */}
      <div className={`flex flex-col min-w-0 transition-all ${selected ? 'w-1/2' : 'w-full'}`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-primary font-heading">Signalements</h2>
            <p className="text-sm text-gray-400 mt-1">Cliquez sur un signalement pour ouvrir le fil de discussion</p>
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
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="open">Ouverts</option>
              <option value="investigating">En cours</option>
              <option value="resolved">Résolus</option>
              <option value="dismissed">Rejetés</option>
            </select>
          </div>
        </div>

        <PageStats domain="reports" title="Statistiques signalements" />

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-gray-500">{error}</p>
            <button onClick={loadReports} className="text-sm text-primary font-medium hover:underline cursor-pointer">Réessayer</button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-4">Signalant</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-4">Raison</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-4">Statut</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-4">Msgs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredReports.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400">Aucun signalement</td></tr>
                  ) : filteredReports.map(report => {
                    const st = statusConfig[report.status] || statusConfig.open;
                    const isSelected = selected?.id === report.id;
                    const date = report.createdAt ? new Date(report.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—';
                    return (
                      <tr
                        key={report.id}
                        onClick={() => openPanel(report)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-gray-50/50'}`}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{report.reporter?.name || report.reporter?.phone || '—'}</p>
                          <p className="text-xs text-gray-400">{date}</p>
                        </td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <p className="text-sm text-gray-700 truncate">{report.reason}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${st.classes}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {report.messages?.length ?? 0}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <p className="text-xs text-gray-400">Page {pagination.page}/{pagination.totalPages} ({pagination.total})</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(page + 1)} disabled={page >= pagination.totalPages} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: thread panel */}
      {selected && (
        <div className="w-1/2 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden" style={{ maxHeight: 'calc(100vh - 120px)', position: 'sticky', top: 0 }}>
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-gray-100">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${statusConfig[selected.status]?.classes || statusConfig.open.classes}`}>
                  {statusConfig[selected.status]?.label || 'Ouvert'}
                </span>
                <span className="text-xs text-gray-400">
                  {selected.reporter?.name || selected.reporter?.phone} → {selected.reported?.name || selected.reported?.phone || 'équipe'}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 truncate">{selected.reason}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isOpen ? (
                <>
                  <button
                    onClick={() => openModal(selected.id, 'resolved')}
                    disabled={!!actionLoading}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Résoudre
                  </button>
                  <button
                    onClick={() => openModal(selected.id, 'dismissed')}
                    disabled={!!actionLoading}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Rejeter
                  </button>
                </>
              ) : (
                <button
                  onClick={handleReopen}
                  disabled={!!actionLoading}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {actionLoading === selected.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Réouvrir
                </button>
              )}
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
            {/* Initial report as first message */}
            <div className="flex justify-start">
              <div className="max-w-[80%]">
                <p className="text-xs text-gray-400 mb-1">{selected.reporter?.name || selected.reporter?.phone} · signalement initial</p>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <p className="text-sm text-gray-800">{selected.reason}</p>
                </div>
              </div>
            </div>

            {(selected.messages ?? []).map(msg => {
              if (msg.senderRole === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full text-center max-w-[90%]">{msg.message}</span>
                  </div>
                );
              }
              const isAdmin = msg.senderRole === 'admin';
              return (
                <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    <p className={`text-xs text-gray-400 mb-1 ${isAdmin ? 'text-right' : ''}`}>
                      {isAdmin ? 'Équipe support' : (msg.sender?.name || 'Utilisateur')}
                      {' · '}
                      {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isAdmin ? 'bg-primary text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                      {msg.message.trim() && <p>{msg.message}</p>}
                      {msg.imageUrl && (
                        <img
                          src={getImageUrl(msg.imageUrl)}
                          alt="pièce jointe"
                          className="mt-2 max-w-[220px] rounded-lg cursor-pointer"
                          onClick={() => window.open(getImageUrl(msg.imageUrl!), '_blank')}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {selected.resolution && (selected.status === 'resolved' || selected.status === 'dismissed') && (
              <div className={`p-3 rounded-xl text-sm border ${selected.status === 'resolved' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                <p className="font-semibold text-xs uppercase mb-1">{selected.status === 'resolved' ? 'Résolution' : 'Motif de rejet'}</p>
                {selected.resolution}
              </div>
            )}

            {selected.status === 'resolved' && selected.reported && (() => {
              const sev = getSeverity(selected.reason);
              const s = SANCTIONS_BY_SEVERITY[sev];
              return (
                <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldOff className="w-4 h-4 text-gray-400" />
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Atténuer les sanctions</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { key: 'liftSuspension' as keyof RevokeState, label: `Lever la suspension (${s.days}j)` },
                      { key: 'restorePoints' as keyof RevokeState, label: `Restaurer les points (+${s.points} pts)` },
                      { key: 'restoreScore' as keyof RevokeState, label: `Restaurer le score (+${s.score}⭐)` },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={revokeState[key]}
                          onChange={e => setRevokeState(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleRevoke}
                    disabled={revokeLoading || (!revokeState.liftSuspension && !revokeState.restorePoints && !revokeState.restoreScore)}
                    className="w-full flex items-center justify-center text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-40 px-3 py-2 rounded-lg cursor-pointer disabled:cursor-default transition-colors"
                  >
                    {revokeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Appliquer les atténuations'}
                  </button>
                </div>
              );
            })()}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {isOpen ? (
            <div className="p-4 border-t border-gray-100">
              {pendingPreview && (
                <div className="flex items-center gap-2 mb-2">
                  <img src={pendingPreview} alt="preview" className="w-14 h-14 object-cover rounded-lg" />
                  <button onClick={removePendingImage} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-3">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title="Joindre une image"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <textarea
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Répondre à l'utilisateur... (Entrée pour envoyer)"
                  rows={2}
                  className="flex-1 resize-none px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  onClick={sendMessage}
                  disabled={(!newMsg.trim() && !pendingImage) || sendingMsg}
                  className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
                >
                  {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-gray-100 text-center text-xs text-gray-400">
              Ce ticket est fermé — impossible d'ajouter des messages
            </div>
          )}
        </div>
      )}

      {/* Resolve modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {resolveModal.action === 'resolved' ? 'Résoudre le signalement' : 'Rejeter le signalement'}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {resolveModal.action === 'resolved'
                ? 'Message de clôture visible par l\'utilisateur (optionnel).'
                : 'Raison du rejet visible par l\'utilisateur (optionnel).'}
            </p>
            <textarea
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              placeholder={resolveModal.action === 'resolved'
                ? 'Ex : Nous avons pris les mesures nécessaires...'
                : 'Ex : Ce signalement ne correspond pas à nos critères...'}
              rows={4}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {resolveModal.action === 'resolved' && selected?.reported && (() => {
              const sev = getSeverity(selected.reason);
              const s = SANCTIONS_BY_SEVERITY[sev];
              return (
                <div className={`mt-3 p-3 rounded-xl border text-xs space-y-1.5 ${s.color}`}>
                  <div className="flex items-center gap-2 font-semibold">
                    <Zap className="w-3.5 h-3.5" />
                    Sanctions automatiques — gravité {s.label}
                  </div>
                  <ul className="space-y-0.5 pl-5 list-disc">
                    <li>-{s.points} points à {selected.reported.name || selected.reported.phone}</li>
                    <li>-{s.score}⭐ sur le score chauffeur</li>
                    <li>Suspension {s.days} jour(s)</li>
                  </ul>
                </div>
              );
            })()}
            <div className="flex gap-3 mt-4">
              <button onClick={closeModal} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 cursor-pointer">
                Annuler
              </button>
              <button
                onClick={handleResolve}
                className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl cursor-pointer ${resolveModal.action === 'resolved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              >
                {resolveModal.action === 'resolved' ? 'Confirmer résolution' : 'Confirmer rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
