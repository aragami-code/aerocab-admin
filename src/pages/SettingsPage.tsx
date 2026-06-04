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
  Globe,
  ChevronUp,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Route,
  DollarSign,
  CreditCard,
  FileText,
  Ticket,
  LogIn,
  PhoneCall,
  Plane,
  ToggleLeft,
  Activity,
  BarChart3,
} from 'lucide-react';
import { adminApi, type DocConfigItem } from '../services/api';
import { useCountry } from '../contexts/CountryContext';

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
  isPublic?: boolean;   // true = champ visible en clair par défaut (non masqué)
  optional?: boolean;   // true = exclus du check "allConfigured"
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
const SMTP_FIELDS: CredentialField[] = [
  { key: 'smtp_host',       label: 'Serveur SMTP',       placeholder: 'smtp.gmail.com',              isPublic: true,                   hint: 'Ex: smtp.gmail.com, smtp.office365.com, mail.ovh.net' },
  { key: 'smtp_port',       label: 'Port',               placeholder: '587',                         isPublic: true,  optional: true,  hint: '587 (TLS recommandé) · 465 (SSL) · 25 (non chiffré)' },
  { key: 'smtp_user',       label: 'Utilisateur',        placeholder: 'user@gmail.com',              isPublic: true,                   hint: 'Adresse email ou identifiant du compte SMTP' },
  { key: 'smtp_pass',       label: 'Mot de passe',       placeholder: '••••••••••••',                                                  hint: 'Pour Gmail : générer un mot de passe d\'application (support.google.com/accounts)' },
  { key: 'smtp_from_email', label: 'Adresse expéditeur', placeholder: 'noreply@aerocab.com',         isPublic: true,  optional: true,  hint: 'Si vide : identique à Utilisateur' },
];

const PAYMENT_PROVIDERS_CONFIG = [
  { id: 'cinetpay',    label: 'CinetPay',    badge: 'Cameroun / CEMAC',      color: 'bg-orange-100 text-orange-700', credKeys: ['payment_cinetpay_api_key', 'payment_cinetpay_site_id'] },
  { id: 'flutterwave', label: 'Flutterwave', badge: 'Afrique',               color: 'bg-orange-100 text-orange-700', credKeys: ['payment_flutterwave_secret_key', 'payment_flutterwave_webhook_hash'] },
  { id: 'stripe',      label: 'Stripe',      badge: 'Carte · Link · Apple · Google', color: 'bg-indigo-100 text-indigo-700', credKeys: ['payment_stripe_secret_key', 'payment_stripe_webhook_secret'] },
  { id: 'notchpay',    label: 'NotchPay',    badge: 'CM Orange · MTN',       color: 'bg-green-100 text-green-700',  credKeys: ['payment_notchpay_public_key', 'payment_notchpay_private_key', 'payment_notchpay_webhook_secret'] },
  { id: 'mpesa',       label: 'M-Pesa',      badge: 'Kenya (KES)',            color: 'bg-green-100 text-green-700',  credKeys: ['payment_mpesa_consumer_key', 'payment_mpesa_consumer_secret', 'payment_mpesa_shortcode', 'payment_mpesa_passkey'] },
  { id: 'paypal',      label: 'PayPal',      badge: 'USD · EUR international', color: 'bg-blue-100 text-blue-700',   credKeys: ['payment_paypal_client_id', 'payment_paypal_client_secret', 'payment_paypal_webhook_id'] },
  { id: 'wave',        label: 'Wave',        badge: 'Afrique de l\'Ouest (XOF)', color: 'bg-cyan-100 text-cyan-700', credKeys: ['payment_wave_api_key', 'payment_wave_webhook_secret'] },
  { id: 'edoctor',     label: 'EdoctorPay',  badge: 'MTN · Orange · Visa (CM)',  color: 'bg-teal-100 text-teal-700',  credKeys: ['payment_edoctor_url', 'payment_edoctor_email', 'payment_edoctor_password'] },
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
  const { selected } = useCountry();
  const [config, setConfig] = useState<TestModeConfig | null>(null);
  const [allSettingsRaw, setAllSettingsRaw] = useState<Record<string, string>>({});
  const [otpConfig, setOtpConfig] = useState({
    sms: true, whatsapp: false, email: true,
    defaultChannel: 'sms',
    whatsappProvider: 'mock',
    ultramsgInstance: '', ultramsgToken: '',
  });
  const [otpSaving, setOtpSaving] = useState(false);
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
  const [accessPass, setAccessPass] = useState({
    enabled:       false,
    price_fcfa:    '2000',
    duration_days: '30',
    trial_days:    '7',
    grace_days:    '2',
  });
  const [accessPassSaving, setAccessPassSaving] = useState(false);
  const [registrationFee, setRegistrationFee] = useState({
    enabled:     false,
    fee_min:     '5000',
    fee_max:     '10000',
    deposit_pct: '50',
  });
  const [registrationFeeSaving, setRegistrationFeeSaving] = useState(false);
  const [authProviders, setAuthProviders] = useState({
    emailOtpEnabled: true,
    googleEnabled: true,
    googleClientId: '',
    googleClientSecret: '',
  });
  const [authProvidersSaving, setAuthProvidersSaving] = useState(false);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [dailyGoals, setDailyGoals] = useState({ rides: '5', earnings: '25000', rating: '4.5' });
  const [dailyGoalsSaving, setDailyGoalsSaving] = useState(false);
  const [scheduledAdvanceMin, setScheduledAdvanceMin] = useState('60');
  const [intlSurcharge, setIntlSurcharge] = useState('0');
  const [intlSurchargeSaving, setIntlSurchargeSaving] = useState(false);
  const [financialSettings, setFinancialSettings] = useState({
    commission_rate: '0.15',
    cashback_rate: '0.05',
    first_ride_bonus_points: '500',
    rating_bonus_points: '200',
    late_cancel_refund_rate: '0.5',
    points_recharge_packages: '1000,3000,5000,10000',
    points_expiry_warning_days: '30',
  });
  const [financialSaving, setFinancialSaving] = useState(false);
  const [paymentSecurity, setPaymentSecurity] = useState({
    payment_max_recharge_amount: '500000',
    withdrawal_min_amount: '1000',
    withdrawal_max_amount: '100000',
    withdrawal_max_daily_amount: '200000',
    withdrawal_carence_hours: '24',
    backend_url: 'https://aerocab-api.onrender.com',
  });
  const [paymentSecuritySaving, setPaymentSecuritySaving] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState<Record<string, boolean>>({});
  const [paymentCreds, setPaymentCreds] = useState<Record<string, { label: string; configured: boolean; maskedValue?: string }>>({});
  const [paymentCredInput, setPaymentCredInput] = useState<Record<string, string>>({});
  const [paymentCredVisible, setPaymentCredVisible] = useState<Record<string, boolean>>({});
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [edoctorTest, setEdoctorTest] = useState<{ loading: boolean; result: { ok: boolean; message: string } | null }>({ loading: false, result: null });

  const ALL_PAYMENT_METHODS = ['cash', 'card', 'wallet', 'points', 'orange_money_cm', 'mtn_cm'];
  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: 'Espèces', card: 'Carte bancaire', wallet: 'Wallet AeroCab',
    points: 'Points fidélité', orange_money_cm: 'Orange Money CM', mtn_cm: 'MTN Mobile Money CM',
  };
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<string[]>(['cash', 'card', 'wallet', 'points']);
  const [directPaymentMethods, setDirectPaymentMethods] = useState<string[]>(['cash']);
  const [paymentMethodsSaving, setPaymentMethodsSaving] = useState(false);

  const [flightRadarToken, setFlightRadarToken] = useState('');
  const [aerodataboxKey, setAerodataboxKey] = useState('');
  const [showFlightRadar, setShowFlightRadar] = useState(false);
  const [showAerodatabox, setShowAerodatabox] = useState(false);
  const [flightApiSaving, setFlightApiSaving] = useState(false);
  const [fr24Test, setFr24Test] = useState<{ loading: boolean; result: { ok: boolean; message: string } | null }>({ loading: false, result: null });
  const [adbTest, setAdbTest] = useState<{ loading: boolean; result: { ok: boolean; message: string } | null }>({ loading: false, result: null });

  const [scheduledEarlyStartMin, setScheduledEarlyStartMin] = useState('30');

  const [monitoringConfig, setMonitoringConfig] = useState({
    grafana_url: 'https://graphana.aerogo24.com',
    prometheus_url: 'https://prometheus.aerogo24.com',
    grafana_admin_password: '',
  });
  const [showGrafanaPassword, setShowGrafanaPassword] = useState(false);
  const [monitoringSaving, setMonitoringSaving] = useState(false);

  const [telephony, setTelephony] = useState<{
    callsProvider: 'webrtc' | 'twilio_proxy';
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioProxyServiceSid: string;
    configured: boolean;
  }>({ callsProvider: 'webrtc', twilioAccountSid: '', twilioAuthToken: '', twilioProxyServiceSid: '', configured: false });
  const [telephonyInput, setTelephonyInput] = useState({ accountSid: '', authToken: '', proxySid: '' });
  const [telephonySaving, setTelephonySaving] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [testMode, smsRouting, mapsKeyData, creds, allSettings, paymentData, telephonyData] = await Promise.all([
        adminApi.getTestMode(),
        adminApi.getSmsRouting(),
        adminApi.getMapsKey(),
        adminApi.getCredentials(),
        adminApi.getSettings(),
        adminApi.getPaymentProviders(),
        adminApi.getTelephonyConfig(),
      ]);
      setTelephony(telephonyData);
      setAllSettingsRaw(allSettings);
      setConfig(testMode);
      setSmsRules(smsRouting.rules);
      setMapsKey((prev) => ({ ...prev, ...mapsKeyData }));
      setCredStatus(creds.status);
      setPaymentEnabled(paymentData.enabled);
      setPaymentCreds(paymentData.credentials);
      setPaymentSecurity({
        payment_max_recharge_amount: allSettings['payment_max_recharge_amount'] ?? '500000',
        withdrawal_min_amount:       allSettings['withdrawal_min_amount']       ?? '1000',
        withdrawal_max_amount:       allSettings['withdrawal_max_amount']       ?? '100000',
        withdrawal_max_daily_amount: allSettings['withdrawal_max_daily_amount'] ?? '200000',
        withdrawal_carence_hours:    allSettings['withdrawal_carence_hours']    ?? '24',
        backend_url:                 allSettings['backend_url']                 ?? 'https://aerocab-api.onrender.com',
      });
      setWorkflows({
        arrival: allSettings['workflow_arrival_enabled'] !== 'false',
        departure: allSettings['workflow_departure_enabled'] !== 'false',
        international: allSettings['workflow_international_enabled'] !== 'false',
      });
      setAccessPass({
        enabled:       allSettings['access_pass_enabled'] === 'true',
        price_fcfa:    allSettings['access_pass_price_fcfa']    ?? '2000',
        duration_days: allSettings['access_pass_duration_days'] ?? '30',
        trial_days:    allSettings['access_pass_trial_days']    ?? '7',
        grace_days:    allSettings['access_pass_grace_days']    ?? '2',
      });
      setRegistrationFee({
        enabled:     allSettings['feature_registration_fee_enabled'] === 'true',
        fee_min:     allSettings['registration_fee_min']         ?? '5000',
        fee_max:     allSettings['registration_fee_max']         ?? '10000',
        deposit_pct: allSettings['registration_fee_deposit_pct'] ?? '50',
      });
      setIntlSurcharge(allSettings['international_surcharge_percent'] ?? '0');
      setScheduledAdvanceMin(allSettings['dispatch_scheduled_advance_min'] ?? '60');
      setScheduledEarlyStartMin(allSettings['scheduled_early_start_min'] ?? '30');
      setFlightRadarToken(allSettings['flight_radar_token'] ?? '');
      setAerodataboxKey(allSettings['aerodatabox_api_key'] ?? '');
      setMonitoringConfig({
        grafana_url:            allSettings['grafana_url']             ?? 'https://graphana.aerogo24.com',
        prometheus_url:         allSettings['prometheus_url']          ?? 'https://prometheus.aerogo24.com',
        grafana_admin_password: allSettings['grafana_admin_password']  ?? '',
      });
      setEnabledPaymentMethods((allSettings['enabled_payment_methods'] ?? 'cash,card,wallet,points').split(',').filter(Boolean));
      setDirectPaymentMethods((allSettings['direct_payment_methods'] ?? 'cash').split(',').filter(Boolean));
      try {
        const g = JSON.parse(allSettings['daily_goals'] ?? '{}');
        setDailyGoals({ rides: String(g.rides ?? 5), earnings: String(g.earnings ?? 25000), rating: String(g.rating ?? 4.5) });
      } catch { /* keep defaults */ }
      setFinancialSettings({
        commission_rate: allSettings['commission_rate'] ?? '0.15',
        cashback_rate: allSettings['cashback_rate'] ?? '0.05',
        first_ride_bonus_points: allSettings['first_ride_bonus_points'] ?? '500',
        rating_bonus_points: allSettings['rating_bonus_points'] ?? '200',
        late_cancel_refund_rate: allSettings['late_cancel_refund_rate'] ?? '0.5',
        points_expiry_warning_days: allSettings['points_expiry_warning_days'] ?? '30',
        points_recharge_packages: (() => {
          try { return JSON.parse(allSettings['points_recharge_packages'] ?? '[1000,3000,5000,10000]').join(','); }
          catch { return '1000,3000,5000,10000'; }
        })(),
      });
      setAuthProviders({
        emailOtpEnabled: allSettings['auth_email_otp_enabled'] !== 'false',
        googleEnabled: allSettings['auth_google_enabled'] !== 'false',
        googleClientId: allSettings['auth_google_client_id'] ?? '',
        googleClientSecret: '',
      });
    } catch {
      showToast('error', 'Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Recalcule la config OTP (scopée au pays sélectionné, fallback global)
  // quand le pays change ou que les settings sont (re)chargés.
  useEffect(() => {
    const sfx = selected && selected !== 'GLOBAL' ? `:${selected}` : '';
    const getS = (k: string, d: string) => allSettingsRaw[`${k}${sfx}`] ?? allSettingsRaw[k] ?? d;
    const enabled = getS('otp_channels_enabled', 'sms,email').split(',').map((s) => s.trim());
    setOtpConfig({
      sms: enabled.includes('sms'),
      whatsapp: enabled.includes('whatsapp'),
      email: enabled.includes('email'),
      defaultChannel: getS('otp_default_channel', 'sms'),
      whatsappProvider: getS('whatsapp_provider', 'mock'),
      ultramsgInstance: getS('whatsapp_ultramsg_instance', ''),
      ultramsgToken: getS('whatsapp_ultramsg_token', ''),
    });
  }, [selected, allSettingsRaw]);

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

  const saveOtp = async () => {
    if (!otpConfig.sms && !otpConfig.whatsapp && !otpConfig.email) {
      showToast('error', 'Au moins un canal OTP doit être activé');
      return;
    }
    const sfx = selected && selected !== 'GLOBAL' ? `:${selected}` : '';
    const channelsCsv = ['sms', 'whatsapp', 'email'].filter((c) => (otpConfig as any)[c]).join(',');
    // Le canal par défaut doit faire partie des canaux activés
    const defaultChannel = channelsCsv.split(',').includes(otpConfig.defaultChannel)
      ? otpConfig.defaultChannel
      : channelsCsv.split(',')[0];
    setOtpSaving(true);
    try {
      await adminApi.setKey(`otp_channels_enabled${sfx}`, channelsCsv);
      await adminApi.setKey(`otp_default_channel${sfx}`, defaultChannel);
      await adminApi.setKey(`whatsapp_provider${sfx}`, otpConfig.whatsappProvider);
      await adminApi.setKey(`whatsapp_ultramsg_instance${sfx}`, otpConfig.ultramsgInstance);
      await adminApi.setKey(`whatsapp_ultramsg_token${sfx}`, otpConfig.ultramsgToken);
      // Reflète les valeurs sauvegardées dans le cache local des settings
      setAllSettingsRaw((prev) => ({
        ...prev,
        [`otp_channels_enabled${sfx}`]: channelsCsv,
        [`otp_default_channel${sfx}`]: defaultChannel,
        [`whatsapp_provider${sfx}`]: otpConfig.whatsappProvider,
        [`whatsapp_ultramsg_instance${sfx}`]: otpConfig.ultramsgInstance,
        [`whatsapp_ultramsg_token${sfx}`]: otpConfig.ultramsgToken,
      }));
      showToast('success', 'Canaux OTP mis à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde canaux OTP');
    } finally {
      setOtpSaving(false);
    }
  };

  const saveWorkflows = async () => {
    setWorkflowSaving(true);
    try {
      await Promise.all([
        adminApi.setSetting('workflow_arrival_enabled', String(workflows.arrival)),
        adminApi.setSetting('workflow_departure_enabled', String(workflows.departure)),
        adminApi.setSetting('workflow_international_enabled', String(workflows.international)),
        adminApi.setSetting('scheduled_early_start_min', scheduledEarlyStartMin),
      ]);
      showToast('success', 'Workflows mis à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde workflows');
    } finally {
      setWorkflowSaving(false);
    }
  };

  const saveFlightApiKeys = async () => {
    setFlightApiSaving(true);
    try {
      await Promise.all([
        adminApi.setSetting('flight_radar_token', flightRadarToken),
        adminApi.setSetting('aerodatabox_api_key', aerodataboxKey),
      ]);
      showToast('success', 'Clés API vols mises à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde');
    } finally {
      setFlightApiSaving(false);
    }
  };

  const savePaymentMethods = async () => {
    if (enabledPaymentMethods.length === 0) return showToast('error', 'Au moins un moyen de paiement doit être activé');
    setPaymentMethodsSaving(true);
    try {
      await Promise.all([
        adminApi.setSetting('enabled_payment_methods', enabledPaymentMethods.join(',')),
        adminApi.setSetting('direct_payment_methods', directPaymentMethods.join(',')),
      ]);
      showToast('success', 'Méthodes de paiement mises à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde');
    } finally {
      setPaymentMethodsSaving(false);
    }
  };

  const saveAccessPass = async () => {
    setAccessPassSaving(true);
    try {
      await Promise.all([
        adminApi.setSetting('access_pass_enabled',       String(accessPass.enabled)),
        adminApi.setSetting('access_pass_price_fcfa',    accessPass.price_fcfa),
        adminApi.setSetting('access_pass_duration_days', accessPass.duration_days),
        adminApi.setSetting('access_pass_trial_days',    accessPass.trial_days),
        adminApi.setSetting('access_pass_grace_days',    accessPass.grace_days),
      ]);
      showToast('success', 'Pass d\'accès mis à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde pass d\'accès');
    } finally {
      setAccessPassSaving(false);
    }
  };

  const saveRegistrationFee = async () => {
    const min = parseInt(registrationFee.fee_min, 10);
    const max = parseInt(registrationFee.fee_max, 10);
    const pct = parseInt(registrationFee.deposit_pct, 10);
    if (isNaN(min) || min < 0) { showToast('error', 'Montant minimum invalide'); return; }
    if (isNaN(max) || max < min) { showToast('error', 'Montant maximum doit être ≥ minimum'); return; }
    if (isNaN(pct) || pct < 0 || pct > 100) { showToast('error', 'Pourcentage dépôt invalide (0–100)'); return; }
    setRegistrationFeeSaving(true);
    try {
      await Promise.all([
        adminApi.setSetting('feature_registration_fee_enabled', String(registrationFee.enabled)),
        adminApi.setSetting('registration_fee_min',             registrationFee.fee_min),
        adminApi.setSetting('registration_fee_max',             registrationFee.fee_max),
        adminApi.setSetting('registration_fee_deposit_pct',     registrationFee.deposit_pct),
      ]);
      showToast('success', 'Frais d\'inscription mis à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde frais d\'inscription');
    } finally {
      setRegistrationFeeSaving(false);
    }
  };

  const saveDailyGoals = async () => {
    const rides    = parseInt(dailyGoals.rides, 10);
    const earnings = parseInt(dailyGoals.earnings, 10);
    const rating   = parseFloat(dailyGoals.rating);
    if (isNaN(rides) || rides < 1 || isNaN(earnings) || earnings < 0 || isNaN(rating) || rating < 0 || rating > 5) {
      showToast('error', 'Valeurs invalides (courses ≥ 1, gains ≥ 0, note 0–5)');
      return;
    }
    setDailyGoalsSaving(true);
    try {
      await Promise.all([
        adminApi.setSetting('daily_goals', JSON.stringify({ rides, earnings, rating })),
        adminApi.setSetting('dispatch_scheduled_advance_min', scheduledAdvanceMin),
      ]);
      showToast('success', 'Objectifs journaliers mis à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde objectifs');
    } finally {
      setDailyGoalsSaving(false);
    }
  };

  const saveFinancialSettings = async () => {
    const commission = parseFloat(financialSettings.commission_rate);
    const cashback = parseFloat(financialSettings.cashback_rate);
    const firstRide = parseInt(financialSettings.first_ride_bonus_points, 10);
    const ratingBonus = parseInt(financialSettings.rating_bonus_points, 10);
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
    if (isNaN(ratingBonus) || ratingBonus < 0) {
      showToast('error', 'Bonus notation invalide');
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
        adminApi.setSetting('rating_bonus_points', String(ratingBonus)),
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

  const saveAuthProviders = async () => {
    setAuthProvidersSaving(true);
    try {
      const promises: Promise<any>[] = [
        adminApi.setSetting('auth_email_otp_enabled', String(authProviders.emailOtpEnabled)),
        adminApi.setSetting('auth_google_enabled', String(authProviders.googleEnabled)),
        adminApi.setSetting('auth_google_client_id', authProviders.googleClientId),
      ];
      if (authProviders.googleClientSecret) {
        promises.push(adminApi.setSetting('auth_google_client_secret', authProviders.googleClientSecret));
      }
      await Promise.all(promises);
      setAuthProviders(prev => ({ ...prev, googleClientSecret: '' }));
      showToast('success', 'Fournisseurs d\'authentification sauvegardés');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde');
    } finally {
      setAuthProvidersSaving(false);
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

  const savePaymentProviders = async () => {
    const credentials: Record<string, string> = {};
    for (const [key, val] of Object.entries(paymentCredInput)) {
      if (val.trim()) credentials[key] = val.trim();
    }
    setPaymentSaving(true);
    try {
      await adminApi.setPaymentProviders({
        enabled: paymentEnabled,
        credentials: Object.keys(credentials).length ? credentials : undefined,
      });
      const fresh = await adminApi.getPaymentProviders();
      setPaymentEnabled(fresh.enabled);
      setPaymentCreds(fresh.credentials);
      setPaymentCredInput({});
      showToast('success', 'Fournisseurs de paiement mis à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde paiements');
    } finally {
      setPaymentSaving(false);
    }
  };

  const savePaymentSecurity = async () => {
    const maxRecharge = parseInt(paymentSecurity.payment_max_recharge_amount, 10);
    const minW = parseInt(paymentSecurity.withdrawal_min_amount, 10);
    const maxW = parseInt(paymentSecurity.withdrawal_max_amount, 10);
    const maxDaily = parseInt(paymentSecurity.withdrawal_max_daily_amount, 10);
    const carence = parseInt(paymentSecurity.withdrawal_carence_hours, 10);

    if (isNaN(maxRecharge) || maxRecharge < 1000) return showToast('error', 'Plafond recharge invalide (min 1000 FCFA)');
    if (isNaN(minW) || minW < 100)               return showToast('error', 'Montant min retrait invalide (min 100 FCFA)');
    if (isNaN(maxW) || maxW < minW)              return showToast('error', 'Montant max retrait doit être > montant min');
    if (isNaN(maxDaily) || maxDaily < maxW)      return showToast('error', 'Plafond journalier doit être ≥ montant max');
    if (isNaN(carence) || carence < 0)           return showToast('error', 'Délai carence invalide (0 = désactivé)');
    const backendUrl = paymentSecurity.backend_url.trim();
    if (!backendUrl.startsWith('http'))           return showToast('error', 'Backend URL invalide (doit commencer par http)');

    setPaymentSecuritySaving(true);
    try {
      await adminApi.setPaymentSecurity({
        payment_max_recharge_amount: String(maxRecharge),
        withdrawal_min_amount:       String(minW),
        withdrawal_max_amount:       String(maxW),
        withdrawal_max_daily_amount: String(maxDaily),
        withdrawal_carence_hours:    String(carence),
        backend_url:                 backendUrl,
      });
      showToast('success', 'Paramètres de sécurité paiements mis à jour');
    } catch (e: any) {
      showToast('error', e.message || 'Erreur sauvegarde');
    } finally {
      setPaymentSecuritySaving(false);
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

      {/* ── Section Canaux OTP (par pays) ───────────────────────────────────── */}
      <Section
        icon={MessageSquare}
        title="Canaux OTP"
        subtitle="Canaux de livraison du code OTP — scopés au pays sélectionné"
      >
        {/* Bannière pays */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-primary/5 border border-primary/15">
          <Globe className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs font-medium text-slate-600">
            Pays : <span className="font-semibold text-slate-800">{selected === 'GLOBAL' ? 'Global (tous pays)' : selected}</span>
          </p>
        </div>

        {/* Checkboxes canaux */}
        <FieldRow label="Canaux activés" hint="Au moins un canal doit être actif">
          <div className="flex items-center gap-4">
            {([
              { key: 'sms', label: 'SMS' },
              { key: 'whatsapp', label: 'WhatsApp' },
              { key: 'email', label: 'Email' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(otpConfig as any)[key]}
                  onChange={(e) => setOtpConfig((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                {label}
              </label>
            ))}
          </div>
        </FieldRow>

        {/* Canal par défaut */}
        <FieldRow label="Canal par défaut" hint="Canal utilisé en priorité parmi ceux activés">
          <Select
            value={otpConfig.defaultChannel}
            onChange={(v) => setOtpConfig((prev) => ({ ...prev, defaultChannel: v }))}
            options={['sms', 'whatsapp', 'email'].filter((c) => (otpConfig as any)[c])}
          />
        </FieldRow>

        {/* Provider WhatsApp */}
        <FieldRow label="Provider WhatsApp" hint="mock = simulé · ultramsg = envoi réel via Ultramsg">
          <Select
            value={otpConfig.whatsappProvider}
            onChange={(v) => setOtpConfig((prev) => ({ ...prev, whatsappProvider: v }))}
            options={['mock', 'ultramsg']}
          />
        </FieldRow>

        {/* Credentials Ultramsg */}
        {otpConfig.whatsappProvider === 'ultramsg' && (
          <>
            <FieldRow label="Ultramsg — Instance" hint="ID d'instance Ultramsg (ex: instance12345)">
              <input
                type="text"
                value={otpConfig.ultramsgInstance}
                onChange={(e) => setOtpConfig((prev) => ({ ...prev, ultramsgInstance: e.target.value }))}
                placeholder="instance12345"
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-64 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </FieldRow>
            <FieldRow label="Ultramsg — Token" hint="Jeton d'API Ultramsg">
              <input
                type="password"
                value={otpConfig.ultramsgToken}
                onChange={(e) => setOtpConfig((prev) => ({ ...prev, ultramsgToken: e.target.value }))}
                placeholder="••••••••••••"
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-64 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </FieldRow>
          </>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={saveOtp}
            disabled={otpSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50"
          >
            {otpSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {otpSaving ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
        </div>
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

      {/* ── Section Vols en temps réel ──────────────────────────────────────── */}
      <Section
        icon={Plane}
        title="Vols en temps réel"
        subtitle="Clés API pour le suivi des vols (FlightRadar24 et AeroDataBox)"
        collapsible
      >
        <div className="space-y-4">
          {/* FlightRadar24 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">FlightRadar24 — Token</label>
            <div className="relative">
              <input
                type={showFlightRadar ? 'text' : 'password'}
                value={flightRadarToken}
                onChange={e => setFlightRadarToken(e.target.value)}
                placeholder="Coller le token ici…"
                className="w-full font-mono text-sm border border-slate-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button onClick={() => setShowFlightRadar(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showFlightRadar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Récupérer sur flightradar24.com/account/api-access</p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={async () => {
                  setFr24Test({ loading: true, result: null });
                  try { setFr24Test({ loading: false, result: await adminApi.testFlightRadar24() }); }
                  catch { setFr24Test({ loading: false, result: { ok: false, message: 'Erreur réseau' } }); }
                }}
                disabled={fr24Test.loading}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                {fr24Test.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Tester la connexion
              </button>
              {fr24Test.result && (
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${fr24Test.result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {fr24Test.result.ok ? `✓ ${fr24Test.result.message}` : `✗ ${fr24Test.result.message}`}
                </span>
              )}
            </div>
          </div>

          {/* AeroDataBox */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">AeroDataBox — API Key</label>
            <div className="relative">
              <input
                type={showAerodatabox ? 'text' : 'password'}
                value={aerodataboxKey}
                onChange={e => setAerodataboxKey(e.target.value)}
                placeholder="Coller la clé ici…"
                className="w-full font-mono text-sm border border-slate-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button onClick={() => setShowAerodatabox(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showAerodatabox ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Récupérer sur rapidapi.com/aerodatabox</p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={async () => {
                  setAdbTest({ loading: true, result: null });
                  try { setAdbTest({ loading: false, result: await adminApi.testAeroDataBox() }); }
                  catch { setAdbTest({ loading: false, result: { ok: false, message: 'Erreur réseau' } }); }
                }}
                disabled={adbTest.loading}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                {adbTest.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Tester la connexion
              </button>
              {adbTest.result && (
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${adbTest.result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {adbTest.result.ok ? `✓ ${adbTest.result.message}` : `✗ ${adbTest.result.message}`}
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={saveFlightApiKeys}
              disabled={flightApiSaving}
              className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {flightApiSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {flightApiSaving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
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
          hint={config.testModeEnabled ? 'Mode test actif — code OTP fixé à ' + config.testOtpValue + ', mais l\'email est bien envoyé via ce provider' : 'Fournisseur pour les emails transactionnels'}
        >
          <div className="flex items-center gap-2">
            <Select
              value={config.emailProvider}
              onChange={(v) => update({ emailProvider: v })}
              options={config.availableEmailProviders}
            />
            <button
              onClick={async () => {
                try {
                  await adminApi.setEmailProvider(config.emailProvider);
                  showToast('success', 'Provider email mis à jour');
                } catch (e: any) {
                  showToast('error', e.message || 'Erreur sauvegarde');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              Enregistrer
            </button>
          </div>
        </FieldRow>

        <div className="mt-3 bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-600 mb-1">Providers disponibles</p>
          <p><span className="font-mono bg-white border border-slate-200 px-1 rounded">mock</span> — Log dans la console uniquement, aucun email envoyé</p>
          <p><span className="font-mono bg-white border border-slate-200 px-1 rounded">sendgrid</span> — SendGrid API — configurable ci-dessous ou via env SENDGRID_API_KEY</p>
          <p><span className="font-mono bg-white border border-slate-200 px-1 rounded">smtp</span> — SMTP classique — configurable ci-dessous (Gmail, OVH, etc.) ou via env SMTP_*</p>
        </div>
      </Section>

      {/* ── Section Fournisseurs d'authentification ──────────────────────────── */}
      <Section
        icon={LogIn}
        title="Authentification"
        subtitle="Méthodes de connexion disponibles pour les passagers"
        collapsible
      >
        <FieldRow label="Connexion par email + OTP" hint="Envoie un code à 6 chiffres par email">
          <Toggle
            checked={authProviders.emailOtpEnabled}
            onChange={(v) => setAuthProviders(prev => ({ ...prev, emailOtpEnabled: v }))}
          />
        </FieldRow>

        <FieldRow label="Connexion Google OAuth" hint="Les identifiants Google sont requis">
          <Toggle
            checked={authProviders.googleEnabled}
            onChange={(v) => setAuthProviders(prev => ({ ...prev, googleEnabled: v }))}
          />
        </FieldRow>

        {authProviders.googleEnabled && (
          <>
            <FieldRow label="Google Client ID" hint="OAuth 2.0 Client ID depuis Google Cloud Console">
              <input
                type="text"
                value={authProviders.googleClientId}
                onChange={(e) => setAuthProviders(prev => ({ ...prev, googleClientId: e.target.value }))}
                placeholder="xxxxx.apps.googleusercontent.com"
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-72 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </FieldRow>
            <FieldRow label="Google Client Secret" hint="Laisser vide pour conserver le secret actuel">
              <div className="flex items-center gap-2">
                <input
                  type={showGoogleSecret ? 'text' : 'password'}
                  value={authProviders.googleClientSecret}
                  onChange={(e) => setAuthProviders(prev => ({ ...prev, googleClientSecret: e.target.value }))}
                  placeholder="Nouveau secret (optionnel)"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-64 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button onClick={() => setShowGoogleSecret(v => !v)} className="text-slate-400 hover:text-slate-600">
                  {showGoogleSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FieldRow>
          </>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={saveAuthProviders}
            disabled={authProvidersSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {authProvidersSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
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
        subtitle="SendGrid ou SMTP pour les emails transactionnels"
        collapsible
      >
        <ProviderCredentials
          title="SendGrid"
          badge="Email API"
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
        <div className="mt-4 border-t border-slate-100 pt-4">
          <ProviderCredentials
            title="SMTP"
            badge="Email classique"
            badgeColor="slate"
            fields={SMTP_FIELDS}
            status={credStatus}
            values={credValues}
            visible={credVisible}
            saving={credSaving}
            onChangeValue={(k, v) => setCredValues((p) => ({ ...p, [k]: v }))}
            onToggleVisible={(k) => setCredVisible((p) => ({ ...p, [k]: !p[k] }))}
            onSave={() => saveCredentials(SMTP_FIELDS)}
          />
        </div>
      </Section>

      {/* ── Section Téléphonie ──────────────────────────────────────────────── */}
      <Section
        icon={PhoneCall}
        title="Téléphonie — Appels in-app"
        subtitle="Choisissez le mode d'appel entre passager et chauffeur"
      >
        {/* Provider toggle */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3">Mode d'appel</p>
          <div className="flex gap-3">
            {(['webrtc', 'twilio_proxy'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setTelephony(prev => ({ ...prev, callsProvider: p }))}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  telephony.callsProvider === p
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {p === 'webrtc' ? '📡 WebRTC (in-app)' : '📞 Numéro masqué (Twilio Proxy)'}
                {p === 'webrtc' && <span className="block text-xs font-normal mt-0.5 text-slate-400">VoIP, nécessite internet stable</span>}
                {p === 'twilio_proxy' && <span className="block text-xs font-normal mt-0.5 text-slate-400">GSM natif, fonctionne partout</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Credentials Twilio Proxy */}
        {telephony.callsProvider === 'twilio_proxy' && (
          <div className="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${telephony.configured ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {telephony.configured ? '✓ Configuré' : '⚠ Non configuré'}
              </span>
              <span className="text-xs text-slate-500">Les credentials SMS Twilio existants (Account SID / Auth Token) sont réutilisés si déjà configurés</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Account SID</label>
              <input
                type="text"
                placeholder={telephony.twilioAccountSid || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                value={telephonyInput.accountSid}
                onChange={e => setTelephonyInput(prev => ({ ...prev, accountSid: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {telephony.twilioAccountSid && <p className="text-xs text-slate-400 mt-0.5">Actuel : {telephony.twilioAccountSid}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Auth Token</label>
              <input
                type="password"
                placeholder={telephony.twilioAuthToken || '••••••••••••••••••••••••••••••••'}
                value={telephonyInput.authToken}
                onChange={e => setTelephonyInput(prev => ({ ...prev, authToken: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {telephony.twilioAuthToken && <p className="text-xs text-slate-400 mt-0.5">Actuel : {telephony.twilioAuthToken}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Proxy Service SID</label>
              <input
                type="text"
                placeholder="KSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={telephonyInput.proxySid}
                onChange={e => setTelephonyInput(prev => ({ ...prev, proxySid: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {telephony.twilioProxyServiceSid && <p className="text-xs text-slate-400 mt-0.5">Actuel : {telephony.twilioProxyServiceSid}</p>}
              <p className="text-xs text-slate-400 mt-1">
                Créer un Proxy Service sur <a href="https://console.twilio.com/us1/develop/proxy/services" target="_blank" rel="noreferrer" className="text-indigo-500 underline">console.twilio.com → Proxy</a> et copier le SID ici.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={async () => {
            setTelephonySaving(true);
            try {
              await adminApi.saveTelephonyConfig({
                callsProvider: telephony.callsProvider,
                ...(telephonyInput.accountSid  && { twilioAccountSid:      telephonyInput.accountSid }),
                ...(telephonyInput.authToken   && { twilioAuthToken:        telephonyInput.authToken }),
                ...(telephonyInput.proxySid    && { twilioProxyServiceSid:  telephonyInput.proxySid }),
              });
              const updated = await adminApi.getTelephonyConfig();
              setTelephony(updated);
              setTelephonyInput({ accountSid: '', authToken: '', proxySid: '' });
              showToast('success', 'Configuration téléphonie sauvegardée');
            } catch {
              showToast('error', 'Erreur lors de la sauvegarde');
            } finally {
              setTelephonySaving(false);
            }
          }}
          disabled={telephonySaving}
          className="mt-4 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
        >
          <Save size={15} />
          {telephonySaving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
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
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Démarrage anticipé réservation programmée (minutes)
            </label>
            <input
              type="number" min="0" max="120"
              className="w-40 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={scheduledEarlyStartMin}
              onChange={e => setScheduledEarlyStartMin(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">
              Le passager peut lancer sa course X min avant l'heure programmée. 0 = pas d'anticipation.
            </p>
          </div>
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

      {/* ── Section Pass d'accès passager ───────────────────────────────────── */}
      <Section
        icon={Ticket}
        title="Pass d'accès passager"
        subtitle="Abonnement périodique requis pour réserver — désactivé = accès libre"
      >
        <div className="space-y-4">
          {/* Activer / désactiver */}
          <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${accessPass.enabled ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
            <div>
              <p className={`text-sm font-semibold ${accessPass.enabled ? 'text-indigo-700' : 'text-slate-400'}`}>
                Pass d'accès {accessPass.enabled ? 'activé' : 'désactivé'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {accessPass.enabled
                  ? 'Les passagers doivent avoir un pass valide pour réserver'
                  : 'Accès libre — aucun pass requis pour réserver'}
              </p>
            </div>
            <Toggle
              checked={accessPass.enabled}
              onChange={(v) => setAccessPass((prev) => ({ ...prev, enabled: v }))}
              disabled={accessPassSaving}
            />
          </div>

          {/* Paramètres du pass */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Prix du pass <span className="text-slate-400 font-normal">(FCFA)</span>
              </label>
              <input
                type="number" min="0" step="100"
                value={accessPass.price_fcfa}
                onChange={(e) => setAccessPass((p) => ({ ...p, price_fcfa: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Durée <span className="text-slate-400 font-normal">(jours, ex: 30 = mensuel)</span>
              </label>
              <input
                type="number" min="1" step="1"
                value={accessPass.duration_days}
                onChange={(e) => setAccessPass((p) => ({ ...p, duration_days: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Essai gratuit <span className="text-slate-400 font-normal">(jours, 0 = pas d'essai)</span>
              </label>
              <input
                type="number" min="0" step="1"
                value={accessPass.trial_days}
                onChange={(e) => setAccessPass((p) => ({ ...p, trial_days: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Jours de grâce <span className="text-slate-400 font-normal">(après expiration)</span>
              </label>
              <input
                type="number" min="0" step="1"
                value={accessPass.grace_days}
                onChange={(e) => setAccessPass((p) => ({ ...p, grace_days: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 leading-relaxed">
            <strong>Logique :</strong> Nouveaux passagers → essai gratuit (trial_days). Après expiration → {accessPass.grace_days} jour(s) de grâce avant blocage complet. Prix payé via NotchPay (Orange Money / MTN).
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={saveAccessPass}
              disabled={accessPassSaving}
              className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {accessPassSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {accessPassSaving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Section>

      {/* ── Section Frais d'inscription chauffeur ───────────────────────────── */}
      <Section
        icon={DollarSign}
        title="Frais d'inscription chauffeur"
        subtitle="Paiement unique requis avant de prendre des courses — désactivé = accès libre"
      >
        <div className="space-y-4">
          {/* Toggle */}
          <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${registrationFee.enabled ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
            <div>
              <p className={`text-sm font-semibold ${registrationFee.enabled ? 'text-amber-700' : 'text-slate-400'}`}>
                Frais d'inscription {registrationFee.enabled ? 'activés' : 'désactivés'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {registrationFee.enabled
                  ? 'Les nouveaux chauffeurs doivent payer avant de pouvoir prendre des courses'
                  : 'Accès libre — aucun frais requis pour s\'inscrire'}
              </p>
            </div>
            <Toggle
              checked={registrationFee.enabled}
              onChange={(v) => setRegistrationFee((prev) => ({ ...prev, enabled: v }))}
              disabled={registrationFeeSaving}
            />
          </div>

          {/* Paramètres */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Montant min <span className="text-slate-400 font-normal">(FCFA)</span>
              </label>
              <input
                type="number" min="0" step="500"
                value={registrationFee.fee_min}
                onChange={(e) => setRegistrationFee((p) => ({ ...p, fee_min: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Montant max <span className="text-slate-400 font-normal">(FCFA)</span>
              </label>
              <input
                type="number" min="0" step="500"
                value={registrationFee.fee_max}
                onChange={(e) => setRegistrationFee((p) => ({ ...p, fee_max: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                % crédité au wallet <span className="text-slate-400 font-normal">(0–100)</span>
              </label>
              <input
                type="number" min="0" max="100" step="5"
                value={registrationFee.deposit_pct}
                onChange={(e) => setRegistrationFee((p) => ({ ...p, deposit_pct: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 leading-relaxed">
            <strong>Logique :</strong> Le chauffeur paie {registrationFee.fee_min} FCFA à l'inscription. {registrationFee.deposit_pct}% ({Math.round(parseInt(registrationFee.fee_min || '0') * parseInt(registrationFee.deposit_pct || '0') / 100)} FCFA) est crédité sur son wallet, le reste va en revenu plateforme.
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={saveRegistrationFee}
              disabled={registrationFeeSaving}
              className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {registrationFeeSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {registrationFeeSaving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Section>

      {/* ── Section Objectifs journaliers chauffeur ─────────────────────────── */}
      <Section
        icon={Route}
        title="Objectifs journaliers chauffeur"
        subtitle="Cibles de courses, revenus et note affichées sur l'app chauffeur chaque jour"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Courses / jour</label>
              <input type="number" min="1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={dailyGoals.rides}
                onChange={e => setDailyGoals(p => ({ ...p, rides: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Revenus cibles (FCFA)</label>
              <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={dailyGoals.earnings}
                onChange={e => setDailyGoals(p => ({ ...p, earnings: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Note minimale (0–5)</label>
              <input type="number" min="0" max="5" step="0.1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={dailyGoals.rating}
                onChange={e => setDailyGoals(p => ({ ...p, rating: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Avance dispatch réservations programmées (minutes)</label>
            <input type="number" min="10" max="480" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={scheduledAdvanceMin}
              onChange={e => setScheduledAdvanceMin(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">Le système cherche un chauffeur X minutes avant l'heure de départ programmée.</p>
          </div>
          <button
            onClick={saveDailyGoals}
            disabled={dailyGoalsSaving}
            className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {dailyGoalsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {dailyGoalsSaving ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
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
                Bonus notation ≥ 4★ (pts)
              </label>
              <input
                type="number" min="0" step="10"
                value={financialSettings.rating_bonus_points}
                onChange={e => setFinancialSettings(p => ({ ...p, rating_bonus_points: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-slate-400 mt-1">Points crédités au passager quand il note ≥ 4 étoiles un chauffeur</p>
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

      {/* ── Section Sécurité paiements ─────────────────────────────────────── */}
      <Section
        icon={ShieldCheck}
        title="Sécurité paiements"
        subtitle="Plafonds de recharge, limites de retrait, délai carence — actifs sans redéploiement"
        collapsible
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Plafond recharge (FCFA / transaction)
              </label>
              <input
                type="number" min="1000" step="1000"
                value={paymentSecurity.payment_max_recharge_amount}
                onChange={e => setPaymentSecurity(p => ({ ...p, payment_max_recharge_amount: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-slate-400 mt-1">Montant maximum qu'un passager peut recharger en une seule fois</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Délai carence recharge → retrait (heures)
                <span className="text-slate-400 ml-1 font-normal">(0 = désactivé)</span>
              </label>
              <input
                type="number" min="0" step="1"
                value={paymentSecurity.withdrawal_carence_hours}
                onChange={e => setPaymentSecurity(p => ({ ...p, withdrawal_carence_hours: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-slate-400 mt-1">Délai obligatoire entre une recharge et le premier retrait (anti-fraude)</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Retrait minimum (FCFA)</label>
              <input
                type="number" min="100" step="100"
                value={paymentSecurity.withdrawal_min_amount}
                onChange={e => setPaymentSecurity(p => ({ ...p, withdrawal_min_amount: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Retrait maximum / demande (FCFA)</label>
              <input
                type="number" min="1000" step="1000"
                value={paymentSecurity.withdrawal_max_amount}
                onChange={e => setPaymentSecurity(p => ({ ...p, withdrawal_max_amount: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Plafond journalier retrait (FCFA)</label>
              <input
                type="number" min="1000" step="1000"
                value={paymentSecurity.withdrawal_max_daily_amount}
                onChange={e => setPaymentSecurity(p => ({ ...p, withdrawal_max_daily_amount: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              URL publique du backend
              <span className="text-slate-400 ml-1 font-normal">(utilisée pour les callbacks webhooks de paiement)</span>
            </label>
            <input
              type="url"
              placeholder="https://aerocab-api.onrender.com"
              value={paymentSecurity.backend_url}
              onChange={e => setPaymentSecurity(p => ({ ...p, backend_url: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">
              Doit être accessible depuis Internet. Utilisée par NotchPay, CinetPay, Flutterwave… pour retourner les confirmations de paiement.
            </p>
          </div>

          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Règles actives</p>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>5 tentatives de recharge par minute par utilisateur (rate limit)</li>
                <li>Numéro de retrait doit correspondre au numéro du profil chauffeur</li>
                <li>1 seule demande de retrait en attente à la fois par chauffeur</li>
                <li>Signatures HMAC vérifiées sur tous les webhooks providers</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={savePaymentSecurity}
              disabled={paymentSecuritySaving}
              className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {paymentSecuritySaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {paymentSecuritySaving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Section>

      {/* ── Section Méthodes de paiement actives ────────────────────────────── */}
      <Section
        icon={ToggleLeft}
        title="Méthodes de paiement actives"
        subtitle="Contrôlez quelles méthodes sont proposées lors d'une réservation"
      >
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Méthodes disponibles à la réservation</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PAYMENT_METHODS.map(method => (
                <label key={method} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${enabledPaymentMethods.includes(method) ? 'bg-primary/5 border-primary/30' : 'bg-slate-50 border-slate-200'}`}>
                  <input
                    type="checkbox"
                    checked={enabledPaymentMethods.includes(method)}
                    onChange={e => {
                      setEnabledPaymentMethods(prev =>
                        e.target.checked ? [...prev, method] : prev.filter(m => m !== method)
                      );
                    }}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-medium text-slate-700">{PAYMENT_METHOD_LABELS[method]}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Paiements directs (sans passerelle)</p>
            <p className="text-xs text-slate-400 mb-3">Ces méthodes sont traitées directement sans passer par une passerelle de paiement.</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PAYMENT_METHODS.map(method => (
                <label key={method} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${directPaymentMethods.includes(method) ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                  <input
                    type="checkbox"
                    checked={directPaymentMethods.includes(method)}
                    onChange={e => {
                      setDirectPaymentMethods(prev =>
                        e.target.checked ? [...prev, method] : prev.filter(m => m !== method)
                      );
                    }}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{PAYMENT_METHOD_LABELS[method]}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={savePaymentMethods}
              disabled={paymentMethodsSaving}
              className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {paymentMethodsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {paymentMethodsSaving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Section>

      {/* ── Section Moyens de paiement ─────────────────────────────────────── */}
      <Section
        icon={CreditCard}
        title="Moyens de paiement"
        subtitle="Activer / désactiver chaque fournisseur et configurer les clés API"
        collapsible
      >
        <div className="space-y-4">
          {selected === 'GLOBAL' ? (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
              <Globe className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
              <span>Édition des paiements globaux (défaut appliqué à tous les pays).</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
              <span>
                Pays sélectionné : <strong>{selected}</strong>. Les credentials de paiement
                restent pour l'instant <strong>globaux</strong> — l'édition par pays
                (<code>clé:{selected}</code>) nécessite une évolution backend de l'endpoint{' '}
                <code>PUT /admin/settings/payment-providers</code> (paramètre <code>?country=</code>).
              </span>
            </div>
          )}
          {PAYMENT_PROVIDERS_CONFIG.map((p) => {
            const isEnabled = paymentEnabled[p.id] ?? true;
            const provCreds = p.credKeys.map((k) => ({
              key: k,
              ...paymentCreds[k] ?? { label: k, configured: false },
            }));
            const allConfigured = provCreds.every((c) => c.configured);

            return (
              <div key={p.id} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{p.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.color}`}>{p.badge}</span>
                    <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                      allConfigured ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {allConfigured ? 'Configuré' : 'Non configuré'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${isEnabled ? 'text-green-600' : 'text-slate-400'}`}>
                      {isEnabled ? 'Activé' : 'Désactivé'}
                    </span>
                    <Toggle
                      checked={isEnabled}
                      onChange={(v) => setPaymentEnabled((prev) => ({ ...prev, [p.id]: v }))}
                      disabled={paymentSaving}
                    />
                  </div>
                </div>

                {/* Credential fields */}
                <div className="px-4 py-3 space-y-2">
                  {provCreds.map((c) => (
                    <div key={c.key} className="flex items-center gap-2">
                      <div className="w-40 shrink-0">
                        <p className="text-xs font-medium text-slate-600">{c.label}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-1">
                        {c.configured && !paymentCredInput[c.key] ? (
                          <span className="flex-1 text-xs font-mono bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg">
                            {c.maskedValue ?? '••••••••••••  (configuré)'}
                          </span>
                        ) : (
                          <div className="relative flex-1">
                            <input
                              type={paymentCredVisible[c.key] ? 'text' : 'password'}
                              value={paymentCredInput[c.key] ?? ''}
                              onChange={(e) => setPaymentCredInput((prev) => ({ ...prev, [c.key]: e.target.value }))}
                              placeholder={c.configured ? '(laisser vide pour conserver)' : 'Nouvelle valeur…'}
                              className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <button
                              onClick={() => setPaymentCredVisible((prev) => ({ ...prev, [c.key]: !prev[c.key] }))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {paymentCredVisible[c.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                        {c.configured && !paymentCredInput[c.key] && (
                          <button
                            onClick={() => setPaymentCredInput((prev) => ({ ...prev, [c.key]: '' }))}
                            className="text-xs text-slate-400 hover:text-slate-600 underline whitespace-nowrap"
                          >
                            Modifier
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Bouton test connexion EdoctorPay */}
                  {p.id === 'edoctor' && allConfigured && (
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        onClick={async () => {
                          setEdoctorTest({ loading: true, result: null });
                          try {
                            const r = await adminApi.testEdoctorConnection();
                            setEdoctorTest({ loading: false, result: r });
                          } catch {
                            setEdoctorTest({ loading: false, result: { ok: false, message: 'Erreur réseau' } });
                          }
                        }}
                        disabled={edoctorTest.loading}
                        className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 transition-colors"
                      >
                        {edoctorTest.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Tester la connexion
                      </button>
                      {edoctorTest.result && (
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                          edoctorTest.result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {edoctorTest.result.ok ? `✓ ${edoctorTest.result.message}` : `✗ ${edoctorTest.result.message}`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-2">
            <button
              onClick={savePaymentProviders}
              disabled={paymentSaving}
              className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {paymentSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {paymentSaving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Section>

      {/* ── Section Bot assistant ──────────────────────────────────────────── */}
      <BotPanel />

      {/* ── Section Documents chauffeur ────────────────────────────────────── */}
      <DriverDocumentsPanel />

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

      {/* ── Section Monitoring ───────────────────────────────────────────────── */}
      <Section
        icon={BarChart3}
        title="Monitoring (Grafana & Prometheus)"
        subtitle="URLs et accès aux outils de surveillance de l'infrastructure"
        collapsible
      >
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">URL Grafana</label>
            <input
              type="url"
              value={monitoringConfig.grafana_url}
              onChange={e => setMonitoringConfig(p => ({ ...p, grafana_url: e.target.value }))}
              placeholder="https://graphana.aerogo24.com"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-slate-400 mt-1">Utilisé dans la page Métriques pour les iframes et liens</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">URL Prometheus</label>
            <input
              type="url"
              value={monitoringConfig.prometheus_url}
              onChange={e => setMonitoringConfig(p => ({ ...p, prometheus_url: e.target.value }))}
              placeholder="https://prometheus.aerogo24.com"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-slate-400 mt-1">Utilisé pour les liens de requêtes rapides Prometheus</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Mot de passe admin Grafana</label>
            <div className="relative">
              <input
                type={showGrafanaPassword ? 'text' : 'password'}
                value={monitoringConfig.grafana_admin_password}
                onChange={e => setMonitoringConfig(p => ({ ...p, grafana_admin_password: e.target.value }))}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={() => setShowGrafanaPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showGrafanaPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Stocké en base — utilisé pour référence uniquement, ne change pas le mot de passe Grafana</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={async () => {
                setMonitoringSaving(true);
                try {
                  await Promise.all([
                    adminApi.setSetting('grafana_url',            monitoringConfig.grafana_url),
                    adminApi.setSetting('prometheus_url',         monitoringConfig.prometheus_url),
                    adminApi.setSetting('grafana_admin_password', monitoringConfig.grafana_admin_password),
                  ]);
                  showToast('success', 'Configuration monitoring sauvegardée');
                } catch { showToast('error', 'Erreur lors de la sauvegarde'); }
                finally { setMonitoringSaving(false); }
              }}
              disabled={monitoringSaving}
              className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {monitoringSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {monitoringSaving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
            <a
              href={monitoringConfig.grafana_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"
            >
              <Activity className="w-4 h-4" />
              Ouvrir Grafana
            </a>
          </div>
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
  const allConfigured = fields.filter(f => !f.optional && f.key !== 'at_sender_id' && f.key !== 'sendgrid_from_email').every(f => status[f.key]);
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
                    type={f.isPublic || visible[f.key] ? 'text' : 'password'}
                    value={values[f.key] ?? ''}
                    onChange={(e) => onChangeValue(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {!f.isPublic && (
                    <button
                      onClick={() => onToggleVisible(f.key)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {visible[f.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
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

// ─── Bot Panel ────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, { label: string; badge: string; color: string; placeholder: string }> = {
  claude: { label: 'Claude (Anthropic)', badge: 'Anthropic', color: 'bg-orange-100 text-orange-700', placeholder: 'sk-ant-api03-…'  },
  openai: { label: 'ChatGPT (OpenAI)',   badge: 'OpenAI',    color: 'bg-green-100 text-green-700',   placeholder: 'sk-proj-…'       },
  zhipu:  { label: 'GLM (ZhipuAI)',      badge: 'ZhipuAI',   color: 'bg-blue-100 text-blue-700',     placeholder: 'votre-clé-zhipu' },
  gemini: { label: 'Gemini (Google)',     badge: 'Google',    color: 'bg-sky-100 text-sky-700',       placeholder: 'AIzaSy…'         },
};

const MODEL_DEFAULTS: Record<string, string> = {
  claude:  'claude-haiku-4-5-20251001',
  openai:  'gpt-4o-mini',
  zhipu:   'glm-4-flash',
  gemini:  'gemini-2.5-flash',
};

export function BotPanel() {
  const [state, setState] = useState({
    enabled:      false,
    provider:     'claude',
    model:        MODEL_DEFAULTS.claude,
    maxTokens:    500,
    systemPrompt: '',
  });
  const [keys, setKeys] = useState({ claude: '', openai: '', zhipu: '', gemini: '' });
  const [keyStatus, setKeyStatus] = useState({ claude: false, openai: false, zhipu: false, gemini: false });
  const [keyMasked, setKeyMasked] = useState({ claude: '', openai: '', zhipu: '', gemini: '' });
  const [showKey, setShowKey] = useState({ claude: false, openai: false, zhipu: false, gemini: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getBotSettings().then(d => {
      setState({
        enabled:      d.enabled,
        provider:     d.provider,
        model:        d.model,
        maxTokens:    d.maxTokens,
        systemPrompt: d.systemPrompt,
      });
      setKeyStatus({ claude: d.claudeKey.configured, openai: d.openaiKey.configured, zhipu: d.zhipuKey.configured, gemini: d.geminiKey?.configured ?? false });
      setKeyMasked({ claude: d.claudeKey.masked, openai: d.openaiKey.masked, zhipu: d.zhipuKey.masked, gemini: d.geminiKey?.masked ?? '' });
    }).finally(() => setLoading(false));
  }, []);

  const handleProviderChange = (p: string) => {
    setState(s => ({ ...s, provider: p, model: MODEL_DEFAULTS[p] ?? s.model }));
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await adminApi.setBotSettings({
        enabled:      state.enabled,
        provider:     state.provider,
        model:        state.model,
        maxTokens:    state.maxTokens,
        systemPrompt: state.systemPrompt,
        ...(keys.claude  ? { claudeApiKey: keys.claude  } : {}),
        ...(keys.openai  ? { openaiApiKey: keys.openai  } : {}),
        ...(keys.zhipu   ? { zhipuApiKey:  keys.zhipu   } : {}),
        ...(keys.gemini  ? { geminiApiKey: keys.gemini  } : {}),
      });
      setSaved(true);
      setKeys({ claude: '', openai: '', zhipu: '', gemini: '' });
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const activeProvider = state.provider;
  const pInfo = PROVIDER_LABELS[activeProvider] ?? PROVIDER_LABELS['claude'];

  return (
    <Section icon={MessageSquare} title="Bot assistant IA" subtitle="Configurez le fournisseur IA et les clés API — actif sans redéploiement" collapsible>
      <div className="space-y-5">

        {/* Enable toggle */}
        <FieldRow label="Activer le bot" hint="Les utilisateurs peuvent poser des questions depuis l'app passager">
          <Toggle checked={state.enabled} onChange={v => setState(s => ({ ...s, enabled: v }))} />
        </FieldRow>

        {/* Provider selector */}
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Fournisseur IA actif</p>
          <div className="grid grid-cols-4 gap-3">
            {(['claude', 'openai', 'zhipu', 'gemini'] as const).map(p => {
              const info = PROVIDER_LABELS[p];
              const configured = keyStatus[p];
              const active = state.provider === p;
              return (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                    active ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-semibold text-slate-800">{info.label}</span>
                    {active && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${info.color}`}>{info.badge}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${configured ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {configured ? '✓ Clé configurée' : 'Clé manquante'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* API Keys — show all three for easy config */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-600">Clés API</p>
          {(['claude', 'openai', 'zhipu', 'gemini'] as const).map(p => {
            const info = PROVIDER_LABELS[p];
            const configured = keyStatus[p];
            const masked = keyMasked[p];
            const current = keys[p];
            const visible = showKey[p];
            return (
              <div key={p} className={`rounded-xl border p-3 space-y-2 ${state.provider === p ? 'border-primary/40 bg-primary/3' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">{info.label}</span>
                  {state.provider === p && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Actif</span>}
                  {configured && !current && (
                    <span className="ml-auto text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{masked}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={visible ? 'text' : 'password'}
                    value={current}
                    onChange={e => setKeys(k => ({ ...k, [p]: e.target.value }))}
                    placeholder={configured ? '(laisser vide pour conserver)' : info.placeholder}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={() => setShowKey(v => ({ ...v, [p]: !v[p] }))}
                    className="p-2 text-slate-400 hover:text-slate-600"
                  >
                    {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Model + max tokens */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Modèle
              <span className="text-slate-400 ml-1 font-normal">({pInfo.label})</span>
            </label>
            <input
              type="text"
              value={state.model}
              onChange={e => setState(s => ({ ...s, model: e.target.value }))}
              placeholder={MODEL_DEFAULTS[activeProvider]}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-slate-400 mt-1">
              {activeProvider === 'claude'  && 'Ex : claude-haiku-4-5-20251001, claude-sonnet-4-6'}
              {activeProvider === 'openai'  && 'Ex : gpt-4o-mini, gpt-4o, gpt-4-turbo'}
              {activeProvider === 'zhipu'   && 'Ex : glm-4-flash, glm-4-plus, glm-4-air'}
              {activeProvider === 'gemini'  && 'Ex : gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Max tokens <span className="text-slate-400 font-normal">(50–4096)</span>
            </label>
            <input
              type="number"
              min={50} max={4096} step={50}
              value={state.maxTokens}
              onChange={e => setState(s => ({ ...s, maxTokens: parseInt(e.target.value) || 500 }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* System prompt */}
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            System prompt <span className="text-slate-400 font-normal">(personnalise le comportement du bot)</span>
          </label>
          <textarea
            rows={4}
            value={state.systemPrompt}
            onChange={e => setState(s => ({ ...s, systemPrompt: e.target.value }))}
            placeholder="Tu es l'assistant AeroCab. Réponds en français, de façon concise et amicale…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">Le contexte utilisateur (solde, course en cours, points) est automatiquement ajouté.</p>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Enregistrer'}
          </button>
          {!keyStatus[activeProvider] && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Clé API manquante pour {pInfo.label}
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

// ─── Driver Documents Panel ───────────────────────────────────────────────────

type DocConfig = DocConfigItem;

const VALID_EXTENSIONS = ['jpg', 'png', 'pdf', 'heic', 'webp'];

export function DriverDocumentsPanel() {
  const [docs, setDocs] = useState<DocConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([adminApi.getDriverDocumentConfig(), adminApi.getAllDocumentTypes()])
      .then(([cfg, all]) => {
        const savedMap: Record<string, DocConfig> = {};
        cfg.documents.forEach(d => { savedMap[d.type] = d; });
        const merged = all.defaults.map(d => ({
          ...d,
          ...(savedMap[d.type] ?? {}),
          acceptedExtensions: savedMap[d.type]?.acceptedExtensions ?? d.acceptedExtensions ?? ['jpg','png','pdf'],
          description: savedMap[d.type]?.description ?? d.description ?? '',
        }));
        setDocs(merged);
      })
      .catch(() => setError('Impossible de charger la configuration'))
      .then(() => setLoading(false), () => setLoading(false));
  }, []);

  const toggle = (type: string, field: 'enabled' | 'required', value: boolean) => {
    setDocs(prev => prev.map(d => {
      if (d.type !== type) return d;
      if (field === 'required' && value) return { ...d, required: true, enabled: true };
      if (field === 'enabled' && !value) return { ...d, enabled: false, required: false };
      return { ...d, [field]: value };
    }));
    setSaved(false);
  };

  const setDescription = (type: string, value: string) => {
    setDocs(prev => prev.map(d => d.type === type ? { ...d, description: value } : d));
    setSaved(false);
  };

  const toggleExt = (type: string, ext: string) => {
    setDocs(prev => prev.map(d => {
      if (d.type !== type) return d;
      const exts = d.acceptedExtensions ?? ['jpg','png','pdf'];
      const next = exts.includes(ext) ? exts.filter(e => e !== ext) : [...exts, ext];
      return { ...d, acceptedExtensions: next.length > 0 ? next : exts };
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const res = await adminApi.setDriverDocumentConfig(docs.filter(d => d.enabled));
      // Re-merge to ensure all types shown
      setDocs(prev => prev.map(d => {
        const saved = res.documents.find(r => r.type === d.type);
        return saved ?? { ...d, enabled: false, required: false };
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Erreur sauvegarde');
    } finally { setSaving(false); }
  };

  const CATEGORIES = [
    { label: 'Identité', types: ['cni_front', 'cni_back', 'passport', 'portrait'] },
    { label: 'Véhicule', types: ['registration', 'vehicle_photo', 'insurance', 'technical_control'] },
    { label: 'Conduite', types: ['license', 'vtc_license', 'criminal_record'] },
    { label: 'Domicile & Santé', types: ['proof_of_address', 'medical_certificate', 'vaccination_card', 'border_pass'] },
  ];

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Chargement…</div>;

  return (
    <Section title="Documents chauffeur" subtitle="Définissez quels documents sont requis ou facultatifs" icon={FileText}>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <div className="space-y-6 mt-2">
        {CATEGORIES.map(cat => {
          const catDocs = docs.filter(d => cat.types.includes(d.type));
          return (
            <div key={cat.label}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{cat.label}</p>
              <div className="space-y-2">
                {catDocs.map(doc => (
                  <div key={doc.type} className={`rounded-xl border transition-all ${
                    doc.enabled
                      ? doc.required ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
                      : 'border-gray-100 bg-gray-50'
                  }`}>
                    {/* Ligne principale */}
                    <div className="flex items-center gap-4 px-4 py-3">
                      <Toggle checked={doc.enabled} onChange={v => toggle(doc.type, 'enabled', v)} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${doc.enabled ? 'text-gray-900' : 'text-gray-400'}`}>{doc.label}</p>
                        <p className="text-xs text-gray-400 font-mono">{doc.type}</p>
                      </div>
                      {doc.enabled && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${doc.required ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {doc.required ? 'Obligatoire' : 'Facultatif'}
                        </span>
                      )}
                      {doc.enabled && (
                        <button
                          onClick={() => toggle(doc.type, 'required', !doc.required)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex-shrink-0 ${
                            doc.required ? 'border-red-300 text-red-600 hover:bg-red-100' : 'border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
                          }`}
                        >
                          {doc.required ? 'Facultatif' : 'Obligatoire'}
                        </button>
                      )}
                    </div>
                    {/* Champs édition (si activé) */}
                    {doc.enabled && (
                      <div className="px-4 pb-3 space-y-2 border-t border-white/60 pt-2">
                        {/* Description */}
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">Description (visible dans l'app)</label>
                          <input
                            type="text"
                            value={doc.description ?? ''}
                            onChange={e => setDescription(doc.type, e.target.value)}
                            placeholder="Ex: Face avant de votre carte nationale"
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                          />
                        </div>
                        {/* Extensions acceptées */}
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">Formats acceptés</label>
                          <div className="flex gap-2 flex-wrap">
                            {VALID_EXTENSIONS.map(ext => {
                              const active = (doc.acceptedExtensions ?? ['jpg','png','pdf']).includes(ext);
                              return (
                                <button
                                  key={ext}
                                  onClick={() => toggleExt(doc.type, ext)}
                                  className={`text-xs font-bold px-3 py-1 rounded-full border transition-all uppercase ${
                                    active
                                      ? 'bg-primary text-white border-primary'
                                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                                  }`}
                                >
                                  {ext}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
        </button>
        <p className="text-xs text-gray-400">
          {docs.filter(d => d.enabled && d.required).length} obligatoire(s) ·{' '}
          {docs.filter(d => d.enabled && !d.required).length} facultatif(s)
        </p>
      </div>
    </Section>
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
