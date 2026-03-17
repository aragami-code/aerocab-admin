import { useState, useEffect } from 'react';
import {
  Ticket,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { adminApi } from '../services/api';

export function AccessPage() {
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });

  useEffect(() => {
    loadPasses();
  }, [statusFilter, page]);

  const loadPasses = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.getAccessPasses({
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setPasses(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const getPassStatus = (pass: any) => {
    if (pass.status === 'active') {
      const expires = new Date(pass.expiresAt);
      if (expires < new Date()) return 'expired';
      return 'active';
    }
    return pass.status || 'pending';
  };

  const filteredPasses = search
    ? passes.filter((p) =>
        (p.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.user?.phone || '').includes(search) ||
        (p.paymentRef || '').includes(search)
      )
    : passes;

  // NOTE: activePasses only reflects the current page of results, not the global total.
  // A future improvement would be to get the total active count from the API stats endpoint.
  const activePasses = passes.filter((p) => getPassStatus(p) === 'active').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">
            Acces 48h
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Suivi des pass 48h actifs et historique des paiements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg">
            <Ticket className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-600">{activePasses} actifs</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="expired">Expires</option>
            <option value="pending">En attente</option>
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{pagination.total}</p>
            <p className="text-xs text-gray-400">Total des pass</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{activePasses}</p>
            <p className="text-xs text-gray-400">Actuellement actifs</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{formatFCFA(passes.filter((p) => p.status === 'active' || getPassStatus(p) === 'expired').length * 2500)}</p>
            <p className="text-xs text-gray-400">Revenus estimes</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un acces..."
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
          <button onClick={loadPasses} className="text-sm text-primary font-medium hover:underline cursor-pointer">
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
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Voyageur</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Montant</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Ref. paiement</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Statut</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Expiration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPasses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                      Aucun acces trouve
                    </td>
                  </tr>
                ) : (
                  filteredPasses.map((pass) => {
                    const passStatus = getPassStatus(pass);
                    return (
                      <tr key={pass.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{pass.user?.name || 'Sans nom'}</p>
                            <p className="text-xs text-gray-400">{pass.user?.phone || ''}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatFCFA(pass.amount || 2500)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-500 font-mono">
                            {pass.paymentRef || '--'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                            passStatus === 'active' ? 'text-emerald-600 bg-emerald-50' :
                            passStatus === 'pending' ? 'text-amber-600 bg-amber-50' :
                            'text-gray-500 bg-gray-100'
                          }`}>
                            {passStatus === 'active' ? <CheckCircle className="w-3 h-3" /> :
                             passStatus === 'pending' ? <Clock className="w-3 h-3" /> :
                             <XCircle className="w-3 h-3" />}
                            {passStatus === 'active' ? 'Actif' : passStatus === 'pending' ? 'En attente' : 'Expire'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">{formatDate(pass.expiresAt)}</span>
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
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} pass)
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
