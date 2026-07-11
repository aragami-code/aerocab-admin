import { useState, useEffect } from 'react';
import { Share2, Users, ArrowRight, Calendar, Search, Loader2 } from 'lucide-react';
import { adminApi } from '../services/api';
import { PageStats } from '../components/PageStats';

export function ReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchReferrals = async (p = page) => {
    setLoading(true);
    try {
      const res = await adminApi.getReferrals(p, 20);
      setReferrals(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals(page);
  }, [page]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-primary" />
            Suivi du Parrainage
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualisez les relations parrain-filleul et l'impact sur la croissance.
          </p>
        </div>
        <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
          <p className="text-xs text-primary font-medium uppercase tracking-wider">Total Parrainages</p>
          <p className="text-xl font-bold text-primary">{total}</p>
        </div>
      </div>

      <PageStats domain="referrals" title="Statistiques parrainage" />

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled
            />
          </div>
          <div className="text-xs text-gray-400 italic">
            Récompense actuelle : 500 pts / utilisateur
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm">Chargement des données...</p>
          </div>
        ) : referrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Users className="w-12 h-12 opacity-20 mb-3" />
            <p className="text-sm">Aucun parrainage enregistré pour le moment.</p>
          </div>
        ) : (
          <>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                  <th className="px-6 py-4">Filleul (Nouveau)</th>
                  <th className="px-6 py-4 text-center"></th>
                  <th className="px-6 py-4">Parrain</th>
                  <th className="px-6 py-4">Date d'inscription</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{ref.name || 'Sans nom'}</span>
                        <span className="text-xs text-gray-500 font-mono">{ref.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-full">
                         <ArrowRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{ref.referrer?.name || 'Sans nom'}</span>
                        <span className="text-xs text-gray-500 font-mono">{ref.referrer?.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-3.5 h-3.5 opacity-40" />
                        {new Date(ref.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Page {page} sur {totalPages}
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
                  >
                    Précédent
                  </button>
                  <button 
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
          <Share2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-blue-900">À propos du parrainage</h3>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            Le système de parrainage actuel offre 500 points au parrain et 500 points au filleul dès l'inscription. 
            Cela encourage une croissance organique et récompense vos utilisateurs les plus fidèles. 
            Les points peuvent être utilisés pour payer des courses directement sur la plateforme.
          </p>
        </div>
      </div>
    </div>
  );
}
