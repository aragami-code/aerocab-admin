import { useState, useEffect } from 'react';
import { AlertTriangle, Search, MessageSquare, Flag, Shield, Loader2, AlertCircle } from 'lucide-react';
import { adminApi } from '../services/api';

const mockReports = [
  { id: '1', type: 'complaint', reporter: 'Marie N.', subject: 'Chauffeur Jean K. - comportement', status: 'open', date: '01 Mar 2026' },
  { id: '2', type: 'review', reporter: 'Pierre A.', subject: 'Avis negatif - chauffeur Paul N.', status: 'open', date: '28 Feb 2026' },
  { id: '3', type: 'safety', reporter: 'Sophie B.', subject: 'Vehicule en mauvais etat', status: 'resolved', date: '27 Feb 2026' },
];

const typeConfig = {
  complaint: { label: 'Reclamation', icon: MessageSquare, classes: 'text-amber-600 bg-amber-50' },
  review: { label: 'Avis', icon: Flag, classes: 'text-blue-600 bg-blue-50' },
  safety: { label: 'Securite', icon: Shield, classes: 'text-red-500 bg-red-50' },
};

export function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.getReports();
      setReports(result.data);
    } catch {
      // Fallback to mock data if API not available
      setReports(mockReports);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = search
    ? reports.filter((r) =>
        (r.subject || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.reporter || '').toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  const openCount = reports.filter((r) => r.status === 'open').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">
            Signalements
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Signalements, avis et reclamations a traiter
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-semibold text-red-500">{openCount} en attente</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un signalement..."
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
            Reessayer
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Type</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Sujet</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Signale par</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Statut</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                    Aucun signalement trouve
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const type = typeConfig[report.type as keyof typeof typeConfig] || typeConfig.complaint;
                  const TypeIcon = type.icon;
                  return (
                    <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${type.classes}`}>
                          <TypeIcon className="w-3 h-3" />
                          {type.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{report.subject}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{report.reporter}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                          report.status === 'open' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'
                        }`}>
                          {report.status === 'open' ? 'Ouvert' : 'Resolu'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">{report.date}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
