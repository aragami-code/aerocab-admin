import { useState, useEffect } from 'react';
import {
  Users, Search, UserCheck, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, X, Download, Wallet,
  Star, Car, Ban, CheckCircle, ArrowUpCircle, ArrowDownCircle,
  Phone, Mail, Hash, Calendar, TrendingUp,
} from 'lucide-react';
import { adminApi } from '../services/api';
import { Can } from '../components/Can';

const STATUS_BOOKING: Record<string, { label: string; className: string }> = {
  pending:           { label: 'En attente',  className: 'text-amber-600 bg-amber-50' },
  confirmed:         { label: 'Confirmée',   className: 'text-blue-600 bg-blue-50' },
  arrived_at_airport:{ label: 'Arrivé',      className: 'text-indigo-600 bg-indigo-50' },
  in_progress:       { label: 'En cours',    className: 'text-purple-600 bg-purple-50' },
  completed:         { label: 'Terminée',    className: 'text-emerald-600 bg-emerald-50' },
  cancelled:         { label: 'Annulée',     className: 'text-red-500 bg-red-50' },
};

const STATUS_WITHDRAWAL: Record<string, { label: string; className: string }> = {
  pending:  { label: 'En attente', className: 'text-amber-600 bg-amber-50' },
  approved: { label: 'Approuvé',   className: 'text-blue-600 bg-blue-50' },
  paid:     { label: 'Payé',       className: 'text-emerald-600 bg-emerald-50' },
  rejected: { label: 'Rejeté',     className: 'text-red-500 bg-red-50' },
};

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
const fmtDateTime = (d: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '--';

type Tab = 'bookings' | 'points' | 'withdrawals';

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 20 });

  // Side sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('bookings');

  // Points form
  const [pointsModal, setPointsModal] = useState(false);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);

  // Status toggle
  const [statusLoading, setStatusLoading] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => { loadUsers(); }, [roleFilter, page]);

  const loadUsers = async () => {
    try {
      setLoading(true); setError('');
      const result = await adminApi.getUsers({ role: roleFilter || undefined, page, limit: 20 });
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const openSheet = async (user: any) => {
    setSelectedUser(user);
    setDetail(null);
    setSheetOpen(true);
    setActiveTab('bookings');
    setPointsModal(false);
    setDetailLoading(true);
    try {
      const d = await adminApi.getUserDetail(user.id);
      setDetail(d);
    } catch { /* ignore */ } finally {
      setDetailLoading(false);
    }
  };

  const closeSheet = () => { setSheetOpen(false); setSelectedUser(null); setDetail(null); };

  const toggleStatus = async () => {
    if (!selectedUser) return;
    const next = selectedUser.status === 'active' ? 'suspended' : 'active';
    setStatusLoading(true);
    try {
      await adminApi.updateUserStatus(selectedUser.id, next);
      setSelectedUser({ ...selectedUser, status: next });
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, status: next } : u));
    } catch (e: any) {
      alert(e.message || 'Erreur');
    } finally {
      setStatusLoading(false);
    }
  };

  const submitPoints = async () => {
    const amt = parseInt(pointsAmount, 10);
    if (isNaN(amt) || amt === 0 || !pointsReason.trim()) return;
    setPointsLoading(true);
    try {
      const res = await adminApi.adjustUserPoints(selectedUser.id, amt, pointsReason.trim());
      setDetail((d: any) => d ? { ...d, pointsBalance: res.balance } : d);
      setPointsModal(false);
    } catch (e: any) {
      alert(e.message || 'Erreur');
    } finally {
      setPointsLoading(false);
    }
  };

  const filteredUsers = search
    ? users.filter(u =>
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.phone || '').includes(search) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">Utilisateurs</h2>
          <p className="text-sm text-gray-400 mt-1">Liste de tous les voyageurs et chauffeurs inscrits</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-600">{pagination.total} utilisateurs</span>
          </div>
          <Can permission="view_stats">
            <button
              onClick={async () => { setExportLoading(true); try { await adminApi.downloadCsv('/admin/export/users', 'users.csv'); } catch {} finally { setExportLoading(false); } }}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Exporter CSV
            </button>
          </Can>
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tous les rôles</option>
            <option value="passenger">Voyageurs</option>
            <option value="driver">Chauffeurs</option>
          </select>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, téléphone ou email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-gray-500">{error}</p>
          <button onClick={loadUsers} className="text-sm text-primary font-medium hover:underline cursor-pointer">Réessayer</button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Utilisateur</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Rôle</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Statut</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Inscription</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">Aucun utilisateur trouvé</td></tr>
                ) : filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-primary">{(user.name || '?').charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name || 'Sans nom'}</p>
                          <p className="text-xs text-gray-400">{user.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        user.role === 'driver' ? 'text-emerald-600 bg-emerald-50' :
                        user.role === 'admin'  ? 'text-purple-600 bg-purple-50' :
                        'text-blue-600 bg-blue-50'
                      }`}>
                        {user.role === 'driver' ? 'Chauffeur' : user.role === 'admin' ? 'Admin' : 'Voyageur'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.status === 'suspended' ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'suspended' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        {user.status === 'suspended' ? 'Suspendu' : 'Actif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{fmtDate(user.createdAt)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openSheet(user)}
                        className="text-xs font-medium text-primary hover:text-primary/70 transition-colors cursor-pointer"
                      >
                        Voir détail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-gray-400">Page {pagination.page} sur {pagination.totalPages} ({pagination.total} utilisateurs)</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(page - 1)} disabled={page <= 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(page + 1)} disabled={page >= pagination.totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Side Sheet Overlay ── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={e => { if (e.target === e.currentTarget) closeSheet(); }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden">

            {/* Sheet Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-primary">
                    {((detail?.name || selectedUser?.name) || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {detail?.name || selectedUser?.name || 'Sans nom'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg ${
                      (detail?.role || selectedUser?.role) === 'driver' ? 'text-emerald-600 bg-emerald-50' :
                      (detail?.role || selectedUser?.role) === 'admin'  ? 'text-purple-600 bg-purple-50' :
                      'text-blue-600 bg-blue-50'
                    }`}>
                      {(detail?.role || selectedUser?.role) === 'driver' ? 'Chauffeur' :
                       (detail?.role || selectedUser?.role) === 'admin'  ? 'Admin' : 'Voyageur'}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      (detail?.status || selectedUser?.status) === 'suspended'
                        ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        (detail?.status || selectedUser?.status) === 'suspended' ? 'bg-red-500' : 'bg-emerald-500'
                      }`} />
                      {(detail?.status || selectedUser?.status) === 'suspended' ? 'Suspendu' : 'Actif'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={closeSheet} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sheet Body (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {detailLoading && !detail && (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              )}

              {(detail || selectedUser) && (
                <>
                  {/* Stats cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-blue-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Wallet className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs text-blue-500 font-medium">Wallet</span>
                      </div>
                      <p className="text-base font-bold text-blue-700">
                        {detail?.wallet?.balance !== undefined ? fmt(Number(detail.wallet.balance)) : '—'} F
                      </p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs text-amber-500 font-medium">Points</span>
                      </div>
                      <p className="text-base font-bold text-amber-700">
                        {detail?.pointsBalance !== undefined ? fmt(detail.pointsBalance) : '—'} pts
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Car className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs text-emerald-500 font-medium">Courses</span>
                      </div>
                      <p className="text-base font-bold text-emerald-700">
                        {detail?.totalBookings ?? '—'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-400 font-medium">Membre</span>
                      </div>
                      <p className="text-sm font-bold text-gray-700">
                        {fmtDate(detail?.createdAt || selectedUser?.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Info fields */}
                  <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                    {[
                      { icon: Phone, label: 'Téléphone', value: detail?.phone || selectedUser?.phone },
                      { icon: Mail, label: 'Email', value: detail?.email || selectedUser?.email || '—' },
                      { icon: TrendingUp, label: 'Code parrainage', value: detail?.referralCode || '—' },
                      { icon: Hash, label: 'ID', value: detail?.id || selectedUser?.id, mono: true },
                    ].map(({ icon: Icon, label, value, mono }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">{label}</span>
                        </div>
                        <span className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono text-xs text-gray-400' : ''}`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Tabs */}
                  {detail && (
                    <>
                      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        {([
                          { key: 'bookings', label: `Courses (${detail.bookings?.length ?? 0})` },
                          { key: 'points',   label: `Points (${detail.pointsTransactions?.length ?? 0})` },
                          { key: 'withdrawals', label: `Retraits (${detail.withdrawalRequests?.length ?? 0})` },
                        ] as { key: Tab; label: string }[]).map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer ${
                              activeTab === tab.key
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Bookings tab */}
                      {activeTab === 'bookings' && (
                        <div className="space-y-2">
                          {(detail.bookings ?? []).length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-6">Aucune course</p>
                          ) : (detail.bookings ?? []).map((b: any) => {
                            const st = STATUS_BOOKING[b.status] ?? { label: b.status, className: 'text-gray-500 bg-gray-50' };
                            return (
                              <div key={b.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">{b.destination}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {b.type} · {b.driverProfile?.user?.name || 'Pas de chauffeur'} · {fmtDateTime(b.createdAt)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 ml-3 shrink-0">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${st.className}`}>{st.label}</span>
                                  <span className="text-sm font-bold text-gray-700">{fmt(b.estimatedPrice ?? 0)} F</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Points tab */}
                      {activeTab === 'points' && (
                        <div className="space-y-2">
                          {(detail.pointsTransactions ?? []).length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-6">Aucune transaction</p>
                          ) : (detail.pointsTransactions ?? []).map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                              <div className="flex items-center gap-3">
                                {t.type === 'credit'
                                  ? <ArrowUpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                  : <ArrowDownCircle className="w-4 h-4 text-red-400 shrink-0" />
                                }
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{t.label}</p>
                                  <p className="text-xs text-gray-400">{fmtDateTime(t.createdAt)}</p>
                                </div>
                              </div>
                              <span className={`text-sm font-bold ${t.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                                {t.type === 'credit' ? '+' : '-'}{fmt(t.points)} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Withdrawals tab */}
                      {activeTab === 'withdrawals' && (
                        <div className="space-y-2">
                          {(detail.withdrawalRequests ?? []).length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-6">Aucun retrait</p>
                          ) : (detail.withdrawalRequests ?? []).map((w: any) => {
                            const st = STATUS_WITHDRAWAL[w.status] ?? { label: w.status, className: 'text-gray-500 bg-gray-50' };
                            return (
                              <div key={w.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{fmt(Number(w.amount))} FCFA</p>
                                  <p className="text-xs text-gray-400">{fmtDateTime(w.createdAt)}</p>
                                </div>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${st.className}`}>{st.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Sheet Footer — Actions */}
            {selectedUser && !detailLoading && (
              <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0">
                {!pointsModal ? (
                  <div className="flex gap-3">
                    <Can permission="adjust_points">
                      <button
                        onClick={() => { setPointsModal(true); setPointsAmount(''); setPointsReason(''); }}
                        className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer"
                      >
                        Ajuster les points
                      </button>
                    </Can>
                    <Can permission="suspend_user">
                      <button
                        onClick={toggleStatus}
                        disabled={statusLoading}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 ${
                          (detail?.status || selectedUser?.status) === 'suspended'
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {statusLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : (detail?.status || selectedUser?.status) === 'suspended'
                            ? <><CheckCircle className="w-4 h-4" /> Réactiver</>
                            : <><Ban className="w-4 h-4" /> Suspendre</>
                        }
                      </button>
                    </Can>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Ajustement de points</p>
                    <input
                      type="number"
                      placeholder="Montant (+500 ou -200)"
                      value={pointsAmount}
                      onChange={e => setPointsAmount(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      type="text"
                      placeholder="Motif obligatoire (ex: support client)"
                      value={pointsReason}
                      onChange={e => setPointsReason(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPointsModal(false)}
                        className="flex-1 py-2.5 bg-gray-100 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        disabled={pointsLoading || !pointsAmount || !pointsReason}
                        onClick={submitPoints}
                        className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {pointsLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
