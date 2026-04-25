import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ToggleLeft, Smartphone, Car, Shield } from 'lucide-react';
import { adminApi } from '../services/api';

interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  category: 'passenger' | 'driver' | 'shared';
  enabled: boolean;
  saving: boolean;
}

const FLAG_DEFS: Omit<FeatureFlag, 'enabled' | 'saving'>[] = [
  // Passager
  { key: 'feature_referral_enabled',           label: 'Parrainage',               description: 'Code parrainage, bonus filleul/parrain',        category: 'passenger' },
  { key: 'feature_cashback_enabled',           label: 'Cashback points',           description: 'Points offerts après chaque course complétée',  category: 'passenger' },
  { key: 'feature_points_purchase_enabled',    label: 'Achat de points',           description: 'Onglet recharge wallet (forfaits)',              category: 'passenger' },
  { key: 'feature_promo_enabled',              label: 'Codes promo',               description: 'Champ code promo lors de la réservation',       category: 'passenger' },
  { key: 'feature_destination_change_enabled', label: 'Modifier destination',      description: 'Passager peut changer de destination en cours',  category: 'passenger' },
  // Chauffeur
  { key: 'feature_driver_withdrawal_enabled',  label: 'Retrait wallet',            description: 'Chauffeur peut demander un retrait de son solde',category: 'driver' },
  { key: 'feature_consigne_enabled',           label: 'Mode consigne',             description: 'Offre consigne (garde-bagages multi-jours)',     category: 'driver' },
  { key: 'feature_breakdown_report_enabled',   label: 'Signalement panne',         description: 'Bouton "Panne" dans l\'app chauffeur',           category: 'driver' },
  // Partagé (passager + chauffeur)
  { key: 'feature_chat_enabled',               label: 'Chat in-app',               description: 'Messagerie passager ↔ chauffeur pendant la course', category: 'shared' },
  { key: 'feature_sos_enabled',                label: 'Bouton SOS',                description: 'Alerte urgence dans les apps passager et chauffeur', category: 'shared' },
  { key: 'feature_rating_enabled',             label: 'Notation',                  description: 'Écran de notation après chaque course',          category: 'shared' },
];

const CATEGORY_META = {
  passenger: { label: 'App Passager',         icon: Smartphone, color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200' },
  driver:    { label: 'App Chauffeur',         icon: Car,        color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  shared:    { label: 'Commun (Passager + Chauffeur)', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
};

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-green-500' : 'bg-slate-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );
}

export function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(
    FLAG_DEFS.map(f => ({ ...f, enabled: true, saving: false }))
  );
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const settings = await adminApi.getSettings();
      setFlags(FLAG_DEFS.map(f => ({
        ...f,
        enabled: settings[f.key] !== 'false',
        saving: false,
      })));
    } catch {
      showToast('error', 'Impossible de charger les feature flags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (key: string, value: boolean) => {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, saving: true } : f));
    try {
      await adminApi.setSetting(key, String(value));
      setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: value, saving: false } : f));
      const flag = FLAG_DEFS.find(f => f.key === key);
      showToast('success', `${flag?.label} ${value ? 'activé' : 'désactivé'}`);
    } catch (e: any) {
      setFlags(prev => prev.map(f => f.key === key ? { ...f, saving: false } : f));
      showToast('error', e.message || 'Erreur sauvegarde');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const categories = (['passenger', 'driver', 'shared'] as const);
  const enabledCount = flags.filter(f => f.enabled).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-slate-800 flex items-center gap-2">
          <ToggleLeft className="w-6 h-6 text-primary" />
          Feature Flags
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Activez ou désactivez les fonctionnalités des apps en temps réel — sans redéploiement
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{enabledCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Activées</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{flags.length - enabledCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Désactivées</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-700">{flags.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total</p>
        </div>
      </div>

      {/* Par catégorie */}
      {categories.map(cat => {
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;
        const catFlags = flags.filter(f => f.category === cat);
        const catEnabled = catFlags.filter(f => f.enabled).length;

        return (
          <div key={cat} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`px-6 py-4 flex items-center gap-3 border-b border-slate-100 ${meta.bg}`}>
              <div className={`w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${meta.color}`} />
              </div>
              <div className="flex-1">
                <h2 className={`text-sm font-semibold ${meta.color}`}>{meta.label}</h2>
                <p className="text-xs text-slate-500">{catEnabled}/{catFlags.length} activées</p>
              </div>
              {/* Tout activer / désactiver */}
              <div className="flex gap-2">
                <button
                  onClick={() => catFlags.forEach(f => !f.enabled && toggle(f.key, true))}
                  className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                >
                  Tout activer
                </button>
                <button
                  onClick={() => catFlags.forEach(f => f.enabled && toggle(f.key, false))}
                  className="text-xs px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Tout désactiver
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {catFlags.map(flag => (
                <div key={flag.key} className="flex items-center justify-between px-6 py-4">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800">{flag.label}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        flag.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {flag.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{flag.description}</p>
                    <p className="text-[10px] font-mono text-slate-300 mt-0.5">{flag.key}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {flag.saving && <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                    <Toggle
                      checked={flag.enabled}
                      onChange={(v) => toggle(flag.key, v)}
                      disabled={flag.saving}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-center text-slate-400">
        Les apps lisent ces flags au démarrage via <span className="font-mono">/api/config</span> — rechargement nécessaire pour prendre effet côté mobile.
      </p>
    </div>
  );
}
