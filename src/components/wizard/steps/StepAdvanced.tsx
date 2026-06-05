import { useState } from 'react';
import { Settings2, ChevronDown, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { adminApi } from '../../../services/api';
import { scopedKey, resolveScopedSetting } from '../../../lib/scopedSetting';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

interface Field {
  key: string;
  label: string;
  json?: boolean;
}
interface Section {
  title: string;
  fields: Field[];
}

const SECTIONS: Section[] = [
  {
    title: 'Commission',
    fields: [
      { key: 'commission_rate_pct', label: 'Commission (%)' },
      { key: 'commission_rate_vip_pct', label: 'Commission VIP (%)' },
      { key: 'cash_commission_block_threshold', label: 'Seuil blocage commission cash' },
      { key: 'registration_fee_deposit_pct', label: "Acompte frais d'inscription (%)" },
    ],
  },
  {
    title: 'Dispatch',
    fields: [
      { key: 'proximity_radius_km', label: 'Rayon de proximité (km)' },
      { key: 'min_driver_score', label: 'Score chauffeur minimum' },
      { key: 'avg_driver_speed_kmh', label: 'Vitesse moyenne chauffeur (km/h)' },
      { key: 'dispatch_prelanding_limit', label: 'Limite dispatch pré-atterrissage' },
      { key: 'delayed_dispatch_default_wait_min', label: 'Attente dispatch différé (min)' },
      { key: 'driver_pickup_buffer_min', label: 'Marge prise en charge (min)' },
    ],
  },
  {
    title: 'Fidélité',
    fields: [
      { key: 'first_ride_bonus_points', label: 'Bonus 1ère course (points)' },
      { key: 'loyalty_bonus_points', label: 'Bonus fidélité (points)' },
      { key: 'loyalty_bonus_every_n_rides', label: 'Bonus toutes les N courses' },
      { key: 'late_cancel_refund_rate', label: 'Taux remboursement annulation tardive' },
    ],
  },
  {
    title: 'KYC',
    fields: [{ key: 'driver_document_config', label: 'Config documents chauffeur (JSON)', json: true }],
  },
  {
    title: 'Capacité',
    fields: [{ key: 'vehicle_capacity', label: 'Capacité véhicules (JSON)', json: true }],
  },
  {
    title: 'Retrait',
    fields: [{ key: 'min_withdrawal_amount', label: 'Montant minimum de retrait' }],
  },
];

interface Props {
  code: string;
  settings: Record<string, string>;
  onSaved: () => void;
}

export function StepAdvanced({ code, settings, onSaved }: Props) {
  // Valeur courante (override scopé s'il existe, sinon vide => placeholder = global).
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const s of SECTIONS) {
      for (const f of s.fields) {
        const r = resolveScopedSetting(settings, f.key, code, '');
        init[f.key] = r.overridden ? r.value : '';
      }
    }
    return init;
  });
  const [open, setOpen] = useState<Record<string, boolean>>({ Commission: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allFields = SECTIONS.flatMap((s) => s.fields);

  const handleSave = async () => {
    setError('');
    // Validation JSON
    for (const f of allFields) {
      const v = values[f.key];
      if (f.json && v && v.trim()) {
        try {
          JSON.parse(v);
        } catch {
          setError(`JSON invalide pour « ${f.label} ».`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      for (const f of allFields) {
        const v = values[f.key];
        if (v !== undefined && v.trim() !== '') {
          await adminApi.setSetting(scopedKey(f.key, code), v.trim());
        }
      }
      onSaved();
    } catch (err: any) {
      setError('Enregistrement impossible : ' + (err?.message || 'erreur inconnue'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" /> Paramètres avancés
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Étape facultative. Champ vide = hérite de la valeur globale (affichée en placeholder). Champ rempli = override pour ce pays.
        </p>

        <div className="space-y-2">
          {SECTIONS.map((s) => (
            <div key={s.title} className="border border-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [s.title]: !o[s.title] }))}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800"
              >
                <span>{s.title}</span>
                {open[s.title] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {open[s.title] && (
                <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                  {s.fields.map((f) => (
                    <div key={f.key} className={f.json ? 'col-span-2' : ''}>
                      <label className={labelCls}>{f.label}</label>
                      {f.json ? (
                        <textarea
                          rows={4}
                          value={values[f.key]}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          placeholder={settings[f.key] ?? '(global non défini)'}
                          className={inputCls + ' font-mono text-xs'}
                        />
                      ) : (
                        <input
                          value={values[f.key]}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          placeholder={settings[f.key] ?? '(global non défini)'}
                          className={inputCls}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
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
          Enregistrer les overrides
        </button>
      </div>
    </div>
  );
}
