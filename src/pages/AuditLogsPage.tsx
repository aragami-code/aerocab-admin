import { useState, useEffect } from 'react';
import { Shield, Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { adminApi, AuditLog } from '../services/api';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN:  'bg-purple-100 text-purple-700',
  PATCH:  'bg-yellow-100 text-yellow-700',
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = async (p = page, entity = entityFilter) => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs({
        entity: entity || undefined,
        limit: 25,
        offset: (p - 1) * 25,
      });
      setLogs(res.items);
      setTotal(res.total);
      setTotalPages(Math.ceil(res.total / 25));
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(page, entityFilter); }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1, entityFilter);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Journal d'audit
          </h1>
          <p className="text-sm text-gray-500 mt-1">{total} entrée{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => fetchLogs(page)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Filtres */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            placeholder="Filtrer par entité (ex: Booking)"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">
          Filtrer
        </button>
        {entityFilter && (
          <button type="button" onClick={() => { setEntityFilter(''); setPage(1); fetchLogs(1, ''); }}
            className="px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200">
            Effacer
          </button>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Shield className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Aucune entrée d'audit</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Date', 'Action', 'Entité', 'ID entité', 'Admin/User', 'IP', 'Détails'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <>
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    >
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{log.entity}</td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-400 max-w-[100px] truncate">{log.entityId ?? '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-400 max-w-[100px] truncate">
                        {log.adminId ?? log.userId ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">{log.ipAddress ?? '—'}</td>
                      <td className="py-3 px-4 text-xs text-primary">{log.meta ? '▶ voir' : '—'}</td>
                    </tr>
                    {expanded === log.id && log.meta && (
                      <tr key={`${log.id}-meta`} className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-3">
                          <pre className="text-xs text-gray-600 bg-white rounded-lg p-3 border border-gray-200 overflow-auto max-h-40">
                            {JSON.stringify(log.meta, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Page {page} / {totalPages} — {total} entrées</p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
