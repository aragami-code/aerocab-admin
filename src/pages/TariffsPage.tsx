import { useState, useEffect } from 'react';
import { Save, RotateCcw, DollarSign, Car, Zap, Package, Clock } from 'lucide-react';
import { adminApi } from '../services/api';

interface VehicleTariff { basePricePerKm: number; minFare: number; coefficient: number; }
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
  vehicles: Record<string, VehicleTariff>;
  consigne: Record<string, { dailyRate: number }>;
  surge: SurgeConfig;
}

const VEHICLE_LABELS: Record<string, string> = {
  eco: 'Eco', eco_plus: 'Eco+', standard: 'Standard', confort: 'Confort', confort_plus: 'Confort+',
};

const DEFAULT_TARIFFS: TariffsConfig = {
  basePricePerKm: 250,
  fcfaPerPoint: 1,
  startupFee: 500,
  startupMinutes: 3,
  pricePerMinute: 50,
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

export function TariffsPage() {
  const [config, setConfig] = useState<TariffsConfig>(DEFAULT_TARIFFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getTariffs()
      .then((data: any) => setConfig({ ...DEFAULT_TARIFFS, ...data,
        vehicles: { ...DEFAULT_TARIFFS.vehicles, ...(data.vehicles ?? {}) },
        consigne: { ...DEFAULT_TARIFFS.consigne, ...(data.consigne ?? {}) },
        surge:    { ...DEFAULT_TARIFFS.surge,    ...(data.surge    ?? {}) },
      }))
      .catch(() => setConfig(DEFAULT_TARIFFS))
      .finally(() => setLoading(false));
  }, []);

  const setGlobal = (key: keyof TariffsConfig, v: number) => { setConfig(p => ({ ...p, [key]: v })); setSaved(false); };
  const setVehicle = (vt: string, key: keyof VehicleTariff, v: number) => {
    setConfig(p => ({ ...p, vehicles: { ...p.vehicles, [vt]: { ...p.vehicles[vt], [key]: v } } })); setSaved(false);
  };
  const setConsigne = (vt: string, v: number) => {
    setConfig(p => ({ ...p, consigne: { ...p.consigne, [vt]: { dailyRate: v } } })); setSaved(false);
  };
  const setSurge = (key: keyof SurgeConfig, v: number | string) => {
    setConfig(p => ({ ...p, surge: { ...p.surge, [key]: v } })); setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try { await adminApi.setTariffs(config); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    catch (e: any) { setError(e.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const previewPrice = (vt: string) => {
    const v = config.vehicles[vt];
    return v ? Math.max(v.minFare, Math.round(15 * v.basePricePerKm * v.coefficient)) : 0;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarifs & Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Véhicules, consigne, surcharges et taux des points</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setConfig(DEFAULT_TARIFFS); setSaved(false); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
            <RotateCcw className="w-4 h-4" /> Réinitialiser
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-60">
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde…' : saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
          </button>
        </div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Points rate */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center"><Zap className="w-5 h-5 text-amber-500" /></div>
          <div><h2 className="font-semibold text-gray-900">Taux des Points</h2><p className="text-xs text-gray-500">Valeur d'un point en FCFA</p></div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <NumberInput label="FCFA par point" value={config.fcfaPerPoint} onChange={v => setGlobal('fcfaPerPoint', v)} suffix="FCFA/pt" min={1} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Aperçu des forfaits</label>
            <div className="grid grid-cols-2 gap-2">
              {[1000,3000,5000,10000].map(pts => (
                <div key={pts} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                  <span className="font-bold text-primary">{pts} pts</span>
                  <span className="text-gray-400 ml-1">→ {(pts * config.fcfaPerPoint).toLocaleString()} FCFA</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle tariffs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Car className="w-5 h-5 text-blue-500" /></div>
          <div><h2 className="font-semibold text-gray-900">Tarifs véhicules</h2><p className="text-xs text-gray-500">Prix de base, coefficient et tarif minimum</p></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Véhicule','Prix/km','Coefficient','Tarif min','Aperçu 15km'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.keys(VEHICLE_LABELS).map(vt => {
                const v = config.vehicles[vt] ?? DEFAULT_TARIFFS.vehicles[vt];
                return (
                  <tr key={vt} className="hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-semibold text-gray-800">{VEHICLE_LABELS[vt]}</td>
                    <td className="py-3 px-3"><input type="number" min={0} value={v.basePricePerKm} onChange={e => setVehicle(vt,'basePricePerKm',+e.target.value)} className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></td>
                    <td className="py-3 px-3"><input type="number" min={0.1} step={0.1} value={v.coefficient} onChange={e => setVehicle(vt,'coefficient',+e.target.value)} className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></td>
                    <td className="py-3 px-3"><input type="number" min={0} step={500} value={v.minFare} onChange={e => setVehicle(vt,'minFare',+e.target.value)} className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-primary">{previewPrice(vt).toLocaleString()} F</span>
                      <span className="text-xs text-gray-400 ml-1">≈ {Math.ceil(previewPrice(vt) / config.fcfaPerPoint)} pts</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consigne */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center"><Package className="w-5 h-5 text-purple-500" /></div>
          <div>
            <h2 className="font-semibold text-gray-900">Tarifs Consigne</h2>
            <p className="text-xs text-gray-500">Tarif journalier de mise en consigne du véhicule (8h–20h30)</p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {Object.keys(VEHICLE_LABELS).map(vt => (
            <div key={vt}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{VEHICLE_LABELS[vt]}</label>
              <div className="relative">
                <input type="number" min={0} step={500} value={config.consigne[vt]?.dailyRate ?? 8000}
                  onChange={e => setConsigne(vt, +e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-8"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">F/j</span>
              </div>
            </div>
          ))}
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
          <NumberInput label="Nuit (22h–05h)" value={config.surge.nightMultiplier} onChange={v => setSurge('nightMultiplier',v)} suffix="×" step={0.05} min={1} />
          <NumberInput label="Pluie" value={config.surge.rainMultiplier} onChange={v => setSurge('rainMultiplier',v)} suffix="×" step={0.05} min={1} />
          <NumberInput label="Heure de pointe" value={config.surge.rushHourMultiplier} onChange={v => setSurge('rushHourMultiplier',v)} suffix="×" step={0.05} min={1} />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Plages heures de pointe</p>
          <div className="grid grid-cols-4 gap-4">
            <TimeInput label="Pointe matin — début" value={config.surge.rushHourStart} onChange={v => setSurge('rushHourStart',v)} />
            <TimeInput label="Pointe matin — fin"   value={config.surge.rushHourEnd}   onChange={v => setSurge('rushHourEnd',v)} />
            <TimeInput label="Pointe soir — début"  value={config.surge.rushHourStart2} onChange={v => setSurge('rushHourStart2',v)} />
            <TimeInput label="Pointe soir — fin"    value={config.surge.rushHourEnd2}   onChange={v => setSurge('rushHourEnd2',v)} />
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Exemple : si le prix de base est 5 000 F et qu'il pleut + nuit → {Math.round(5000 * config.surge.rainMultiplier * config.surge.nightMultiplier).toLocaleString()} F
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
          <NumberInput label="Prix/km par défaut (FCFA)" value={config.basePricePerKm} onChange={v => setGlobal('basePricePerKm',v)} suffix="FCFA" />
        </div>
      </div>
    </div>

      {/* Frais de démarrage (+3min) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center"><Clock className="w-5 h-5 text-teal-500" /></div>
          <div>
            <h2 className="font-semibold text-gray-900">Frais de démarrage</h2>
            <p className="text-xs text-gray-500">Frais fixes inclus dans chaque course + minutes offertes</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <NumberInput label="Frais fixe (FCFA)" value={config.startupFee} onChange={v => setGlobal('startupFee', v)} suffix="FCFA" step={100} />
          <NumberInput label="Minutes incluses" value={config.startupMinutes} onChange={v => setGlobal('startupMinutes', v)} suffix="min" min={0} />
          <NumberInput label="Prix/min au-delà" value={config.pricePerMinute} onChange={v => setGlobal('pricePerMinute', v)} suffix="FCFA/min" step={10} />
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Exemple : course de 15 km → {(config.startupFee + Math.round(15 * config.basePricePerKm)).toLocaleString()} F (frais {config.startupFee} F + distance) avec {config.startupMinutes} min offertes
        </p>
      </div>
    </div>
  );
}
