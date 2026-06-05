import { useState, useEffect } from 'react';
import { Plus, Globe, CheckCircle, XCircle, AlertCircle, AlertTriangle, Star, Power, PauseCircle } from 'lucide-react';
import { adminApi } from '../services/api';

interface OperatedCountry {
  code: string;
  name: string;
  currency: string;
  currencySymbol?: string;
  flagEmoji?: string;
  status: string;
  isDefault: boolean;
  paymentMethods?: any;
  [key: string]: any;
}

interface Readiness {
  ready: boolean;
  missing: string[];
}

const EMPTY_FORM = {
  code: '',
  name: '',
  currency: '',
  currencySymbol: '',
  currencyDecimals: 0,
  phonePrefix: '',
  flagEmoji: '',
};

export function PaysPage() {
  const [countries, setCountries] = useState<OperatedCountry[]>([]);
  const [readiness, setReadiness] = useState<Record<string, Readiness>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCountries = async () => {
    setLoading(true);
    try {
      const list = await adminApi.listOperatedCountries();
      setCountries(list || []);
      const entries = await Promise.all(
        (list || []).map(async (c: OperatedCountry) => {
          try {
            const r = await adminApi.getCountryReadiness(c.code);
            return [c.code, r] as const;
          } catch {
            return [c.code, { ready: false, missing: ['inconnu'] }] as const;
          }
        }),
      );
      setReadiness(Object.fromEntries(entries));
    } catch {
      setError('Impossible de charger les pays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCountries(); }, []);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const flashError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setError('');
    try {
      await adminApi.createOperatedCountry({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        currency: form.currency.trim().toUpperCase(),
        currencySymbol: form.currencySymbol.trim() || undefined,
        currencyDecimals: form.currencyDecimals,
        phonePrefix: form.phonePrefix.trim() || undefined,
        flagEmoji: form.flagEmoji.trim() || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      flash(`Pays ${form.name || form.code} créé (brouillon)`);
      fetchCountries();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (c: OperatedCountry) => {
    setBusy(c.code);
    try {
      await adminApi.activateCountry(c.code);
      flash(`${c.name} activé`);
      await fetchCountries();
    } catch (e: any) {
      flashError(e.message || `Impossible d'activer ${c.name}`);
    } finally {
      setBusy('');
    }
  };

  const handleSuspend = async (c: OperatedCountry) => {
    if (!confirm(`Suspendre ${c.name} ?`)) return;
    setBusy(c.code);
    try {
      await adminApi.suspendCountry(c.code);
      flash(`${c.name} suspendu`);
      await fetchCountries();
    } catch (e: any) {
      flashError(e.message || `Impossible de suspendre ${c.name}`);
    } finally {
      setBusy('');
    }
  };

  const handleSetDefault = async (c: OperatedCountry) => {
    setBusy(c.code);
    try {
      await adminApi.setDefaultCountry(c.code);
      flash(`${c.name} défini par défaut`);
      await fetchCountries();
    } catch (e: any) {
      flashError(e.message || `Impossible de définir ${c.name} par défaut`);
    } finally {
      setBusy('');
    }
  };

  const statusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Actif', color: 'text-green-700 bg-green-50', icon: CheckCircle };
      case 'suspended':
        return { label: 'Suspendu', color: 'text-orange-600 bg-orange-50', icon: PauseCircle };
      default:
        return { label: 'Brouillon', color: 'text-gray-500 bg-gray-100', icon: XCircle };
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pays opérés</h1>
          <p className="text-sm text-gray-500 mt-1">
            {countries.length} pays configuré{countries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau pays
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
            <Globe className="w-4 h-4 text-primary" /> Créer un pays
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code ISO *</label>
              <input
                required maxLength={3}
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: CM"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Cameroun"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Devise (ISO) *</label>
              <input
                required maxLength={3}
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                placeholder="Ex: XAF"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Symbole devise</label>
              <input
                value={form.currencySymbol}
                onChange={e => setForm(f => ({ ...f, currencySymbol: e.target.value }))}
                placeholder="Ex: FCFA"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Décimales devise</label>
              <input
                type="number" min={0} max={4}
                value={form.currencyDecimals}
                onChange={e => setForm(f => ({ ...f, currencyDecimals: +e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Préfixe téléphone</label>
              <input
                value={form.phonePrefix}
                onChange={e => setForm(f => ({ ...f, phonePrefix: e.target.value }))}
                placeholder="Ex: +237"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Drapeau (emoji)</label>
              <input
                value={form.flagEmoji}
                onChange={e => setForm(f => ({ ...f, flagEmoji: e.target.value }))}
                placeholder="🇨🇲"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
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
        ) : countries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Globe className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Aucun pays configuré</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Pays', 'Devise', 'Statut', 'Complétude', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {countries.map(c => {
                const { label, color, icon: Icon } = statusInfo(c.status);
                const r = readiness[c.code];
                const isReady = r?.ready;
                const missing = r?.missing || [];
                const isBusy = busy === c.code;
                return (
                  <tr key={c.code} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl leading-none">{c.flagEmoji || '🏳️'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{c.name}</span>
                            {c.isDefault && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded text-amber-600 bg-amber-50 border border-amber-100">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Défaut
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-xs text-gray-400">{c.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {c.currency}{c.currencySymbol ? ` (${c.currencySymbol})` : ''}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${color}`}>
                        <Icon className="w-3 h-3" />
                        {label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {r === undefined ? (
                        <span className="text-xs text-gray-400">…</span>
                      ) : isReady ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Complète
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-orange-600"
                          title={`Manque : ${missing.join(', ')}`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Manque : {missing.join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {c.status !== 'active' && (
                          <button
                            onClick={() => handleActivate(c)}
                            disabled={!isReady || isBusy}
                            title={!isReady ? `Incomplet — manque : ${missing.join(', ')}` : 'Activer ce pays'}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Power className="w-3.5 h-3.5" /> Activer
                          </button>
                        )}
                        {c.status === 'active' && (
                          <button
                            onClick={() => handleSuspend(c)}
                            disabled={isBusy}
                            title="Suspendre ce pays"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-40"
                          >
                            <PauseCircle className="w-3.5 h-3.5" /> Suspendre
                          </button>
                        )}
                        {!c.isDefault && (
                          <button
                            onClick={() => handleSetDefault(c)}
                            disabled={isBusy}
                            title="Définir comme pays par défaut"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                          >
                            <Star className="w-3.5 h-3.5" /> Par défaut
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
