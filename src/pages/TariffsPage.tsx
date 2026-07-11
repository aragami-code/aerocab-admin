import { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, DollarSign, Car, Zap, Package, Clock, Globe, Plus, Trash2, ChevronRight, Star, Settings2, Radio, Mail, X, CreditCard, Smartphone, Check } from 'lucide-react';
import { adminApi } from '../services/api';

interface VehicleTariff {
  basePricePerKm: number;
  minFare: number;
  coefficient: number;
  label?: string;
  isActive?: boolean;
  maxPassengers?: number;
  commissionRate?: number;
}
interface ReferralBonus {
  onSignup: number;
  onFirstRide: number;
  newUserBonus: number;
}
interface TariffsConfig {
  basePricePerKm: number;
  fcfaPerPoint: number;
  startupFee: number;
  startupMinutes: number;
  pricePerMinute: number;
  currency?: string;
  currencySymbol?: string;
  vehicles: Record<string, VehicleTariff>;
  // Système de points
  pointValue: number;
  pointRechargeRate: number;
  cashbackRate: number;
  referralBonus: ReferralBonus;
}


// Pays connus avec leurs devises et libellés
const KNOWN_COUNTRIES: Record<string, { name: string; currency: string; symbol: string; flag: string }> = {
  CM: { name: 'Cameroun',       currency: 'XAF', symbol: 'FCFA', flag: '🇨🇲' },
  US: { name: 'États-Unis',     currency: 'USD', symbol: '$',    flag: '🇺🇸' },
  FR: { name: 'France',         currency: 'EUR', symbol: '€',    flag: '🇫🇷' },
  GB: { name: 'Royaume-Uni',    currency: 'GBP', symbol: '£',    flag: '🇬🇧' },
  CI: { name: "Côte d'Ivoire",  currency: 'XOF', symbol: 'FCFA', flag: '🇨🇮' },
  SN: { name: 'Sénégal',        currency: 'XOF', symbol: 'FCFA', flag: '🇸🇳' },
  GH: { name: 'Ghana',          currency: 'GHS', symbol: 'GH₵',  flag: '🇬🇭' },
  NG: { name: 'Nigéria',        currency: 'NGN', symbol: '₦',    flag: '🇳🇬' },
  ZA: { name: 'Afrique du Sud', currency: 'ZAR', symbol: 'R',    flag: '🇿🇦' },
  MA: { name: 'Maroc',          currency: 'MAD', symbol: 'DH',   flag: '🇲🇦' },
  AE: { name: 'Émirats Arabes', currency: 'AED', symbol: 'AED',  flag: '🇦🇪' },
  CA: { name: 'Canada',         currency: 'CAD', symbol: 'CA$',  flag: '🇨🇦' },
  BR: { name: 'Brésil',         currency: 'BRL', symbol: 'R$',   flag: '🇧🇷' },
};

const DEFAULT_TARIFFS: TariffsConfig = {
  basePricePerKm: 250,
  fcfaPerPoint: 1,
  startupFee: 500,
  startupMinutes: 3,
  pricePerMinute: 50,
  currency: 'XAF',
  currencySymbol: 'FCFA',
  vehicles: {
    eco:          { basePricePerKm: 250, minFare: 3000,  coefficient: 1.0 },
    eco_plus:     { basePricePerKm: 250, minFare: 3500,  coefficient: 1.2 },
    standard:     { basePricePerKm: 250, minFare: 5000,  coefficient: 1.4 },
    confort:      { basePricePerKm: 250, minFare: 8000,  coefficient: 2.0 },
    confort_plus: { basePricePerKm: 250, minFare: 12000, coefficient: 2.5 },
  },
  pointValue: 1,
  pointRechargeRate: 1,
  cashbackRate: 0.05,
  referralBonus: { onSignup: 500, onFirstRide: 1000, newUserBonus: 300 },
};

function mergeTariffs(data: any): TariffsConfig {
  return {
    ...DEFAULT_TARIFFS,
    ...data,
    vehicles:      { ...DEFAULT_TARIFFS.vehicles,      ...(data.vehicles      ?? {}) },
    referralBonus: { ...DEFAULT_TARIFFS.referralBonus, ...(data.referralBonus ?? {}) },
  };
}

function NumberInput({ label, value, onChange, suffix, step = 1, min = 0 }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number; min?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number" min={min} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-16"
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>}
      </div>
    </div>
  );
}

function TariffForm({
  config, setConfig, onSave, onReset, onDelete,
  saving, saved, error, isCountry,
}: {
  config: TariffsConfig;
  setConfig: (c: TariffsConfig) => void;
  onSave: () => void;
  onReset: () => void;
  onDelete?: () => void;
  saving: boolean;
  saved: boolean;
  error: string;
  isCountry: boolean;
}) {
  const sym = config.currencySymbol || 'FCFA';

  const setGlobal = (key: keyof TariffsConfig, v: number | string) => setConfig({ ...config, [key]: v });
  const setVehicle = (vt: string, key: keyof VehicleTariff, v: number | string | boolean) =>
    setConfig({ ...config, vehicles: { ...config.vehicles, [vt]: { ...config.vehicles[vt], [key]: v } } });

  const previewPrice = (vt: string) => {
    const v = config.vehicles[vt];
    return v ? Math.max(v.minFare, Math.round(config.startupFee + 15 * v.basePricePerKm * v.coefficient)) : 0;
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Devise du pays */}
      {isCountry && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center"><Globe className="w-5 h-5 text-indigo-500" /></div>
            <div><h2 className="font-semibold text-gray-900">Devise locale</h2><p className="text-xs text-gray-500">Monnaie utilisée dans ce pays</p></div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code devise (ISO 4217)</label>
              <input type="text" maxLength={3} value={config.currency ?? ''} onChange={e => setGlobal('currency', e.target.value.toUpperCase())}
                placeholder="XAF, USD, EUR…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Symbole affiché</label>
              <input type="text" maxLength={6} value={config.currencySymbol ?? ''} onChange={e => setGlobal('currencySymbol', e.target.value)}
                placeholder="FCFA, $, €…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
      )}

      {/* Points rate */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center"><Zap className="w-5 h-5 text-amber-500" /></div>
          <div><h2 className="font-semibold text-gray-900">Taux des Points</h2><p className="text-xs text-gray-500">Valeur d'un point en monnaie locale</p></div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <NumberInput label={`Monnaie par point`} value={config.fcfaPerPoint} onChange={v => setGlobal('fcfaPerPoint', v)} suffix={sym} min={1} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Aperçu des forfaits</label>
            <div className="grid grid-cols-2 gap-2">
              {[1000, 3000, 5000, 10000].map(pts => (
                <div key={pts} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                  <span className="font-bold text-primary">{pts} pts</span>
                  <span className="text-gray-400 ml-1">→ {(pts * config.fcfaPerPoint).toLocaleString()} {sym}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Frais de démarrage */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center"><Clock className="w-5 h-5 text-teal-500" /></div>
          <div>
            <h2 className="font-semibold text-gray-900">Frais de démarrage</h2>
            <p className="text-xs text-gray-500">Frais fixes inclus dans chaque course + minutes offertes</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <NumberInput label={`Frais fixe (${sym})`} value={config.startupFee} onChange={v => setGlobal('startupFee', v)} suffix={sym} step={100} />
          <NumberInput label="Minutes incluses" value={config.startupMinutes} onChange={v => setGlobal('startupMinutes', v)} suffix="min" min={0} />
          <NumberInput label={`Prix/min au-delà`} value={config.pricePerMinute} onChange={v => setGlobal('pricePerMinute', v)} suffix={`${sym}/min`} step={10} />
        </div>
      </div>

      {/* Vehicle tariffs — dynamique */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Car className="w-5 h-5 text-blue-500" /></div>
            <div><h2 className="font-semibold text-gray-900">Catégories de véhicules</h2><p className="text-xs text-gray-500">Ajouter, activer/désactiver ou supprimer des catégories</p></div>
          </div>
          <button
            onClick={() => {
              const id = `custom_${Date.now()}`;
              setConfig({ ...config, vehicles: { ...config.vehicles, [id]: { basePricePerKm: 250, minFare: 3000, coefficient: 1.0, label: 'Nouveau', isActive: true, maxPassengers: 4 } } });
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/5 rounded-lg hover:bg-primary/10"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
        <div className="space-y-3">
          {Object.keys(config.vehicles).map(vt => {
            const v = config.vehicles[vt];
            const active = v.isActive !== false;
            return (
              <div key={vt} className={`border rounded-xl p-4 transition-all ${active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {/* Toggle actif/inactif */}
                  <button
                    onClick={() => setVehicle(vt, 'isActive' as any, !active)}
                    title={active ? 'Désactiver' : 'Activer'}
                    className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${active ? 'bg-green-400' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                  {/* Label éditable */}
                  <input
                    type="text"
                    value={v.label ?? vt}
                    onChange={e => setVehicle(vt, 'label' as any, e.target.value)}
                    className="flex-1 font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary focus:outline-none text-sm"
                    placeholder="Nom de la catégorie"
                  />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {active ? 'Actif' : 'Inactif'}
                  </span>
                  {/* Supprimer */}
                  <button
                    onClick={() => {
                      const { [vt]: _, ...rest } = config.vehicles;
                      setConfig({ ...config, vehicles: rest });
                    }}
                    className="text-red-400 hover:text-red-600 p-1 rounded"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Prix/km ({sym})</label>
                    <input type="number" min={0} value={v.basePricePerKm} onChange={e => setVehicle(vt, 'basePricePerKm', +e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Coefficient</label>
                    <input type="number" min={0.1} step={0.1} value={v.coefficient} onChange={e => setVehicle(vt, 'coefficient', +e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Base fixe ({sym})</label>
                    <input type="number" min={0} step={500} value={v.minFare} onChange={e => setVehicle(vt, 'minFare', +e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Places max</label>
                    <input type="number" min={1} max={20} value={v.maxPassengers ?? 4} onChange={e => setVehicle(vt, 'maxPassengers' as any, +e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Commission % <span className="text-gray-400">(vide=global)</span></label>
                    <input
                      type="number" min={0} max={100} step={1}
                      placeholder="Global"
                      value={v.commissionRate != null ? Math.round(v.commissionRate * 100) : ''}
                      onChange={e => setVehicle(vt, 'commissionRate' as any, e.target.value === '' ? undefined : parseFloat(e.target.value) / 100)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Aperçu 15km</label>
                    <div className="py-1.5">
                      <span className="font-semibold text-primary text-sm">{previewPrice(vt).toLocaleString()} {sym}</span>
                      <br /><span className="text-[10px] text-gray-400">≈ {Math.ceil(previewPrice(vt) / config.fcfaPerPoint)} pts</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Système de points */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center"><Star className="w-5 h-5 text-yellow-500" /></div>
          <div>
            <h2 className="font-semibold text-gray-900">Système de points</h2>
            <p className="text-xs text-gray-500">Taux de conversion et cashback pour ce pays</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <NumberInput
              label={`Valeur d'1 point (${sym})`}
              value={config.pointValue}
              onChange={v => setConfig({ ...config, pointValue: v })}
              suffix={sym}
              step={0.01}
              min={0.01}
            />
            <p className="text-xs text-gray-400 mt-1">1 pt = {config.pointValue} {sym}</p>
          </div>
          <div>
            <NumberInput
              label={`Taux de recharge (pts/${sym})`}
              value={config.pointRechargeRate}
              onChange={v => setConfig({ ...config, pointRechargeRate: v })}
              suffix="pts"
              step={0.1}
              min={0.01}
            />
            <p className="text-xs text-gray-400 mt-1">1 {sym} versé = {config.pointRechargeRate} pt(s)</p>
          </div>
          <div>
            <NumberInput
              label="Cashback après course"
              value={Math.round(config.cashbackRate * 100)}
              onChange={v => setConfig({ ...config, cashbackRate: v / 100 })}
              suffix="%"
              step={1}
              min={0}
            />
            <p className="text-xs text-gray-400 mt-1">Ex: course 5 000 {sym} → {Math.round(5000 * config.cashbackRate / config.pointValue)} pts</p>
          </div>
        </div>

        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Bonus parrainage</p>
        <div className="grid grid-cols-3 gap-6">
          <NumberInput
            label="Parrain — à l'inscription"
            value={config.referralBonus.onSignup}
            onChange={v => setConfig({ ...config, referralBonus: { ...config.referralBonus, onSignup: v } })}
            suffix="pts"
          />
          <NumberInput
            label="Parrain — 1re course filleul"
            value={config.referralBonus.onFirstRide}
            onChange={v => setConfig({ ...config, referralBonus: { ...config.referralBonus, onFirstRide: v } })}
            suffix="pts"
          />
          <NumberInput
            label="Nouvel utilisateur"
            value={config.referralBonus.newUserBonus}
            onChange={v => setConfig({ ...config, referralBonus: { ...config.referralBonus, newUserBonus: v } })}
            suffix="pts"
          />
        </div>
      </div>

      {/* Global fallback */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-500" /></div>
          <div><h2 className="font-semibold text-gray-900">Prix de base global</h2><p className="text-xs text-gray-500">Fallback si le véhicule n'a pas de prix/km défini</p></div>
        </div>
        <div className="w-48">
          <NumberInput label={`Prix/km par défaut (${sym})`} value={config.basePricePerKm} onChange={v => setGlobal('basePricePerKm', v)} suffix={sym} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 pb-6">
        <div className="flex gap-3">
          <button onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
            <RotateCcw className="w-4 h-4" /> Réinitialiser
          </button>
          {onDelete && (
            <button onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
              <Trash2 className="w-4 h-4" /> Supprimer config pays
            </button>
          )}
        </div>
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-60">
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde…' : saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
}

// Keys shown in the AppSettings panel, grouped by category
const APP_SETTING_GROUPS: Array<{ label: string; keys: Array<{ key: string; label: string; hint?: string }> }> = [
  {
    label: 'Dispatch & Proximité',
    keys: [
      { key: 'proximity_radius_km',          label: 'Rayon proximité (km)',              hint: 'Rayon de recherche chauffeur' },
      { key: 'proximity_radius_extended_km', label: 'Rayon étendu (km)',                 hint: 'Si pas assez de chauffeurs' },
      { key: 'min_driver_score',             label: 'Score chauffeur minimum',           hint: 'Ex: 4.0' },
      { key: 'dispatch_global_limit',        label: 'Nb chauffeurs notifiés en parallèle' },
    ],
  },
  {
    label: 'Timeouts & Timings',
    keys: [
      { key: 'booking_assignment_timeout_min', label: 'Timeout assignation (min)' },
      { key: 'passenger_confirm_timeout_min',  label: 'Timeout confirmation passager (min)' },
    ],
  },
  {
    label: 'OTP & Canaux',
    keys: [
      { key: 'otp_channel',        label: 'Canal OTP',           hint: 'sms | email | both' },
      { key: 'otp_expiry_minutes', label: 'Expiration OTP (min)' },
    ],
  },
  {
    label: 'Vols',
    keys: [
      { key: 'flight_sync_window_hours', label: 'Fenêtre sync vols (h)' },
      { key: 'flight_batch_size',        label: 'Taille batch sync vols' },
    ],
  },
  {
    label: 'Mode Test OTP',
    keys: [
      { key: 'test_mode_enabled', label: 'Activer le mode test', hint: 'true | false — DÉSACTIVER EN PRODUCTION' },
      { key: 'test_otp_value',    label: 'Code OTP fixe',        hint: 'Ex: 123456 — utilisé si test_mode_enabled=true' },
    ],
  },
];

const SMS_PROVIDERS = ['mock', 'twilio', 'orange-cm', 'africas-talking'] as const;
type SmsProvider = typeof SMS_PROVIDERS[number];

const PROVIDER_LABELS: Record<SmsProvider, string> = {
  mock:               'Mock (dev)',
  twilio:             'Twilio',
  'orange-cm':        'Orange CM',
  'africas-talking':  "Africa's Talking",
};

function SmsRoutingPanel() {
  const [rules, setRules]               = useState<{ prefix: string; provider: string }[]>([]);
  const [defaultProvider, setDefault]   = useState<string>('mock');
  const [available, setAvailable]       = useState<string[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [error, setError]               = useState('');
  const [loadError, setLoadError]       = useState('');

  useEffect(() => {
    adminApi.getSmsRouting()
      .then(data => {
        setRules(data.rules);
        setDefault(data.defaultProvider);
        setAvailable(data.availableProviders);
        setLoading(false);
      })
      .catch((err: Error) => {
        setLoadError(err.message || 'Impossible de charger les règles SMS');
        setLoading(false);
      });
  }, []);

  const addRule = () => setRules(prev => [...prev, { prefix: '', provider: 'mock' }]);

  const updateRule = (idx: number, field: 'prefix' | 'provider', value: string) =>
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const removeRule = (idx: number) => setRules(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setError('');
    const invalid = rules.find(r => !/^\+\d{1,4}$/.test(r.prefix));
    if (invalid) { setError(`Préfixe invalide : "${invalid.prefix}" — format attendu : +237, +221, etc.`); return; }
    setSaving(true);
    try {
      await adminApi.setSmsRouting({ rules, defaultProvider });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-24"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Radio className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Routage SMS par pays</h2>
            <p className="text-xs text-gray-500">Préfixe E.164 → provider — ex: +237 → orange-cm</p>
          </div>
        </div>
        <button
          onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90'
          } disabled:opacity-50`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Sauvegardé ✓' : saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>

      {loadError && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">Chargement impossible : {loadError}</p>}
      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="space-y-2 mb-4">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 px-1">
          <span>Préfixe pays</span><span>Provider SMS</span><span />
        </div>

        {rules.map((rule, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input
              type="text" placeholder="+237"
              value={rule.prefix}
              onChange={e => updateRule(idx, 'prefix', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
            />
            <select
              value={rule.provider}
              onChange={e => updateRule(idx, 'provider', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {(available.length ? available : [...SMS_PROVIDERS]).map((p: string) => (
                <option key={p} value={p}>{PROVIDER_LABELS[p as SmsProvider] ?? p}</option>
              ))}
            </select>
            <button onClick={() => removeRule(idx)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <button
          onClick={addRule}
          className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
        >
          <Plus className="w-4 h-4" /> Ajouter une règle
        </button>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Provider par défaut :</span>
          <select
            value={defaultProvider}
            onChange={e => setDefault(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {(available.length ? available : [...SMS_PROVIDERS]).map((p: string) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p as SmsProvider] ?? p}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function EmailProviderPanel() {
  const [provider, setProvider]   = useState('mock');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    adminApi.getEmailProvider().then(d => { setProvider(d.provider); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.setEmailProvider(provider);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  if (loading) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Fournisseur email</h2>
            <p className="text-xs text-gray-500">Provider utilisé pour l'envoi d'emails OTP</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={provider}
            onChange={e => setProvider(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="mock">Mock (dev)</option>
            <option value="sendgrid">SendGrid</option>
            <option value="smtp">SMTP personnalisé</option>
          </select>
          <button
            onClick={handleSave} disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90'
            } disabled:opacity-50`}
          >
            <Save className="w-4 h-4" />
            {saved ? '✓' : saving ? '…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppSettingsPanel() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getAppSettings().then(data => {
      setSettings(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getValue = (key: string) => edited[key] ?? settings[key] ?? '';

  const handleChange = (key: string, value: string) => {
    setEdited(prev => ({ ...prev, [key]: value }));
    setSaved(prev => ({ ...prev, [key]: false }));
  };

  const handleSave = async (key: string) => {
    const value = getValue(key);
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await adminApi.setAppSetting(key, value);
      setSettings(prev => ({ ...prev, [key]: value }));
      setEdited(prev => { const n = { ...prev }; delete n[key]; return n; });
      setSaved(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000);
    } catch { /* ignore */ } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {APP_SETTING_GROUPS.map(group => (
        <div key={group.label} className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-slate-500" />
            </div>
            <h2 className="font-semibold text-gray-900">{group.label}</h2>
          </div>
          <div className="space-y-3">
            {group.keys.map(({ key, label, hint }) => {
              const isDirty = key in edited;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {label}
                      {hint && <span className="text-gray-400 font-normal ml-1">— {hint}</span>}
                    </label>
                    <input
                      type="text"
                      value={getValue(key)}
                      onChange={e => handleChange(key, e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                    />
                  </div>
                  <button
                    onClick={() => handleSave(key)}
                    disabled={saving[key] || !isDirty}
                    className={`mt-5 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      saved[key]
                        ? 'bg-green-50 text-green-600'
                        : isDirty
                        ? 'bg-primary text-white hover:bg-primary-dark'
                        : 'bg-gray-100 text-gray-400 cursor-default'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saved[key] ? '✓' : saving[key] ? '…' : 'OK'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Payment Methods Panel ────────────────────────────────────────────────────

const ALL_PROVIDERS = [
  { id: 'orange_money', label: 'Orange Money', icon: 'smartphone' },
  { id: 'mtn_momo',    label: 'MTN MoMo',     icon: 'smartphone' },
  { id: 'cinetpay',    label: 'CinetPay',      icon: 'globe'      },
  { id: 'flutterwave', label: 'Flutterwave',   icon: 'globe'      },
  { id: 'stripe',      label: 'Stripe',        icon: 'card'       },
  { id: 'mpesa',       label: 'M-Pesa',        icon: 'smartphone' },
  { id: 'wave',        label: 'Wave',          icon: 'smartphone' },
  { id: 'notchpay',    label: 'NotchPay',      icon: 'globe'      },
  { id: 'paypal',      label: 'PayPal',        icon: 'card'       },
];

function ForfaitsPanel() {
  const [packages, setPackages] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    adminApi.getPointsPackages()
      .then(res => setPackages(res.packages))
      .catch(() => setPackages([1000, 3000, 5000, 10000]))
      .then(() => setLoading(false), () => setLoading(false));
  }, []);

  const addPackage = () => {
    const v = parseInt(newValue, 10);
    if (isNaN(v) || v <= 0) return;
    if (packages.includes(v)) { setNewValue(''); return; }
    setPackages(prev => [...prev, v].sort((a, b) => a - b));
    setNewValue('');
    setSaved(false);
  };

  const removePackage = (v: number) => {
    setPackages(prev => prev.filter(p => p !== v));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const res = await adminApi.setPointsPackages(packages);
      setPackages(res.packages);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Erreur sauvegarde');
    } finally { setSaving(false); }
  };

  const LABEL_MAP: Record<number, string> = {
    1000: 'Standard', 3000: 'Pack Argent', 5000: 'Pack Or', 10000: 'VIP Rewards',
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Package className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Forfaits de recharge</h2>
            <p className="text-xs text-gray-400">Montants en points proposés aux passagers</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-400">Chargement…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
              {packages.map(pts => (
                <div key={pts} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <div>
                    <p className="text-sm font-bold text-primary">{pts.toLocaleString()} pts</p>
                    <p className="text-xs text-gray-400">{LABEL_MAP[pts] ?? 'Forfait personnalisé'}</p>
                  </div>
                  <button
                    onClick={() => removePackage(pts)}
                    className="ml-2 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <input
                type="number"
                min={1}
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPackage()}
                placeholder="Ex: 2000"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={addPackage}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving || packages.length === 0}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder les forfaits'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PaymentMethodsPanel() {
  const [countries, setCountries] = useState<{ code: string; name: string; currency: string }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [methods, setMethods] = useState<{ id: string; label: string; icon: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCurrency, setNewCurrency] = useState('XAF');
  const [adding, setAdding] = useState(false);

  const loadCountries = useCallback(async () => {
    try {
      const list = await adminApi.getAllCountries();
      setCountries(list);
      if (list.length > 0 && !selectedCountry) setSelectedCountry(list[0].code);
    } catch { /* ignore */ }
  }, [selectedCountry]);

  useEffect(() => { loadCountries(); }, []);

  const load = useCallback(async (cc: string) => {
    if (!cc) return;
    setLoading(true); setError('');
    try {
      const res = await adminApi.getCountryPaymentMethods(cc);
      setMethods(res.methods ?? []);
    } catch {
      setMethods([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (selectedCountry) load(selectedCountry); }, [selectedCountry, load]);

  const handleAddCountry = async () => {
    const code = newCode.trim().toUpperCase();
    if (!code || !newName.trim()) return;
    setAdding(true);
    try {
      await adminApi.createCountry(code, newName.trim(), newCurrency.trim() || 'XAF');
      await loadCountries();
      setSelectedCountry(code);
      setShowAdd(false);
      setNewCode(''); setNewName(''); setNewCurrency('XAF');
    } catch (e: any) {
      setError(e.message || 'Erreur ajout pays');
    } finally { setAdding(false); }
  };

  const handleDeleteCountry = async (cc: string) => {
    if (!confirm(`Supprimer le pays ${cc} ? Les méthodes de paiement associées seront perdues.`)) return;
    try {
      await adminApi.deleteCountry(cc);
      const remaining = countries.filter(c => c.code !== cc);
      setCountries(remaining);
      setSelectedCountry(remaining[0]?.code ?? '');
    } catch (e: any) {
      setError(e.message || 'Erreur suppression pays');
    }
  };

  const toggle = (provider: { id: string; label: string; icon: string }) => {
    setMethods(prev =>
      prev.find(m => m.id === provider.id)
        ? prev.filter(m => m.id !== provider.id)
        : [...prev, provider],
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await adminApi.setCountryPaymentMethods(selectedCountry, methods);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const isEnabled = (id: string) => methods.some(m => m.id === id);

  return (
    <div className="space-y-6">
      {/* Sélecteur pays */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" /> Pays
        </h2>
        <div className="flex gap-2 flex-wrap items-center">
          {countries.map(c => (
            <div key={c.code} className="relative group">
              <button
                onClick={() => setSelectedCountry(c.code)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  selectedCountry === c.code
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {KNOWN_COUNTRIES[c.code]?.flag ?? '🌍'} {c.code}
              </button>
              <button
                onClick={() => handleDeleteCountry(c.code)}
                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 rounded-full bg-red-500 text-white text-[10px] items-center justify-center hover:bg-red-600"
                title={`Supprimer ${c.code}`}
              >✕</button>
            </div>
          ))}
          {/* Bouton ajouter un pays */}
          {!showAdd ? (
            <button
              onClick={() => setShowAdd(true)}
              className="px-3 py-2 rounded-xl text-sm font-semibold border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all"
            >+ Pays</button>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-xl">
              <input
                value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase().slice(0,3))}
                placeholder="CM" maxLength={3}
                className="w-14 text-sm border border-gray-200 rounded-lg px-2 py-1 text-center font-mono uppercase"
              />
              <input
                value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Nom du pays"
                className="w-32 text-sm border border-gray-200 rounded-lg px-2 py-1"
              />
              <input
                value={newCurrency} onChange={e => setNewCurrency(e.target.value.toUpperCase().slice(0,3))}
                placeholder="XAF" maxLength={3}
                className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-1 text-center font-mono uppercase"
              />
              <button
                onClick={handleAddCountry} disabled={adding || !newCode || !newName}
                className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
              >{adding ? '…' : 'Ajouter'}</button>
              <button onClick={() => { setShowAdd(false); setNewCode(''); setNewName(''); }}
                className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            </div>
          )}
        </div>
      </div>

      {/* Méthodes disponibles */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" />
          Méthodes actives pour <span className="text-blue-600">{selectedCountry}</span>
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Cochez les méthodes disponibles pour les utilisateurs de ce pays.
        </p>

        {loading
          ? <div className="text-sm text-gray-400 py-4 text-center">Chargement…</div>
          : (
            <div className="space-y-2">
              {ALL_PROVIDERS.map(provider => {
                const active = isEnabled(provider.id);
                const Icon = provider.icon === 'card' ? CreditCard : provider.icon === 'globe' ? Globe : Smartphone;
                return (
                  <div
                    key={provider.id}
                    onClick={() => toggle(provider)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      active
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${active ? 'text-blue-900' : 'text-gray-700'}`}>
                        {provider.label}
                      </p>
                      <p className="text-xs text-gray-400">{provider.id}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      active ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {active && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }

        {/* Méthodes actives résumé */}
        {methods.length > 0 && (
          <p className="text-xs text-blue-600 font-medium mt-4">
            {methods.length} méthode{methods.length > 1 ? 's' : ''} active{methods.length > 1 ? 's' : ''} : {methods.map(m => m.label).join(', ')}
          </p>
        )}

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
}

// ── Main TariffsPage ─────────────────────────────────────────────────────────

export function TariffsPage() {
  const [activeTab, setActiveTab] = useState<'tariffs' | 'settings' | 'payment' | 'forfaits'>('tariffs');
  // null = tarifs globaux, string = pays sélectionné
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [showAddCountry, setShowAddCountry] = useState(false);
  const [newCountryCode, setNewCountryCode] = useState('');

  const [config, setConfig] = useState<TariffsConfig>(DEFAULT_TARIFFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const loadCountries = useCallback(async () => {
    try {
      const list = await adminApi.getCountriesWithTariffs();
      setCountries(list);
    } catch { /* ignore */ }
  }, []);

  const loadConfig = useCallback(async (countryCode: string | null) => {
    setLoading(true); setError('');
    try {
      const data = countryCode
        ? await adminApi.getTariffsByCountry(countryCode)
        : await adminApi.getTariffs();
      setConfig(mergeTariffs(data));
    } catch {
      setConfig(DEFAULT_TARIFFS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCountries();
    loadConfig(null);
  }, [loadCountries, loadConfig]);

  const handleSelectCountry = (cc: string | null) => {
    setSelectedCountry(cc);
    setSaved(false);
    loadConfig(cc);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (selectedCountry) {
        await adminApi.setTariffsByCountry(selectedCountry, config);
        if (!countries.includes(selectedCountry)) {
          setCountries(prev => [...prev, selectedCountry]);
        }
      } else {
        await adminApi.setTariffs(config);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCountry) return;
    if (!confirm(`Supprimer la configuration tarifaire pour ${selectedCountry} ?`)) return;
    try {
      await adminApi.deleteTariffsByCountry(selectedCountry);
      setCountries(prev => prev.filter(c => c !== selectedCountry));
      handleSelectCountry(null);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la suppression');
    }
  };

  const handleAddCountry = () => {
    const cc = newCountryCode.trim().toUpperCase();
    if (!cc || cc.length !== 2) return;
    setNewCountryCode('');
    setShowAddCountry(false);
    // Charge les tarifs globaux comme base pour ce nouveau pays
    const base = KNOWN_COUNTRIES[cc];
    const newConfig = {
      ...config,
      currency: base?.currency ?? 'XAF',
      currencySymbol: base?.symbol ?? 'FCFA',
    };
    setConfig(newConfig);
    setSelectedCountry(cc);
    setSaved(false);
  };

  const countryInfo = selectedCountry ? KNOWN_COUNTRIES[selectedCountry] : null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarifs & Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Configurez les prix par pays et les paramètres dynamiques</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('tariffs')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'tariffs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Tarifs
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" />Paramètres</span>
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'payment' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />Paiement</span>
          </button>
          <button
            onClick={() => setActiveTab('forfaits')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'forfaits' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />Forfaits</span>
          </button>
        </div>
      </div>

      {activeTab === 'settings' ? (
        <div className="space-y-6">
          <SmsRoutingPanel />
          <EmailProviderPanel />
          <AppSettingsPanel />
        </div>
      ) : activeTab === 'payment' ? (
        <PaymentMethodsPanel />
      ) : activeTab === 'forfaits' ? (
        <ForfaitsPanel />
      ) : (
      <div className="flex gap-6">
        {/* Sidebar : liste des pays */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configurations</p>
            </div>

            {/* Global */}
            <button
              onClick={() => handleSelectCountry(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors ${selectedCountry === null ? 'bg-primary/5 text-primary font-medium' : 'text-gray-700'}`}
            >
              <Globe className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Tarifs globaux</span>
              {selectedCountry === null && <ChevronRight className="w-3 h-3" />}
            </button>

            {countries.length > 0 && (
              <div className="border-t border-gray-100">
                <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Par pays</p>
                {countries.map(cc => {
                  const info = KNOWN_COUNTRIES[cc];
                  return (
                    <button
                      key={cc}
                      onClick={() => handleSelectCountry(cc)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors ${selectedCountry === cc ? 'bg-primary/5 text-primary font-medium' : 'text-gray-700'}`}
                    >
                      <span className="text-base">{info?.flag ?? '🌍'}</span>
                      <span className="flex-1">{info?.name ?? cc}</span>
                      {selectedCountry === cc && <ChevronRight className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Ajouter un pays */}
            <div className="border-t border-gray-100 p-3">
              {showAddCountry ? (
                <div className="space-y-2">
                  <input
                    type="text" maxLength={2} placeholder="Code pays (CM, US…)"
                    value={newCountryCode}
                    onChange={e => setNewCountryCode(e.target.value.toUpperCase())}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onKeyDown={e => e.key === 'Enter' && handleAddCountry()}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddCountry} className="flex-1 bg-primary text-white text-xs py-1.5 rounded-lg font-medium">OK</button>
                    <button onClick={() => setShowAddCountry(false)} className="flex-1 bg-gray-100 text-gray-600 text-xs py-1.5 rounded-lg">Annuler</button>
                  </div>
                  {newCountryCode.length === 2 && KNOWN_COUNTRIES[newCountryCode] && (
                    <p className="text-xs text-gray-500">{KNOWN_COUNTRIES[newCountryCode].flag} {KNOWN_COUNTRIES[newCountryCode].name}</p>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowAddCountry(true)}
                  className="w-full flex items-center gap-2 text-xs text-primary font-medium hover:bg-primary/5 rounded-lg px-2 py-2">
                  <Plus className="w-3.5 h-3.5" /> Ajouter un pays
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex-1">
          {/* Header section */}
          <div className="flex items-center gap-3 mb-6 bg-white rounded-2xl border border-gray-200 px-5 py-4">
            {selectedCountry ? (
              <>
                <span className="text-3xl">{countryInfo?.flag ?? '🌍'}</span>
                <div>
                  <h2 className="font-bold text-gray-900">{countryInfo?.name ?? selectedCountry}</h2>
                  <p className="text-xs text-gray-500">Code : {selectedCountry} · Devise : {config.currency ?? '—'} ({config.currencySymbol ?? '—'})</p>
                </div>
              </>
            ) : (
              <>
                <Globe className="w-7 h-7 text-gray-400" />
                <div>
                  <h2 className="font-bold text-gray-900">Tarifs globaux</h2>
                  <p className="text-xs text-gray-500">Appliqués dans tous les pays sans configuration spécifique</p>
                </div>
              </>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <TariffForm
              config={config}
              setConfig={setConfig}
              onSave={handleSave}
              onReset={() => { setConfig(DEFAULT_TARIFFS); setSaved(false); }}
              onDelete={selectedCountry ? handleDelete : undefined}
              saving={saving}
              saved={saved}
              error={error}
              isCountry={!!selectedCountry}
            />
          )}
        </div>
      </div>
      )}
    </div>
  );
}
