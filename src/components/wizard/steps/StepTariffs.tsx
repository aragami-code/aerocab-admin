import { useEffect, useState } from 'react';
import { DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { adminApi } from '../../../services/api';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

// Forme alignée sur le DEFAULT de TariffsPage (sous-ensemble simplifié pour le wizard).
const VEHICLE_KEYS = ['eco', 'confort', 'van'] as const;
type VehicleKey = (typeof VEHICLE_KEYS)[number];

interface VehicleTariff {
  basePricePerKm: number;
  minFare: number;
  coefficient: number;
}
interface TariffsConfig {
  basePricePerKm: number;
  fcfaPerPoint: number;
  vehicles: Record<string, VehicleTariff>;
}

const DEFAULT: TariffsConfig = {
  basePricePerKm: 250,
  fcfaPerPoint: 1,
  vehicles: {
    eco: { basePricePerKm: 250, minFare: 3000, coefficient: 1.0 },
    confort: { basePricePerKm: 250, minFare: 8000, coefficient: 2.0 },
    van: { basePricePerKm: 250, minFare: 12000, coefficient: 2.5 },
  },
};

interface Props {
  code: string;
  settings?: Record<string, string>;
  onSaved: () => void;
}

export function StepTariffs({ code, onSaved }: Props) {
  const [config, setConfig] = useState<TariffsConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data: any = await adminApi.getTariffsByCountry(code);
        if (!active) return;
        const vehicles: Record<string, VehicleTariff> = {};
        for (const k of VEHICLE_KEYS) {
          const v = data?.vehicles?.[k] ?? DEFAULT.vehicles[k];
          vehicles[k] = {
            basePricePerKm: Number(v.basePricePerKm ?? DEFAULT.vehicles[k].basePricePerKm),
            minFare: Number(v.minFare ?? DEFAULT.vehicles[k].minFare),
            coefficient: Number(v.coefficient ?? DEFAULT.vehicles[k].coefficient),
          };
        }
        setConfig({
          basePricePerKm: Number(data?.basePricePerKm ?? DEFAULT.basePricePerKm),
          fcfaPerPoint: Number(data?.fcfaPerPoint ?? DEFAULT.fcfaPerPoint),
          vehicles,
        });
      } catch {
        if (active) setConfig(DEFAULT);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [code]);

  const setTop = (k: 'basePricePerKm' | 'fcfaPerPoint', v: number) => setConfig((c) => ({ ...c, [k]: v }));
  const setVeh = (key: VehicleKey, field: keyof VehicleTariff, v: number) =>
    setConfig((c) => ({ ...c, vehicles: { ...c.vehicles, [key]: { ...c.vehicles[key], [field]: v } } }));

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await adminApi.setTariffsByCountry(code, config);
      onSaved();
    } catch (err: any) {
      setError('Enregistrement impossible : ' + (err?.message || 'erreur inconnue'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" /> Tarifs
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className={labelCls}>Prix de base / km</label>
            <input type="number" value={config.basePricePerKm} onChange={(e) => setTop('basePricePerKm', Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>FCFA par point</label>
            <input type="number" value={config.fcfaPerPoint} onChange={(e) => setTop('fcfaPerPoint', Number(e.target.value))} className={inputCls} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
            <span className="col-span-3">Véhicule</span>
            <span className="col-span-3">Prix/km</span>
            <span className="col-span-3">Tarif min.</span>
            <span className="col-span-3">Coefficient</span>
          </div>
          {VEHICLE_KEYS.map((key) => (
            <div key={key} className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-3 text-sm font-medium capitalize">{key}</span>
              <input type="number" value={config.vehicles[key].basePricePerKm} onChange={(e) => setVeh(key, 'basePricePerKm', Number(e.target.value))} className={inputCls + ' col-span-3'} />
              <input type="number" value={config.vehicles[key].minFare} onChange={(e) => setVeh(key, 'minFare', Number(e.target.value))} className={inputCls + ' col-span-3'} />
              <input type="number" step="0.1" value={config.vehicles[key].coefficient} onChange={(e) => setVeh(key, 'coefficient', Number(e.target.value))} className={inputCls + ' col-span-3'} />
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
