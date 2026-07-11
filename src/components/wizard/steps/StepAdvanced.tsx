import { useState } from 'react';
import { Settings2, ChevronDown, ChevronRight, AlertCircle, Loader2, FileText, Car } from 'lucide-react';
import { adminApi } from '../../../services/api';
import { scopedKey, resolveScopedSetting } from '../../../lib/scopedSetting';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

interface Field {
  key: string;
  label: string;
}
interface Section {
  title: string;
  fields: Field[];
}

// Sections numériques génériques (champ vide = hérite du global).
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
    title: 'Retrait',
    fields: [{ key: 'min_withdrawal_amount', label: 'Montant minimum de retrait' }],
  },
];

interface DocItem {
  type: string;
  label: string;
  description?: string;
  required: boolean;
  enabled: boolean;
  acceptedExtensions?: string[];
}

interface Props {
  code: string;
  settings: Record<string, string>;
  onSaved: () => void;
}

function safeParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw || !raw.trim()) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function StepAdvanced({ code, settings, onSaved }: Props) {
  // Champs numériques
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const s of SECTIONS) for (const f of s.fields) {
      const r = resolveScopedSetting(settings, f.key, code, '');
      init[f.key] = r.overridden ? r.value : '';
    }
    return init;
  });

  // KYC : liste de documents (résolu pour le pays, sinon global)
  const docResolved = resolveScopedSetting(settings, 'driver_document_config', code, settings['driver_document_config'] ?? '[]');
  const [docs, setDocs] = useState<DocItem[]>(() => safeParse<DocItem[]>(docResolved.value, []));
  const [docsDirty, setDocsDirty] = useState(false);

  // Capacité : map type véhicule → places
  const capResolved = resolveScopedSetting(settings, 'vehicle_capacity', code, settings['vehicle_capacity'] ?? '{}');
  const [capacity, setCapacity] = useState<Record<string, number>>(() => safeParse<Record<string, number>>(capResolved.value, {}));
  const [capDirty, setCapDirty] = useState(false);

  const [open, setOpen] = useState<Record<string, boolean>>({ Commission: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setDoc = (i: number, patch: Partial<DocItem>) => {
    setDocs((d) => d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    setDocsDirty(true);
  };
  const setCap = (vtype: string, seats: number) => {
    setCapacity((c) => ({ ...c, [vtype]: seats }));
    setCapDirty(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      // Numériques (uniquement les remplis)
      for (const s of SECTIONS) for (const f of s.fields) {
        const v = values[f.key];
        if (v !== undefined && v.trim() !== '') await adminApi.setSetting(scopedKey(f.key, code), v.trim());
      }
      // KYC documents (si modifié)
      if (docsDirty) await adminApi.setSetting(scopedKey('driver_document_config', code), JSON.stringify(docs));
      // Capacité (si modifié)
      if (capDirty) await adminApi.setSetting(scopedKey('vehicle_capacity', code), JSON.stringify(capacity));
      onSaved();
    } catch (err: any) {
      setError('Enregistrement impossible : ' + (err?.message || 'erreur inconnue'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (title: string) => setOpen((o) => ({ ...o, [title]: !o[title] }));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" /> Paramètres avancés
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Étape facultative. Champ vide = hérite de la valeur globale (placeholder). Champ rempli / coché = override pour ce pays.
        </p>

        <div className="space-y-2">
          {/* Sections numériques */}
          {SECTIONS.map((s) => (
            <div key={s.title} className="border border-gray-100 rounded-lg">
              <button type="button" onClick={() => toggle(s.title)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800">
                <span>{s.title}</span>
                {open[s.title] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {open[s.title] && (
                <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                  {s.fields.map((f) => (
                    <div key={f.key}>
                      <label className={labelCls}>{f.label}</label>
                      <input
                        value={values[f.key]}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        placeholder={settings[f.key] ?? '(global non défini)'}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* KYC — documents à cocher */}
          <div className="border border-gray-100 rounded-lg">
            <button type="button" onClick={() => toggle('KYC')} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800">
              <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Documents chauffeur exigés (KYC)</span>
              {open['KYC'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {open['KYC'] && (
              <div className="px-4 pb-4">
                {docs.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Aucun document configuré globalement.</p>
                ) : (
                  <div className="space-y-1">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-1 text-[10px] uppercase font-semibold text-gray-400">
                      <span>Document</span><span>Exigé</span><span>Activé</span>
                    </div>
                    {docs.map((d, i) => (
                      <div key={d.type} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-1 py-1.5 rounded hover:bg-gray-50">
                        <div>
                          <div className="text-sm text-gray-800">{d.label || d.type}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{d.type}</div>
                        </div>
                        <input type="checkbox" checked={!!d.required} onChange={(e) => setDoc(i, { required: e.target.checked })} className="w-4 h-4 mx-auto accent-primary cursor-pointer" title="Document obligatoire" />
                        <input type="checkbox" checked={!!d.enabled} onChange={(e) => setDoc(i, { enabled: e.target.checked })} className="w-4 h-4 mx-auto accent-primary cursor-pointer" title="Document demandé" />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-2">« Exigé » = obligatoire pour valider le dossier. « Activé » = demandé au chauffeur.</p>
              </div>
            )}
          </div>

          {/* Capacité véhicules — places par type */}
          <div className="border border-gray-100 rounded-lg">
            <button type="button" onClick={() => toggle('Capacité')} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800">
              <span className="flex items-center gap-2"><Car className="w-4 h-4 text-primary" /> Capacité véhicules (places)</span>
              {open['Capacité'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {open['Capacité'] && (
              <div className="px-4 pb-4">
                {Object.keys(capacity).length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Aucune capacité configurée globalement.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(capacity).map(([vtype, seats]) => (
                      <div key={vtype}>
                        <label className={labelCls + ' capitalize'}>{vtype.replace('_', ' ')}</label>
                        <input
                          type="number" min={1} max={20}
                          value={seats}
                          onChange={(e) => setCap(vtype, Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-2">Nombre de places (passagers) par type de véhicule.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Enregistrer les overrides
        </button>
      </div>
    </div>
  );
}
