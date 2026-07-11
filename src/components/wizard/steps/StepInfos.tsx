import { useState, useMemo } from 'react';
import { Globe, CheckCircle, AlertCircle, Loader2, Search, Check } from 'lucide-react';
import { adminApi } from '../../../services/api';
import { COUNTRIES, flagEmoji, type CountryInfo } from '../../../lib/countries';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

interface Props {
  mode: 'create' | 'complete';
  code?: string;
  settings?: Record<string, string>;
  existingCodes?: string[];
  onCreated: (code: string) => void;
  onSaved: () => void;
}

export function StepInfos({ mode, code, existingCodes = [], onCreated, onSaved }: Props) {
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
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const configured = useMemo(() => new Set(existingCodes.map((c) => c.toUpperCase())), [existingCodes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? COUNTRIES.filter(
          (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.dial.includes(q),
        )
      : COUNTRIES;
    // Pays déjà configurés relégués en bas
    return [...list].sort((a, b) => Number(configured.has(a.code)) - Number(configured.has(b.code)));
  }, [query, configured]);

  const pick = (c: CountryInfo) => {
    if (configured.has(c.code)) return;
    setForm((f) => ({
      ...f,
      code: c.code,
      name: c.name,
      currency: c.currency,
      phonePrefix: c.dial,
      flagEmoji: flagEmoji(c.code),
      currencyDecimals: c.currency === 'EUR' || c.currency === 'USD' ? 2 : 0,
    }));
    setQuery('');
    setOpen(false);
    setError('');
  };

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.code.trim().length !== 2) { setError('Sélectionnez un pays.'); return; }
    if (!form.name.trim() || !form.currency.trim()) { setError('Nom et devise sont requis.'); return; }
    if (configured.has(form.code.toUpperCase())) { setError('Ce pays est déjà configuré.'); return; }
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
      if (/exist|409|déjà|already/i.test(msg)) setError('Ce pays a déjà été créé.');
      else setError('Création impossible : ' + (msg || 'erreur inconnue'));
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
          <button onClick={onSaved} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors">
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

        {/* Sélecteur de pays recherchable */}
        <div className="mb-4 relative">
          <label className={labelCls}>Pays *</label>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30">
            {form.code ? <span className="text-lg leading-none">{flagEmoji(form.code)}</span> : <Search className="w-4 h-4 text-gray-400" />}
            <input
              value={open ? query : form.name}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => { setOpen(true); setQuery(''); }}
              placeholder="Rechercher un pays (nom, code, indicatif)…"
              className="flex-1 text-sm focus:outline-none bg-transparent"
            />
            {form.code && <span className="font-mono text-xs text-gray-400">{form.code}</span>}
          </div>
          {open && (
            <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
              {filtered.map((c) => {
                const isConfigured = configured.has(c.code);
                return (
                  <button
                    type="button"
                    key={c.code}
                    disabled={isConfigured}
                    onClick={() => pick(c)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left ${
                      isConfigured ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'hover:bg-primary/5'
                    }`}
                  >
                    <span className="text-lg leading-none">{flagEmoji(c.code)}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="font-mono text-xs text-gray-400">{c.code} · {c.dial}</span>
                    {isConfigured && (
                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Check className="w-3 h-3" />configuré</span>
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && <div className="px-3 py-3 text-sm text-gray-400">Aucun pays trouvé</div>}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-1">Sélectionner un pays remplit automatiquement les champs ci-dessous (modifiables).</p>
        </div>

        {/* Détails (pré-remplis, ajustables) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Code ISO</label>
            <input value={form.code} readOnly className={inputCls + ' uppercase font-mono tracking-widest bg-gray-50'} placeholder="—" />
          </div>
          <div>
            <label className={labelCls}>Nom *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="Cameroun" />
          </div>
          <div>
            <label className={labelCls}>Devise (ISO) *</label>
            <input value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} className={inputCls + ' uppercase font-mono'} placeholder="XAF" />
          </div>
          <div>
            <label className={labelCls}>Symbole devise</label>
            <input value={form.currencySymbol} onChange={(e) => set('currencySymbol', e.target.value)} className={inputCls} placeholder="FCFA" />
          </div>
          <div>
            <label className={labelCls}>Décimales devise</label>
            <input type="number" min={0} max={4} value={form.currencyDecimals} onChange={(e) => set('currencyDecimals', Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Préfixe téléphonique</label>
            <input value={form.phonePrefix} onChange={(e) => set('phonePrefix', e.target.value)} className={inputCls} placeholder="+237" />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Créer et continuer
        </button>
      </div>
    </form>
  );
}
