import { useState, useEffect } from 'react';
import { Plus, Tag, Trash2, ToggleLeft, ToggleRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { adminApi, PromoCode } from '../services/api';

const EMPTY_FORM = { code: '', discount: 10, maxUses: 100, expiresAt: '', usagePerUser: false };

export function PromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPromos = async (p = page) => {
    setLoading(true);
    try {
      const res = await adminApi.getPromos(p, 20);
      setPromos(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch {
      setError('Impossible de charger les codes promo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromos(page); }, [page]);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setError('');
    try {
      await adminApi.createPromo({
        code: form.code.trim().toUpperCase(),
        discount: form.discount,
        maxUses: form.maxUses,
        expiresAt: form.expiresAt || undefined,
        usagePerUser: form.usagePerUser,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      flash('Code promo créé avec succès');
      fetchPromos(1);
      setPage(1);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (promo: PromoCode) => {
    try {
      const updated = await adminApi.togglePromo(promo.id);
      setPromos(p => p.map(x => x.id === promo.id ? updated : x));
      flash(`Code ${promo.code} ${updated.isActive ? 'activé' : 'désactivé'}`);
    } catch {
      setError('Erreur lors du changement de statut');
    }
  };

  const handleDelete = async (promo: PromoCode) => {
    if (!confirm(`Supprimer le code "${promo.code}" ?`)) return;
    try {
      await adminApi.deletePromo(promo.id);
      setPromos(p => p.filter(x => x.id !== promo.id));
      setTotal(t => t - 1);
      flash(`Code ${promo.code} supprimé`);
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  const statusInfo = (promo: PromoCode) => {
    if (!promo.isActive) return { label: 'Inactif', color: 'text-gray-400 bg-gray-100', icon: XCircle };
    if (promo.usedCount >= promo.maxUses) return { label: 'Épuisé', color: 'text-orange-600 bg-orange-50', icon: AlertCircle };
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return { label: 'Expiré', color: 'text-red-600 bg-red-50', icon: XCircle };
    return { label: 'Actif', color: 'text-green-700 bg-green-50', icon: CheckCircle };
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Codes Promo</h1>
          <p className="text-sm text-gray-500 mt-1">{total} code{total !== 1 ? 's' : ''} au total</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau code
        </button>
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" /> Créer un code promo
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
              <input
                required maxLength={20}
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="EX: PROMO50"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remise (pts) *</label>
              <input
                required type="number" min={1}
                value={form.discount}
                onChange={e => setForm(f => ({ ...f, discount: +e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Utilisations max *</label>
              <input
                required type="number" min={1}
                value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: +e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expiration (optionnel)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="usagePerUser"
                checked={form.usagePerUser}
                onChange={e => setForm(f => ({ ...f, usagePerUser: e.target.checked }))}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
              />
              <label htmlFor="usagePerUser" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                Usage unique par utilisateur
              </label>
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                Annuler
              </button>
              <button type="submit" disabled={creating}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-60">
                {creating ? 'Création…' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : promos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Tag className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Aucun code promo</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Code', 'Remise', 'Utilisations', 'Expiration', 'Type', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {promos.map(promo => {
                  const { label, color, icon: Icon } = statusInfo(promo);
                  return (
                    <tr key={promo.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-primary tracking-widest text-xs bg-primary/8 px-2 py-1 rounded-md">
                          {promo.code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-accent">{promo.discount} pts</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(100, (promo.usedCount / promo.maxUses) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{promo.usedCount}/{promo.maxUses}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${promo.usagePerUser ? 'text-purple-600 bg-purple-50 border border-purple-100' : 'text-blue-600 bg-blue-50 border border-blue-100'}`}>
                          {promo.usagePerUser ? 'Unique/Passager' : 'Multiple'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${color}`}>
                          <Icon className="w-3 h-3" />
                          {label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggle(promo)}
                            title={promo.isActive ? 'Désactiver' : 'Activer'}
                            className="text-gray-400 hover:text-primary transition-colors"
                          >
                            {promo.isActive
                              ? <ToggleRight className="w-5 h-5 text-primary" />
                              : <ToggleLeft className="w-5 h-5" />
                            }
                          </button>
                          <button
                            onClick={() => handleDelete(promo)}
                            title="Supprimer"
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Page {page} / {totalPages}</p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    Précédent
                  </button>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    Suivant
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
