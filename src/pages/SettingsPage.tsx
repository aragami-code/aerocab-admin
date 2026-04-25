import { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  ShieldCheck,
  MessageSquare,
  Mail,
  Phone,
  Map,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Route,
  DollarSign,
} from 'lucide-react';
import { adminApi } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MapsKeyState {
  configured: boolean;
  maskedKey: string;
  newKey: string;
  showKey: boolean;
  saving: boolean;
}

interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  hint?: string;
}

const TWILIO_FIELDS: CredentialField[] = [
  { key: 'twilio_account_sid',  label: 'Account SID',  placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
  { key: 'twilio_auth_token',   label: 'Auth Token',   placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
  { key: 'twilio_phone_number', label: 'From Number',  placeholder: '+12015551234', hint: 'Format E.164' },
];
const ORANGE_FIELDS: CredentialField[] = [
  { key: 'orange_cm_client_id',      label: 'Client ID',      placeholder: 'xxxxxxxx' },
  { key: 'orange_cm_client_secret',  label: 'Client Secret',  placeholder: 'xxxxxxxx' },
  { key: 'orange_cm_sender_address', label: 'Sender Address', placeholder: 'tel:+237XXXXXXXXX' },
];
const AT_FIELDS: CredentialField[] = [
  { key: 'at_api_key',    label: 'API Key',    placeholder: 'xxxxxxxxxxxxxxxx' },
  { key: 'at_username',   label: 'Username',   placeholder: 'sandbox', hint: '"sandbox" pour les tests' },
  { key: 'at_sender_id',  label: 'Sender ID',  placeholder: 'AEROGO (optionnel)' },
];
const SENDGRID_FIELDS: CredentialField[] = [
  { key: 'sendgrid_api_key',    label: 'API Key',       placeholder: 'SG.xxxxxxxx' },
  { key: 'sendgrid_from_email', label: 'From Email',    placeholder: 'noreply@aerogo24.com' },
];

interface TestModeConfig {
  testModeEnabled: boolean;
  testOtpValue: string;
  otpLogEnabled: boolean;
  otpChannel: string;
  smsDefaultProvider: string;
  emailProvider: string;
  availableSmsProviders: string[];
  availableEmailProviders: string[];
  availableOtpChannels: string[];
}

interface SmsRule {
  prefix: string;
  provider: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-green-500' : 'bg-slate-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function Section({
  title,
  subtitle,
  icon: Icon,
  children,
  collapsible = false,
}: {
  title: string;
  subtitle?: string;
  icon: any;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => collapsible && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-6 py-4 ${collapsible ? 'cursor-pointer hover:bg-slate-50' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {collapsible && (open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
      </button>
      {open && <div className="px-6 pb-6 pt-2 border-t border-slate-100">{children}</div>}
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

function Select({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function SettingsPage() {
  const [config, setConfig] = useState<TestModeConfig | null>(null);
  const [smsRules, setSmsRules] = useState<SmsRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [mapsKey, setMapsKey] = useState<MapsKeyState>({
    configured: false, maskedKey: '', newKey: '', showKey: false, saving: false,
  });
  const [credStatus, setCredStatus] = useState<Record<string, boolean>>({});
  const [credValues, setCredValues] = useState<Record<string, string>>({});
  const [credVisible, setCredVisible] = useState<Record<string, boolean>>({});
  const [credSaving, setCredSaving] = useState(false);
  const [workflows, setWorkflows] = useState({
    arrival: true,
    departure: true,
    international: true,
  });
  const [workflowSaving, setWorkflowSaving] = useState(false);
  const [intlSurcharge, setIntlSurcharge] = useState('0');
  const [intlSurchargeSaving, setIntlSurchargeSaving] = useState(false);
  const [financialSettings, setFinancialSettings] = useState({
    commission_rate: '0.15',
    cashback_rate: '0.05',
    first_ride_bonus_points: '500',
    late_cancel_refund_rate: '0.5',
    points_recharge_packages: '1000,3000,5000,10000',
    points_expiry_warning_days: '30',
  });
  const [financialSaving, setFinancialSaving] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [testMode, smsRouting, mapsKeyData, creds, allSettings] = await Promise.all([
        adminApi.getTestMode(),
        adminApi.getSmsRouting(),
        adminApi.getMapsKey(),
        adminApi.getCredentials(),
        adminApi.getSettings(),
      ]);
      setConfig(testMode);
      setSmsRules(smsRouting.rules);
      setMapsKey((prev) => ({ ...prev, ...mapsKeyData }));
      setCredStatus(creds.status);
      setWorkflows({
        arrival: allSettings['workflow_arrival_enabled'] !== 'false',
        departure: allSettings['workflow_departure_enabled'] !== 'false',
        international: allSettings['workflow_international_enabled'] !== 'false',
      });
      setIntlSurcharge(allSettings['international_surcharge_percent'] ?? '0');
      setFinancialSettings({
        commission_rate: allSettings['commission_rate'] ?? '0.15',
        cashback_rate: allSettings['cashback_rate'] ?? '0.05',
        first_ride_bonus_points: allSettings['first_ride_bonus_points'] ?? '500',
        late_cancel_refund_rate: allSettings['late_cancel_refund_rate'] ?? '0.5',
        points_expiry_warning_days: allSettings['points_expiry_warning_days'] ?? '30',
        points_recharge_packages: (() => {
          try { return JSON.parse(allSettings['points_recharge_packages'] ?? '[1000,3000,5000,10000]').join(','); }
          catch { return '1000,3000,5000,10000'; }
        })(),
      });
    } catch {
      showToast('error', 'Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveAll = async () => {
    if (!config) return;
    setSaving(true);
    try {
      // 1. Sauvegarder le mode test + providers
      await adminApi.setTestMode({
        testModeEnabled: config.testModeEnabled,
        testOtpValue: config.testOtpValue,
        otpLogEnabled: config.otpLogEnabled,
        otpChannel: config.otpChannel,
        smsDefaultProvider: config.smsDefaultProvider,
        emailProvider: config.emailProvider,
      });
      // 2. Sauvegarder les règles SMS par pays
      await adminApi.setSmsRouting({ rules: smsRules, defaultProvider: config.smsDefaultProvider });
      showToast('success', 'Paramètres sauvegardés avec succès');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const saveWorkflows = async () => {
    setWorkflowSaving(true);
    try {
      await Promise.all([
        adminApi.setSetting('workflow_arrival_enabled', String(workflows.arrival)),
        adminApi.setSetting('workflow_departure_enabled', String(workflows.departure)),
        adminApi.setSetting('workflow_international_enabled', String(workflows.international)),
      ]);
      showToast('success', 'Workflows mis à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde workflows');
    } finally {
      setWorkflowSaving(false);
    }
  };

  const saveFinancialSettings = async () => {
    const commission = parseFloat(financialSettings.commission_rate);
    const cashback = parseFloat(financialSettings.cashback_rate);
    const firstRide = parseInt(financialSettings.first_ride_bonus_points, 10);
    const lateCancel = parseFloat(financialSettings.late_cancel_refund_rate);
    const packages = financialSettings.points_recharge_packages
      .split(',').map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n) && n > 0);

    if (isNaN(commission) || commission < 0 || commission > 1) {
      showToast('error', 'Commission invalide — valeur entre 0 et 1 (ex: 0.15 = 15%)');
      return;
    }
    if (isNaN(cashback) || cashback < 0 || cashback > 1) {
      showToast('error', 'Cashback invalide — valeur entre 0 et 1 (ex: 0.05 = 5%)');
      return;
    }
    if (isNaN(firstRide) || firstRide < 0) {
      showToast('error', 'Bonus première course invalide');
      return;
    }
    if (isNaN(lateCancel) || lateCancel < 0 || lateCancel > 1) {
      showToast('error', 'Taux remboursement invalide — valeur entre 0 et 1');
      return;
    }
    if (packages.length === 0) {
      showToast('error', 'Forfaits invalides — entrez des montants séparés par des virgules');
      return;
    }

    setFinancialSaving(true);
    try {
      const expiryWarning = parseInt(financialSettings.points_expiry_warning_days, 10);
    if (isNaN(expiryWarning) || expiryWarning < 1 || expiryWarning > 90) {
      showToast('error', 'Délai avertissement invalide — entre 1 et 90 jours');
      return;
    }

    await Promise.all([
        adminApi.setSetting('commission_rate', String(commission)),
        adminApi.setSetting('cashback_rate', String(cashback)),
        adminApi.setSetting('first_ride_bonus_points', String(firstRide)),
        adminApi.setSetting('late_cancel_refund_rate', String(lateCancel)),
        adminApi.setSetting('points_expiry_warning_days', String(expiryWarning)),
        adminApi.setSetting('points_recharge_packages', JSON.stringify(packages)),
      ]);
      showToast('success', 'Paramètres financiers mis à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde paramètres financiers');
    } finally {
      setFinancialSaving(false);
    }
  };

  const saveIntlSurcharge = async () => {
    const val = parseFloat(intlSurcharge);
    if (isNaN(val) || val < 0) {
      showToast('error', 'Valeur invalide — entrez un pourcentage positif (ex: 20)');
      return;
    }
    setIntlSurchargeSaving(true);
    try {
      await adminApi.setSetting('international_surcharge_percent', String(val));
      showToast('success', `Surcharge INTERNATIONAL mise à jour : +${val}%`);
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde surcharge');
    } finally {
      setIntlSurchargeSaving(false);
    }
  };

  const update = (patch: Partial<TestModeConfig>) =>
    setConfig((prev) => prev ? { ...prev, ...patch } : null);

  const saveMapsKey = async () => {
    if (!mapsKey.newKey.startsWith('AIzaSy')) {
      showToast('error', 'Clé invalide — doit commencer par AIzaSy');
      return;
    }
    setMapsKey((prev) => ({ ...prev, saving: true }));
    try {
      await adminApi.setMapsKey(mapsKey.newKey);
      const updated = await adminApi.getMapsKey();
      setMapsKey((prev) => ({ ...prev, ...updated, newKey: '', saving: false }));
      showToast('success', 'Clé Google Maps mise à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde clé Maps');
      setMapsKey((prev) => ({ ...prev, saving: false }));
    }
  };

  const saveCredentials = async (fields: CredentialField[]) => {
    const payload: Record<string, string> = {};
    let hasValue = false;
    for (const f of fields) {
      const val = credValues[f.key];
      if (val?.trim()) { payload[f.key] = val.trim(); hasValue = true; }
    }
    if (!hasValue) { showToast('error', 'Aucune valeur saisie'); return; }
    setCredSaving(true);
    try {
      await adminApi.setCredentials(payload);
      const creds = await adminApi.getCredentials();
      setCredStatus(creds.status);
      // Effacer les champs saisis
      setCredValues((prev) => {
        const next = { ...prev };
        fields.forEach((f) => { delete next[f.key]; });
        return next;
      });
      showToast('success', 'Credentials mis à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde');
    } finally {
      setCredSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) return null;

  const isTestMode = config.testModeEnabled;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-800">Configuration</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Paramètres dynamiques — actifs sans redéploiement
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder tout
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ── Bannière mode actuel ────────────────────────────────────────────── */}
      <div className={`rounded-2xl px-6 py-4 flex items-center gap-4 border-2 ${
        isTestMode
          ? 'bg-amber-50 border-amber-300'
          : 'bg-green-50 border-green-300'
      }`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          isTestMode ? 'bg-amber-200' : 'bg-green-200'
        }`}>
          {isTestMode
            ? <FlaskConical className="w-6 h-6 text-amber-700" />
            : <ShieldCheck className="w-6 h-6 text-green-700" />}
        </div>
        <div className="flex-1">
          <p className={`text-base font-bold ${isTestMode ? 'text-amber-800' : 'text-green-800'}`}>
            {isTestMode ? 'Mode TEST actif' : 'Mode PRODUCTION actif'}
          </p>
          <p className={`text-sm mt-0.5 ${isTestMode ? 'text-amber-600' : 'text-green-600'}`}>
            {isTestMode
              ? `OTP fixé à "${config.testOtpValue}" — SMS simulés (aucun envoi réel)`
              : 'OTP aléatoire — SMS envoyés via les providers configurés'}
          </p>
        </div>
        <Toggle
          checked={isTestMode}
          onChange={(v) => update({ testModeEnabled: v })}
        />
      </div>

      {/* ── Section Mode Test ───────────────────────────────────────────────── */}
      <Section
        icon={FlaskConical}
        title="Mode Test / Production"
        subtitle="Contrôle le comportement de l'OTP et des SMS"
      >
        <FieldRow
          label="Mode test activé"
          hint="En mode test : OTP fixe, SMS simulés, aucun envoi réel"
        >
          <Toggle checked={config.testModeEnabled} onChange={(v) => update({ testModeEnabled: v })} />
        </FieldRow>

        <FieldRow
          label="Code OTP de test"
          hint="Code que tous les testeurs utiliseront (4–8 chiffres)"
        >
          <div className="flex items-center gap-2">
            <input
              type={showOtp ? 'text' : 'password'}
              value={config.testOtpValue}
              onChange={(e) => update({ testOtpValue: e.target.value.replace(/\D/g, '').slice(0, 8) })}
              disabled={!config.testModeEnabled}
              className="w-28 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40"
              maxLength={8}
              placeholder="000000"
            />
            <button onClick={() => setShowOtp((v) => !v)} className="text-slate-400 hover:text-slate-600">
              {showOtp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </FieldRow>

        <FieldRow
          label="Logger OTP en clair"
          hint="Affiche le code OTP dans les logs serveur (utile pour debug)"
        >
          <Toggle
            checked={config.otpLogEnabled || config.testModeEnabled}
            onChange={(v) => update({ otpLogEnabled: v })}
            disabled={config.testModeEnabled} // auto-activé en mode test
          />
        </FieldRow>

        <FieldRow
          label="Canal OTP"
          hint="Comment l'OTP est envoyé à l'utilisateur"
        >
          <Select
            value={config.otpChannel}
            onChange={(v) => update({ otpChannel: v })}
            options={config.availableOtpChannels}
          />
        </FieldRow>
      </Section>

      {/* ── Section Google Maps Key ─────────────────────────────────────────── */}
      <Section
        icon={Map}
        title="Google Maps API Key"
        subtitle="Directions API + Geocoding — changeable sans rebuild APK"
      >
        <FieldRow
          label="Statut"
          hint="Clé utilisée pour le tracé de route et le géocodage"
        >
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            mapsKey.configured
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          }`}>
            {mapsKey.configured ? 'Configurée' : 'Non configurée'}
          </span>
        </FieldRow>

        {mapsKey.configured && (
          <FieldRow label="Clé actuelle" hint="Partiellement masquée pour sécurité">
            <span className="font-mono text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
              {mapsKey.maskedKey}
            </span>
          </FieldRow>
        )}

        <div className="pt-3 space-y-2">
          <p className="text-xs font-medium text-slate-600">
            {mapsKey.configured ? 'Remplacer la clé' : 'Ajouter la clé'}
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={mapsKey.showKey ? 'text' : 'password'}
                value={mapsKey.newKey}
                onChange={(e) => setMapsKey((prev) => ({ ...prev, newKey: e.target.value }))}
                placeholder="AIzaSy..."
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={() => setMapsKey((prev) => ({ ...prev, showKey: !prev.showKey }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {mapsKey.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={saveMapsKey}
              disabled={mapsKey.saving || !mapsKey.newKey}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
            >
              {mapsKey.saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Enregistrer
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Actif immédiatement — les apps lisent cette clé au démarrage via /api/config.
            Le SDK natif (affichage carte) utilise la clé baked dans l'APK.
          </p>
        </div>
      </Section>

      {/* ── Section SMS ─────────────────────────────────────────────────────── */}
      <Section
        icon={Phone}
        title="Provider SMS"
        subtitle="Provider par défaut et règles par indicatif pays"
      >
        <FieldRow
          label="Provider par défaut"
          hint={config.testModeEnabled ? 'Ignoré en mode test (mock forcé)' : 'Utilisé si aucune règle par pays ne correspond'}
        >
          <Select
            value={config.testModeEnabled ? 'mock' : config.smsDefaultProvider}
            onChange={(v) => update({ smsDefaultProvider: v })}
            options={config.availableSmsProviders}
            disabled={config.testModeEnabled}
          />
        </FieldRow>

        {/* Règles par pays */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700">Règles par indicatif pays</p>
            <button
              onClick={() => setSmsRules((r) => [...r, { prefix: '+237', provider: 'mock' }])}
              disabled={config.testModeEnabled}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter règle
            </button>
          </div>

          {smsRules.length === 0 && !config.testModeEnabled && (
            <p className="text-xs text-slate-400 italic py-2">
              Aucune règle — tous les SMS utilisent le provider par défaut
            </p>
          )}

          <div className="space-y-2">
            {smsRules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={rule.prefix}
                  onChange={(e) => {
                    const r = [...smsRules];
                    r[i] = { ...r[i], prefix: e.target.value };
                    setSmsRules(r);
                  }}
                  disabled={config.testModeEnabled}
                  className="w-24 text-sm border border-slate-200 rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40"
                  placeholder="+237"
                />
                <span className="text-slate-400 text-sm">→</span>
                <Select
                  value={rule.provider}
                  onChange={(v) => {
                    const r = [...smsRules];
                    r[i] = { ...r[i], provider: v };
                    setSmsRules(r);
                  }}
                  options={config.availableSmsProviders}
                  disabled={config.testModeEnabled}
                />
                <button
                  onClick={() => setSmsRules((r) => r.filter((_, j) => j !== i))}
                  disabled={config.testModeEnabled}
                  className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Guide providers */}
          <div className="mt-4 bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600 mb-1">Providers disponibles</p>
            <p><span className="font-mono bg-white border border-slate-200 px-1 rounded">mock</span> — Simule l'envoi (logs seulement, aucun SMS réel)</p>
            <p><span className="font-mono bg-white border border-slate-200 px-1 rounded">twilio</span> — Twilio (international) — requiert TWILIO_* dans .env</p>
            <p><span className="font-mono bg-white border border-slate-200 px-1 rounded">orange-cm</span> — Orange Cameroun — requiert ORANGE_CM_* dans .env</p>
            <p><span className="font-mono bg-white border border-slate-200 px-1 rounded">africas-talking</span> — Africa's Talking — requiert AT_API_KEY dans .env</p>
          </div>
        </div>
      </Section>

      {/* ── Section Email ────────────────────────────────────────────────────── */}
      <Section
        icon={Mail}
        title="Provider Email"
        subtitle="Emails de confirmation, récus, alertes"
        collapsible
      >
        <FieldRow
          label="Provider email"
          hint={config.testModeEnabled ? 'Ignoré en mode test (mock forcé)' : 'Fournisseur pour les emails transactionnels'}
        >
          <Select
            value={config.testModeEnabled ? 'mock' : config.emailProvider}
            onChange={(v) => update({ emailProvider: v })}
            options={config.availableEmailProviders}
            disabled={config.testModeEnabled}
          />
        </FieldRow>

        <div className="mt-3 bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-600 mb-1">Providers disponibles</p>
          <p><span className="font-mono bg-white border border-slate-200 px-1 rounded">mock</span> — Log dans la console, aucun email envoyé</p>
          <p><span className="font-mono bg-white border border-slate-200 px-1 rounded">sendgrid</span> — SendGrid API — requiert SENDGRID_API_KEY dans .env</p>
          <p><span className="font-mono bg-white border border-slate-200 px-1 rounded">smtp</span> — SMTP classique — requiert SMTP_HOST/USER/PASS dans .env</p>
        </div>
      </Section>

      {/* ── Section Credentials SMS ─────────────────────────────────────────── */}
      <Section
        icon={Phone}
        title="Credentials SMS"
        subtitle="Configurez un ou plusieurs providers — actifs sans redémarrage"
        collapsible
      >
        <ProviderCredentials
          title="Twilio"
          badge="International"
          badgeColor="blue"
          fields={TWILIO_FIELDS}
          status={credStatus}
          values={credValues}
          visible={credVisible}
          saving={credSaving}
          onChangeValue={(k, v) => setCredValues((p) => ({ ...p, [k]: v }))}
          onToggleVisible={(k) => setCredVisible((p) => ({ ...p, [k]: !p[k] }))}
          onSave={() => saveCredentials(TWILIO_FIELDS)}
        />
        <div className="border-t border-slate-100 my-4" />
        <ProviderCredentials
          title="Orange Cameroun"
          badge="+237"
          badgeColor="orange"
          fields={ORANGE_FIELDS}
          status={credStatus}
          values={credValues}
          visible={credVisible}
          saving={credSaving}
          onChangeValue={(k, v) => setCredValues((p) => ({ ...p, [k]: v }))}
          onToggleVisible={(k) => setCredVisible((p) => ({ ...p, [k]: !p[k] }))}
          onSave={() => saveCredentials(ORANGE_FIELDS)}
        />
        <div className="border-t border-slate-100 my-4" />
        <ProviderCredentials
          title="Africa's Talking"
          badge="Multi-pays"
          badgeColor="green"
          fields={AT_FIELDS}
          status={credStatus}
          values={credValues}
          visible={credVisible}
          saving={credSaving}
          onChangeValue={(k, v) => setCredValues((p) => ({ ...p, [k]: v }))}
          onToggleVisible={(k) => setCredVisible((p) => ({ ...p, [k]: !p[k] }))}
          onSave={() => saveCredentials(AT_FIELDS)}
        />
      </Section>

      {/* ── Section Credentials Email ────────────────────────────────────────── */}
      <Section
        icon={Mail}
        title="Credentials Email"
        subtitle="SendGrid pour les emails transactionnels"
        collapsible
      >
        <ProviderCredentials
          title="SendGrid"
          badge="Email"
          badgeColor="blue"
          fields={SENDGRID_FIELDS}
          status={credStatus}
          values={credValues}
          visible={credVisible}
          saving={credSaving}
          onChangeValue={(k, v) => setCredValues((p) => ({ ...p, [k]: v }))}
          onToggleVisible={(k) => setCredVisible((p) => ({ ...p, [k]: !p[k] }))}
          onSave={() => saveCredentials(SENDGRID_FIELDS)}
        />
      </Section>

      {/* ── Section Workflows ────────────────────────────────────────────────── */}
      <Section
        icon={Route}
        title="Workflows de réservation"
        subtitle="Activez ou désactivez chaque type de course en temps réel"
      >
        <div className="space-y-1">
          {([
            { key: 'arrival' as const, label: 'Arrivée aéroport', desc: 'Passager à l\'aéroport → destination', color: 'text-blue-600', bg: 'bg-blue-50' },
            { key: 'departure' as const, label: 'Départ vers aéroport', desc: 'Domicile / lieu → aéroport', color: 'text-green-600', bg: 'bg-green-50' },
            { key: 'international' as const, label: 'Réservation internationale', desc: 'Vol depuis l\'étranger → destination', color: 'text-purple-600', bg: 'bg-purple-50' },
          ]).map(({ key, label, desc, color, bg }) => (
            <div key={key} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${workflows[key] ? `${bg} border-current/20` : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <p className={`text-sm font-semibold ${workflows[key] ? color : 'text-slate-400'}`}>{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                {!workflows[key] && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1">
                    Service indisponible pour le moment
                  </span>
                )}
              </div>
              <Toggle
                checked={workflows[key]}
                onChange={(v) => setWorkflows((prev) => ({ ...prev, [key]: v }))}
                disabled={workflowSaving}
              />
            </div>
          ))}
          <div className="flex justify-end pt-3">
            <button
              onClick={saveWorkflows}
              disabled={workflowSaving}
              className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {workflowSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {workflowSaving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Section>

      {/* ── Section Paramètres financiers ───────────────────────────────────── */}
      <Section
        icon={DollarSign}
        title="Paramètres financiers"
        subtitle="Commission, cashback, bonus, annulation — actifs sans redéploiement"
      >
        <div className="space-y-4">
          {/* Commission chauffeur */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Commission plateforme
                <span className="text-slate-400 ml-1 font-normal">(0 → 1, ex: 0.15 = 15%)</span>
              </label>
              <div className="relative">
                <input
                  type="number" min="0" max="1" step="0.01"
                  value={financialSettings.commission_rate}
                  onChange={e => setFinancialSettings(p => ({ ...p, commission_rate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                  {isNaN(parseFloat(financialSettings.commission_rate)) ? '—' : `${Math.round(parseFloat(financialSettings.commission_rate) * 100)}%`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Déduit du paiement chauffeur à chaque course</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Taux cashback passager
                <span className="text-slate-400 ml-1 font-normal">(0 → 1, ex: 0.05 = 5%)</span>
              </label>
              <div className="relative">
                <input
                  type="number" min="0" max="1" step="0.01"
                  value={financialSettings.cashback_rate}
                  onChange={e => setFinancialSettings(p => ({ ...p, cashback_rate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                  {isNaN(parseFloat(financialSettings.cashback_rate)) ? '—' : `${Math.round(parseFloat(financialSettings.cashback_rate) * 100)}%`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Points offerts au passager après chaque course complétée</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Bonus première course (pts)
              </label>
              <input
                type="number" min="0" step="50"
                value={financialSettings.first_ride_bonus_points}
                onChange={e => setFinancialSettings(p => ({ ...p, first_ride_bonus_points: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-slate-400 mt-1">Points offerts au passager lors de sa toute première réservation</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Remboursement annulation tardive
                <span className="text-slate-400 ml-1 font-normal">(0 → 1, ex: 0.5 = 50%)</span>
              </label>
              <div className="relative">
                <input
                  type="number" min="0" max="1" step="0.05"
                  value={financialSettings.late_cancel_refund_rate}
                  onChange={e => setFinancialSettings(p => ({ ...p, late_cancel_refund_rate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                  {isNaN(parseFloat(financialSettings.late_cancel_refund_rate)) ? '—' : `${Math.round(parseFloat(financialSettings.late_cancel_refund_rate) * 100)}%`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Fraction remboursée si annulation après 48h vol ou chauffeur déjà en route</p>
            </div>
          </div>

          {/* Expiration points */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Avertissement expiration points (jours avant)
            </label>
            <input
              type="number" min="1" max="90" step="1"
              value={financialSettings.points_expiry_warning_days}
              onChange={e => setFinancialSettings(p => ({ ...p, points_expiry_warning_days: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-slate-400 mt-1">
              Les utilisateurs inactifs reçoivent une notification push X jours avant l'expiration de leurs points (cron : 15 du mois à 9h)
            </p>
          </div>

          {/* Forfaits recharge */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Forfaits recharge points (montants en pts, séparés par des virgules)
            </label>
            <input
              type="text"
              value={financialSettings.points_recharge_packages}
              onChange={e => setFinancialSettings(p => ({ ...p, points_recharge_packages: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="1000,3000,5000,10000"
            />
            <p className="text-xs text-slate-400 mt-1">
              Packages affichés à l'achat de points — le prix en FCFA est calculé automatiquement depuis le taux fcfaPerPoint (tarifs)
            </p>
          </div>

          {/* Récap visuel */}
          <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div>Chauffeur reçoit : <strong>{isNaN(parseFloat(financialSettings.commission_rate)) ? '—' : `${Math.round((1 - parseFloat(financialSettings.commission_rate)) * 100)}%`}</strong> du montant</div>
            <div>Plateforme garde : <strong>{isNaN(parseFloat(financialSettings.commission_rate)) ? '—' : `${Math.round(parseFloat(financialSettings.commission_rate) * 100)}%`}</strong></div>
            <div>Cashback 5000 FCFA : <strong>{isNaN(parseFloat(financialSettings.cashback_rate)) ? '—' : `+${Math.floor(5000 * parseFloat(financialSettings.cashback_rate))} pts`}</strong></div>
            <div>Annulation tardive : <strong>{isNaN(parseFloat(financialSettings.late_cancel_refund_rate)) ? '—' : `${Math.round(parseFloat(financialSettings.late_cancel_refund_rate) * 100)}% remboursé`}</strong></div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveFinancialSettings}
              disabled={financialSaving}
              className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {financialSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {financialSaving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Section>

      {/* ── Section Tarification INTERNATIONAL ─────────────────────────────── */}
      <Section
        icon={Save}
        title="Tarification INTERNATIONAL"
        subtitle="Surcharge appliquée sur les courses de type INTERNATIONAL (passager hors du pays)"
        collapsible
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Entrez un pourcentage positif. <strong>0</strong> = pas de surcharge. <strong>20</strong> = +20% sur le prix de base.
            La valeur est appliquée immédiatement sans recompilation des apps.
          </p>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <input
                type="number"
                min="0"
                step="1"
                value={intlSurcharge}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || parseFloat(v) >= 0) setIntlSurcharge(v);
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">%</span>
            </div>
            <button
              onClick={saveIntlSurcharge}
              disabled={intlSurchargeSaving}
              className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {intlSurchargeSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {intlSurchargeSaving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
          {parseFloat(intlSurcharge) > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span>⚠️</span>
              <span>Exemple : course à 5 000 FCFA → <strong>{Math.round(5000 * (1 + parseFloat(intlSurcharge) / 100)).toLocaleString()} FCFA</strong> avec +{intlSurcharge}%</span>
            </div>
          )}
        </div>
      </Section>

      {/* ── Section Statut variables .env ───────────────────────────────────── */}
      <Section
        icon={MessageSquare}
        title="Variables d'environnement requises"
        subtitle="État des clés manquantes pour activer les providers"
        collapsible
      >
        <div className="space-y-2 text-sm">
          <EnvRow label="EXPO_PUBLIC_GOOGLE_MAPS_KEY" description="Affichage carte native dans l'APK (build-time uniquement)" />
          <EnvRow label="TWILIO_ACCOUNT_SID" description="Provider Twilio (SMS OTP international)" />
          <EnvRow label="TWILIO_AUTH_TOKEN" description="Authentification Twilio" />
          <EnvRow label="TWILIO_PHONE_NUMBER" description="Numéro expéditeur Twilio" />
          <EnvRow label="ORANGE_CM_CLIENT_ID" description="Provider Orange Cameroun" />
          <EnvRow label="AT_API_KEY" description="Provider Africa's Talking" />
          <EnvRow label="SENDGRID_API_KEY" description="Provider email SendGrid" />
          <p className="text-xs text-slate-400 mt-3">
            Ces variables sont définies dans le fichier <span className="font-mono">.env</span> du serveur backend — non modifiables depuis ce dashboard.
          </p>
        </div>
      </Section>
    </div>
  );
}

const BADGE_COLORS: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
  green:  'bg-green-100 text-green-700',
};

function ProviderCredentials({
  title, badge, badgeColor, fields, status, values, visible, saving,
  onChangeValue, onToggleVisible, onSave,
}: {
  title: string;
  badge: string;
  badgeColor: string;
  fields: CredentialField[];
  status: Record<string, boolean>;
  values: Record<string, string>;
  visible: Record<string, boolean>;
  saving: boolean;
  onChangeValue: (key: string, value: string) => void;
  onToggleVisible: (key: string) => void;
  onSave: () => void;
}) {
  const allConfigured = fields.filter(f => f.key !== 'at_sender_id' && f.key !== 'sendgrid_from_email').every(f => status[f.key]);
  const hasInput = fields.some(f => !!values[f.key]?.trim());

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_COLORS[badgeColor] ?? BADGE_COLORS.blue}`}>{badge}</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${allConfigured ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {allConfigured ? 'Configuré' : 'Non configuré'}
        </span>
      </div>

      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <div className="w-32 shrink-0">
              <p className="text-xs font-medium text-slate-600">{f.label}</p>
              {f.hint && <p className="text-[10px] text-slate-400">{f.hint}</p>}
            </div>
            <div className="flex items-center gap-1 flex-1">
              {status[f.key] && !values[f.key] ? (
                <span className="flex-1 text-xs font-mono bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg">
                  ••••••••••••  (configuré)
                </span>
              ) : (
                <div className="relative flex-1">
                  <input
                    type={visible[f.key] ? 'text' : 'password'}
                    value={values[f.key] ?? ''}
                    onChange={(e) => onChangeValue(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={() => onToggleVisible(f.key)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {visible[f.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
              {status[f.key] && !values[f.key] && (
                <button
                  onClick={() => onChangeValue(f.key, ' ')}
                  className="text-xs text-slate-400 hover:text-slate-600 underline whitespace-nowrap"
                >
                  Modifier
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasInput && (
        <div className="flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Enregistrer
          </button>
        </div>
      )}
    </div>
  );
}

function EnvRow({ label, description, critical }: { label: string; description: string; critical?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${critical ? 'bg-red-400' : 'bg-amber-400'}`} />
      <div>
        <p className="font-mono text-xs text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full shrink-0 ${
        critical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
      }`}>
        {critical ? 'Critique' : 'Manquante'}
      </span>
    </div>
  );
}
