import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserCheck,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { adminApi } from '../services/api';

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    loadUsers();
  }, [roleFilter, page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.getUsers({
        role: roleFilter || undefined,
        page,
        limit: 10,
      });
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = search
    ? users.filter((u) =>
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.phone || '').includes(search) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">
            Utilisateurs
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Liste de tous les voyageurs et chauffeurs inscrits
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-600">{pagination.total} utilisateurs</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tous les roles</option>
            <option value="passenger">Voyageurs</option>
            <option value="driver">Chauffeurs</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
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
          <button onClick={loadUsers} className="text-sm text-primary font-medium hover:underline cursor-pointer">
            Reessayer
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Utilisateur</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Role</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Inscription</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                      Aucun utilisateur trouve
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {(user.name || '?').charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.name || 'Sans nom'}</p>
                            <p className="text-xs text-gray-400">{user.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                          user.role === 'driver' ? 'text-emerald-600 bg-emerald-50' :
                          user.role === 'admin' ? 'text-purple-600 bg-purple-50' :
                          'text-blue-600 bg-blue-50'
                        }`}>
                          {user.role === 'driver' ? 'Chauffeur' : user.role === 'admin' ? 'Admin' : 'Voyageur'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">{formatDate(user.createdAt)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="text-xs font-medium text-primary hover:text-primary-light transition-colors cursor-pointer"
                          onClick={() => setSelectedUser(user)}
                        >
                          Voir profil
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-gray-400">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} utilisateurs)
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

      {/* User Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 relative">
            <button
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
              onClick={() => setSelectedUser(null)}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-primary">
                  {(selectedUser.name || '?').charAt(0)}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {selectedUser.name || 'Sans nom'}
              </h3>
              <span className={`mt-1 inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg ${
                selectedUser.role === 'driver' ? 'text-emerald-600 bg-emerald-50' :
                selectedUser.role === 'admin' ? 'text-purple-600 bg-purple-50' :
                'text-blue-600 bg-blue-50'
              }`}>
                {selectedUser.role === 'driver' ? 'Chauffeur' : selectedUser.role === 'admin' ? 'Admin' : 'Voyageur'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Telephone</span>
                <span className="text-sm font-medium text-gray-900">{selectedUser.phone}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-sm font-medium text-gray-900">{selectedUser.email || '--'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Inscription</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(selectedUser.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">ID</span>
                <span className="text-xs font-mono text-gray-400">{selectedUser.id}</span>
              </div>
            </div>

            <button
              className="mt-6 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-xl transition-colors cursor-pointer"
              onClick={() => setSelectedUser(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
