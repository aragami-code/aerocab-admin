import { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, DollarSign, Car, Zap, Package, Clock, Globe, Plus, Trash2, ChevronRight } from 'lucide-react';
import { adminApi } from '../services/api';

interface VehicleTariff {
  basePricePerKm: number;
  minFare: number;
  coefficient: number;
  label?: string;
  isActive?: boolean;
  maxPassengers?: number;
}
interface SurgeConfig {
  nightMultiplier: number; rainMultiplier: number; rushHourMultiplier: number;
  rushHourStart: string; rushHourEnd: string; rushHourStart2: string; rushHourEnd2: string;
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
  consigne: Record<string, { dailyRate: number }>;
  surge: SurgeConfig;
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
  consigne: {
    eco:          { dailyRate: 5000  },
    eco_plus:     { dailyRate: 6000  },
    standard:     { dailyRate: 8000  },
    confort:      { dailyRate: 12000 },
    confort_plus: { dailyRate: 18000 },
  },
  surge: {
    nightMultiplier: 1.3, rainMultiplier: 1.2, rushHourMultiplier: 1.25,
    rushHourStart: '07:00', rushHourEnd: '09:00',
    rushHourStart2: '17:00', rushHourEnd2: '19:00',
  },
};

function mergeTariffs(data: any): TariffsConfig {
  return {
    ...DEFAULT_TARIFFS,
    ...data,
    vehicles: { ...DEFAULT_TARIFFS.vehicles, ...(data.vehicles ?? {}) },
    consigne: { ...DEFAULT_TARIFFS.consigne, ...(data.consigne ?? {}) },
    surge:    { ...DEFAULT_TARIFFS.surge,    ...(data.surge    ?? {}) },
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

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="time" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
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
  const setConsigne = (vt: string, v: number) =>
    setConfig({ ...config, consigne: { ...config.consigne, [vt]: { dailyRate: v } } });
  const setSurge = (key: keyof SurgeConfig, v: number | string) =>
    setConfig({ ...config, surge: { ...config.surge, [key]: v } });

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
              setConfig({ ...config, vehicles: { ...config.vehicles, [id]: { basePricePerKm: 250, minFare: 3000, coefficient: 1.0, label: 'Nouveau', isActive: true, maxPassengers: 4 } }, consigne: { ...config.consigne, [id]: { dailyRate: 5000 } } });
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
                      const { [vt]: __, ...restC } = config.consigne;
                      setConfig({ ...config, vehicles: rest, consigne: restC });
                    }}
                    className="text-red-400 hover:text-red-600 p-1 rounded"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-3">
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
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Aperçu 15km</label>
                    <div className="py-1.5">
                      <span className="font-semibold text-primary text-sm">{previewPrice(vt).toLocaleString()} {sym}</span>
                      <br /><span className="text-[10px] text-gray-400">≈ {Math.ceil(previewPrice(vt) / config.fcfaPerPoint)} pts</span>
                    </div>
                  </div>
                </div>
                {/* Consigne pour cette catégorie */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                  <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500">Consigne/jour :</span>
                  <div className="relative w-32">
                    <input type="number" min={0} step={500} value={config.consigne[vt]?.dailyRate ?? 5000}
                      onChange={e => setConsigne(vt, +e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-8"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">{sym}/j</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Surge config */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center"><Clock className="w-5 h-5 text-orange-500" /></div>
          <div>
            <h2 className="font-semibold text-gray-900">Surcharges dynamiques</h2>
            <p className="text-xs text-gray-500">Multiplicateurs appliqués automatiquement selon le contexte</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 mb-6">
          <NumberInput label="Nuit (22h–05h)" value={config.surge.nightMultiplier} onChange={v => setSurge('nightMultiplier', v)} suffix="×" step={0.05} min={1} />
          <NumberInput label="Pluie" value={config.surge.rainMultiplier} onChange={v => setSurge('rainMultiplier', v)} suffix="×" step={0.05} min={1} />
          <NumberInput label="Heure de pointe" value={config.surge.rushHourMultiplier} onChange={v => setSurge('rushHourMultiplier', v)} suffix="×" step={0.05} min={1} />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Plages heures de pointe</p>
          <div className="grid grid-cols-4 gap-4">
            <TimeInput label="Pointe matin — début" value={config.surge.rushHourStart} onChange={v => setSurge('rushHourStart', v)} />
            <TimeInput label="Pointe matin — fin"   value={config.surge.rushHourEnd}   onChange={v => setSurge('rushHourEnd', v)} />
            <TimeInput label="Pointe soir — début"  value={config.surge.rushHourStart2} onChange={v => setSurge('rushHourStart2', v)} />
            <TimeInput label="Pointe soir — fin"    value={config.surge.rushHourEnd2}   onChange={v => setSurge('rushHourEnd2', v)} />
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Exemple : si le prix de base est 5 000 {sym} et qu'il pleut + nuit → {Math.round(5000 * config.surge.rainMultiplier * config.surge.nightMultiplier).toLocaleString()} {sym}
          </p>
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

export function TariffsPage() {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tarifs & Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Configurez les prix par pays — chaque marché a ses propres tarifs</p>
      </div>

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
    </div>
  );
}
