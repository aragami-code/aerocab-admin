import { useState, useEffect, useCallback } from 'react';
import { Bot, Key, MessageSquare, Save, Eye, EyeOff, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { adminApi } from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    id:          'claude',
    label:       'Claude',
    company:     'Anthropic',
    badge:       'bg-orange-100 text-orange-700',
    placeholder: 'sk-ant-api03-…',
    models: [
      { label: 'Haiku 4.5 — Rapide & économique', value: 'claude-haiku-4-5-20251001' },
      { label: 'Sonnet 4.6 — Équilibré',          value: 'claude-sonnet-4-6' },
      { label: 'Opus 4.7 — Maximal',               value: 'claude-opus-4-7' },
    ],
  },
  {
    id:          'openai',
    label:       'ChatGPT',
    company:     'OpenAI',
    badge:       'bg-green-100 text-green-700',
    placeholder: 'sk-proj-…',
    models: [
      { label: 'GPT-4o mini — Rapide & économique', value: 'gpt-4o-mini' },
      { label: 'GPT-4o — Équilibré',                value: 'gpt-4o' },
      { label: 'GPT-4 Turbo — Maximal',             value: 'gpt-4-turbo' },
    ],
  },
  {
    id:          'zhipu',
    label:       'GLM',
    company:     'ZhipuAI',
    badge:       'bg-blue-100 text-blue-700',
    placeholder: 'votre-clé-zhipu',
    models: [
      { label: 'GLM-4 Flash — Rapide & économique', value: 'glm-4-flash' },
      { label: 'GLM-4 Air — Équilibré',             value: 'glm-4-air' },
      { label: 'GLM-4 Plus — Maximal',              value: 'glm-4-plus' },
    ],
  },
  {
    id:          'gemini',
    label:       'Gemini',
    company:     'Google',
    badge:       'bg-sky-100 text-sky-700',
    placeholder: 'AIzaSy…',
    models: [
      { label: 'Gemini 2.5 Flash — Recommandé',     value: 'gemini-2.5-flash'      },
      { label: 'Gemini 2.5 Pro — Maximal',           value: 'gemini-2.5-pro'        },
      { label: 'Gemini 2.0 Flash — Standard',        value: 'gemini-2.0-flash'      },
      { label: 'Gemini 2.0 Flash Lite — Économique', value: 'gemini-2.0-flash-lite' },
    ],
  },
] as const;

type ProviderId = 'claude' | 'openai' | 'zhipu' | 'gemini';

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function Section({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4">
        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 pb-6 pt-2 border-t border-slate-100">{children}</div>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div className="ml-4">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BotPage() {
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [enabled, setEnabled]       = useState(false);
  const [provider, setProvider]     = useState<ProviderId>('gemini');
  const [model, setModel]           = useState('claude-haiku-4-5-20251001');
  const [maxTokens, setMaxTokens]   = useState('500');
  const [systemPrompt, setSystemPrompt] = useState('');

  // Per-provider key inputs (empty = don't overwrite)
  const [keyInputs, setKeyInputs]   = useState({ claude: '', openai: '', zhipu: '', gemini: '' });
  const [keyShow, setKeyShow]       = useState({ claude: false, openai: false, zhipu: false, gemini: false });
  const [keyStatus, setKeyStatus]   = useState({ claude: false, openai: false, zhipu: false, gemini: false });
  const [keyMasked, setKeyMasked]   = useState({ claude: '', openai: '', zhipu: '', gemini: '' });

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const load = useCallback(async () => {
    try {
      const d = await adminApi.getBotSettings();
      setEnabled(d.enabled);
      setProvider(d.provider as ProviderId);
      setModel(d.model);
      setMaxTokens(String(d.maxTokens));
      setSystemPrompt(d.systemPrompt);
      setKeyStatus({ claude: d.claudeKey.configured, openai: d.openaiKey.configured, zhipu: d.zhipuKey.configured, gemini: d.geminiKey?.configured ?? false });
      setKeyMasked({ claude: d.claudeKey.masked, openai: d.openaiKey.masked, zhipu: d.zhipuKey.masked, gemini: d.geminiKey?.masked ?? '' });
    } catch {
      setToast({ type: 'error', msg: 'Impossible de charger les paramètres du bot' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleEnabled = async (value: boolean) => {
    setEnabled(value);
    setSaving(true);
    try {
      await adminApi.setBotSettings({ enabled: value });
      setToast({ type: 'success', msg: value ? 'Bot activé' : 'Bot désactivé' });
    } catch (e: any) {
      setEnabled(!value);
      setToast({ type: 'error', msg: e.message || 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  const handleProviderChange = (p: ProviderId) => {
    setProvider(p);
    const providerDef = PROVIDERS.find(x => x.id === p);
    setModel(providerDef?.models[0].value ?? '');
  };

  const handleSave = async () => {
    const tokens = parseInt(maxTokens, 10);
    if (isNaN(tokens) || tokens < 50 || tokens > 4096) {
      setToast({ type: 'error', msg: 'Tokens max invalide — valeur entre 50 et 4096' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.setBotSettings({
        provider,
        model,
        maxTokens: tokens,
        systemPrompt,
        ...(keyInputs.claude ? { claudeApiKey: keyInputs.claude } : {}),
        ...(keyInputs.openai ? { openaiApiKey: keyInputs.openai } : {}),
        ...(keyInputs.zhipu  ? { zhipuApiKey:  keyInputs.zhipu  } : {}),
        ...(keyInputs.gemini ? { geminiApiKey: keyInputs.gemini } : {}),
      });
      setToast({ type: 'success', msg: 'Configuration sauvegardée' });
      setKeyInputs({ claude: '', openai: '', zhipu: '', gemini: '' });
      // refresh masked keys
      load();
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message || 'Erreur lors de la sauvegarde' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const activeDef = PROVIDERS.find(p => p.id === provider)!;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-slate-800">Bot Assistant IA</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configurez le chatbot intégré à l'application passager — actif sans redéploiement
        </p>
      </div>

      {/* Activation */}
      <Section title="Activation" icon={Bot}>
        <FieldRow label="Activer le bot assistant" hint="Affiche la bulle flottante dans l'app passager">
          <Toggle checked={enabled} onChange={handleToggleEnabled} disabled={saving} />
        </FieldRow>
      </Section>

      {/* Provider selector */}
      <Section title="Fournisseur IA" icon={Key} subtitle="Sélectionnez le moteur IA à utiliser">
        <div className="grid grid-cols-4 gap-3 mt-2">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`flex flex-col gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                provider === p.id
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">{p.label}</span>
                {provider === p.id && <span className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${p.badge}`}>{p.company}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                keyStatus[p.id] ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {keyStatus[p.id] ? '✓ Clé configurée' : 'Clé manquante'}
              </span>
            </button>
          ))}
        </div>

        {/* Keys for all providers */}
        <div className="mt-5 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Clés API</p>
          {PROVIDERS.map(p => (
            <div key={p.id} className={`rounded-xl border p-3 space-y-2 transition-colors ${
              provider === p.id ? 'border-primary/40 bg-primary/[0.03]' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">{p.label} ({p.company})</span>
                {provider === p.id && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Actif</span>
                )}
                {keyStatus[p.id] && !keyInputs[p.id] && (
                  <span className="ml-auto text-xs text-slate-400 font-mono">{keyMasked[p.id]}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type={keyShow[p.id] ? 'text' : 'password'}
                  value={keyInputs[p.id]}
                  onChange={e => setKeyInputs(k => ({ ...k, [p.id]: e.target.value }))}
                  placeholder={keyStatus[p.id] ? '(laisser vide pour conserver)' : p.placeholder}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={() => setKeyShow(v => ({ ...v, [p.id]: !v[p.id] }))}
                  className="p-2 text-slate-400 hover:text-slate-600"
                  type="button"
                >
                  {keyShow[p.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Model + tokens */}
      <Section title="Modèle & performance" icon={Key} subtitle={`Modèles disponibles pour ${activeDef.label}`}>
        <FieldRow label="Modèle" hint={`Fournisseur actif : ${activeDef.company}`}>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            disabled={saving}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          >
            {activeDef.models.map((m: { label: string; value: string }) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
            <option value={model}>{model}</option>
          </select>
        </FieldRow>

        <FieldRow label="Tokens max" hint="Longueur maximale de la réponse (50–4096)">
          <input
            type="number" min={50} max={4096} step={50}
            value={maxTokens}
            onChange={e => setMaxTokens(e.target.value)}
            disabled={saving}
            className="w-28 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          />
        </FieldRow>
      </Section>

      {/* System prompt */}
      <Section title="Prompt système" icon={MessageSquare} subtitle="Instructions données au bot avant chaque conversation">
        <textarea
          rows={8}
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          disabled={saving}
          placeholder="Tu es l'assistant AeroCab. Réponds en fonction de la langue écrite, de façon concise et amicale…"
          className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y disabled:opacity-50 mt-2"
        />
        <p className="text-xs text-slate-400 mt-2">Le contexte utilisateur (solde wallet, course en cours, points) est automatiquement ajouté.</p>
      </Section>

      {/* Save */}
      <div className="flex items-center justify-between">
        <div>
          {!keyStatus[provider] && (
            <p className="text-sm text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Clé API manquante pour {activeDef.label} — le bot ne fonctionnera pas
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
