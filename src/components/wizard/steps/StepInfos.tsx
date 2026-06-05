import { useState } from 'react';
import { Globe, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { adminApi } from '../../../services/api';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

interface Props {
  mode: 'create' | 'complete';
  code?: string;
  settings?: Record<string, string>;
  onCreated: (code: string) => void;
  onSaved: () => void;
}

export function StepInfos({ mode, code, onCreated, onSaved }: Props) {
  const [form, setForm] = useState({
    code: code ?? '',
    name: '',
    currency: '',
    currencySymbol: '',
    currencyDecimals: 0,
    phonePrefix: '',
    flagEmoji: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.code.trim().length !== 2) {
      setError('Le code ISO doit comporter 2 lettres.');
      return;
    }
    if (!form.name.trim() || !form.currency.trim()) {
      setError('Nom et devise sont requis.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.createOperatedCountry({
        code: form.code.toUpperCase(),
        name: form.name.trim(),
        currency: form.currency.trim().toUpperCase(),
        currencySymbol: form.currencySymbol.trim() || undefined,
        currencyDecimals: Number(form.currencyDecimals) || 0,
        phonePrefix: form.phonePrefix.trim() || undefined,
        flagEmoji: form.flagEmoji.trim() || undefined,
      });
      onCreated(form.code.toUpperCase());
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (/exist|409|déjà|already/i.test(msg)) {
        setError('Ce pays a déjà été créé.');
      } else {
        setError('Création impossible : ' + (msg || 'erreur inconnue'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'complete') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Informations du pays
          </h2>
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Pays <span className="font-mono font-semibold">{code}</span> déjà créé. Continuez la configuration.
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onSaved}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
          >
            Suivant
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" /> Créer un pays
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Code ISO * (2 lettres)</label>
            <input
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
              className={inputCls + ' uppercase font-mono tracking-widest'}
              placeholder="CM"
            />
          </div>
          <div>
            <label className={labelCls}>Nom *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="Cameroun" />
          </div>
          <div>
            <label className={labelCls}>Devise (ISO) *</label>
            <input
              value={form.currency}
              onChange={(e) => set('currency', e.target.value.toUpperCase())}
              className={inputCls + ' uppercase font-mono'}
              placeholder="XAF"
            />
          </div>
          <div>
            <label className={labelCls}>Symbole devise</label>
            <input value={form.currencySymbol} onChange={(e) => set('currencySymbol', e.target.value)} className={inputCls} placeholder="FCFA" />
          </div>
          <div>
            <label className={labelCls}>Décimales devise</label>
            <input
              type="number"
              min={0}
              max={4}
              value={form.currencyDecimals}
              onChange={(e) => set('currencyDecimals', Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Préfixe téléphonique</label>
            <input value={form.phonePrefix} onChange={(e) => set('phonePrefix', e.target.value)} className={inputCls} placeholder="+237" />
          </div>
          <div>
            <label className={labelCls}>Emoji drapeau</label>
            <input value={form.flagEmoji} onChange={(e) => set('flagEmoji', e.target.value)} className={inputCls} placeholder="🇨🇲" />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Créer et continuer
        </button>
      </div>
    </form>
  );
}
