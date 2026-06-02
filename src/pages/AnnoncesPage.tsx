import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Megaphone,
  Tag,
  Info,
  Image as ImageIcon,
  Trash2,
  Pencil,
  X,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { adminApi } from '../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

type AnnouncementType = 'promo' | 'info' | 'ad';
type AnnouncementPriority = 'high' | 'normal';
type CtaType = 'none' | 'screen' | 'promo_code';
type TargetApp = 'passenger' | 'driver';
type TargetTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  body?: string;
  imageUrl?: string;
  priority?: AnnouncementPriority;
  ctaType?: CtaType;
  ctaValue?: string;
  ctaLabel?: string;
  targetApps?: TargetApp[];
  targetCountries?: string[];
  targetTiers?: TargetTier[];
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
}

interface EditorState {
  type: AnnouncementType;
  title: string;
  body: string;
  imageUrl: string;
  priority: AnnouncementPriority;
  ctaType: CtaType;
  ctaValue: string;
  ctaLabel: string;
  targetApps: TargetApp[];
  targetCountries: string[];
  targetTiers: TargetTier[];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const EMPTY_EDITOR: EditorState = {
  type: 'info',
  title: '',
  body: '',
  imageUrl: '',
  priority: 'normal',
  ctaType: 'none',
  ctaValue: '',
  ctaLabel: '',
  targetApps: [],
  targetCountries: [],
  targetTiers: [],
  startsAt: '',
  endsAt: '',
  isActive: true,
};

const TYPE_META: Record<AnnouncementType, { label: string; color: string; icon: any }> = {
  promo: { label: 'Promo', color: 'text-orange-700 bg-orange-50 border-orange-100', icon: Tag },
  info: { label: 'Info', color: 'text-blue-700 bg-blue-50 border-blue-100', icon: Info },
  ad: { label: 'Pub', color: 'text-purple-700 bg-purple-50 border-purple-100', icon: ImageIcon },
};

const ALL_APPS: { id: TargetApp; label: string }[] = [
  { id: 'passenger', label: 'Passager' },
  { id: 'driver', label: 'Chauffeur' },
];

const ALL_TIERS: { id: TargetTier; label: string }[] = [
  { id: 'bronze', label: 'Bronze' },
  { id: 'silver', label: 'Silver' },
  { id: 'gold', label: 'Gold' },
  { id: 'platinum', label: 'Platinum' },
];

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });
} catch {
  regionNames = null;
}
function countryLabel(code: string): string {
  try {
    return regionNames?.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

// ─── Editor sub-component ────────────────────────────────────────────────────

function MultiToggle<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { id: T; label: string }[];
  selected: T[];
  onToggle: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.id);
        return (
          <button
            type="button"
            key={opt.id}
            onClick={() => onToggle(opt.id)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              active
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function AnnouncementEditor({
  initial,
  editingId,
  countries,
  onClose,
  onSaved,
  onError,
}: {
  initial: EditorState;
  editingId: string | null;
  countries: string[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<EditorState>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const patch = (p: Partial<EditorState>) => setForm((f) => ({ ...f, ...p }));

  const toggleInArray = <T extends string>(key: 'targetApps' | 'targetTiers' | 'targetCountries', value: T) => {
    setForm((f) => {
      const arr = f[key] as T[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...f, [key]: next };
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await adminApi.uploadTicketImage(file);
      patch({ imageUrl: url });
    } catch {
      onError('Échec de l\'upload de l\'image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      onError('Le titre est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        type: form.type,
        title: form.title.trim(),
        body: form.body.trim() || undefined,
        imageUrl: form.imageUrl || undefined,
        priority: form.priority,
        ctaType: form.ctaType,
        ctaValue: form.ctaType === 'none' ? undefined : form.ctaValue.trim() || undefined,
        ctaLabel: form.ctaType === 'none' ? undefined : form.ctaLabel.trim() || undefined,
        targetApps: form.targetApps,
        targetCountries: form.targetCountries,
        targetTiers: form.targetTiers,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        isActive: form.isActive,
      };
      if (editingId) {
        await adminApi.updateAnnouncement(editingId, payload);
        onSaved('Annonce mise à jour');
      } else {
        await adminApi.createAnnouncement(payload);
        onSaved('Annonce créée');
      }
    } catch (err: any) {
      onError(err?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const PreviewIcon = TYPE_META[form.type].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/30">
      <div className="w-full max-w-3xl bg-slate-50 h-full overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            {editingId ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* ── Fields ── */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              {/* Type + priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => patch({ type: e.target.value as AnnouncementType })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="promo">Promo</option>
                    <option value="info">Info</option>
                    <option value="ad">Publicité</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Priorité</label>
                  <select
                    value={form.priority}
                    onChange={(e) => patch({ priority: e.target.value as AnnouncementPriority })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="high">Haute</option>
                    <option value="normal">Normale</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Titre *</label>
                <input
                  value={form.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  maxLength={120}
                  placeholder="Titre de l'annonce"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contenu</label>
                <textarea
                  value={form.body}
                  onChange={(e) => patch({ body: e.target.value })}
                  rows={4}
                  placeholder="Message affiché aux utilisateurs"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                />
              </div>

              {/* Image */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Image</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors">
                    {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    {uploading ? 'Upload…' : 'Choisir une image'}
                    <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                  </label>
                  {form.imageUrl && (
                    <>
                      <img src={form.imageUrl} alt="aperçu" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => patch({ imageUrl: '' })}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Retirer
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <p className="text-sm font-semibold text-slate-700">Bouton d'action (CTA)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type de CTA</label>
                  <select
                    value={form.ctaType}
                    onChange={(e) => patch({ ctaType: e.target.value as CtaType })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="none">Aucun</option>
                    <option value="screen">Écran in-app</option>
                    <option value="promo_code">Code promo</option>
                  </select>
                </div>
                {form.ctaType !== 'none' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Libellé du bouton</label>
                    <input
                      value={form.ctaLabel}
                      onChange={(e) => patch({ ctaLabel: e.target.value })}
                      placeholder="Ex: Profiter de l'offre"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                )}
              </div>
              {form.ctaType === 'screen' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Route in-app</label>
                  <input
                    value={form.ctaValue}
                    onChange={(e) => patch({ ctaValue: e.target.value })}
                    placeholder="Ex: /promos"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              {form.ctaType === 'promo_code' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Code promo</label>
                  <input
                    value={form.ctaValue}
                    onChange={(e) => patch({ ctaValue: e.target.value.toUpperCase() })}
                    placeholder="Ex: PROMO50"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
            </div>

            {/* Targeting */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <p className="text-sm font-semibold text-slate-700">
                Ciblage <span className="text-xs font-normal text-slate-400">(vide = tous)</span>
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Applications</label>
                <MultiToggle options={ALL_APPS} selected={form.targetApps} onToggle={(id) => toggleInArray('targetApps', id)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Pays</label>
                {countries.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucun pays disponible</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {countries.map((code) => {
                      const active = form.targetCountries.includes(code);
                      return (
                        <button
                          type="button"
                          key={code}
                          onClick={() => toggleInArray('targetCountries', code)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                            active
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {countryLabel(code)} <span className="opacity-60">({code})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Niveaux fidélité</label>
                <MultiToggle options={ALL_TIERS} selected={form.targetTiers} onToggle={(id) => toggleInArray('targetTiers', id)} />
              </div>
            </div>

            {/* Scheduling */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <p className="text-sm font-semibold text-slate-700">Planification</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Début (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => patch({ startsAt: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fin (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => patch({ endsAt: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => patch({ isActive: e.target.checked })}
                  className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>

          {/* ── Live preview ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Aperçu</p>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="aperçu" className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-slate-300">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${TYPE_META[form.type].color}`}>
                    <PreviewIcon className="w-3 h-3" />
                    {TYPE_META[form.type].label}
                  </span>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">
                    {form.title || 'Titre de l\'annonce'}
                  </h3>
                  {form.body && <p className="text-sm text-slate-500 whitespace-pre-line">{form.body}</p>}
                  {form.ctaType !== 'none' && (
                    <button
                      type="button"
                      className="mt-2 w-full text-sm font-semibold text-white bg-primary rounded-lg py-2 hover:bg-primary/90"
                    >
                      {form.ctaLabel || 'En savoir plus'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function toLocalDatetime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function targetSummary(a: Announcement): string {
  const parts: string[] = [];
  parts.push(a.targetApps && a.targetApps.length ? a.targetApps.map((x) => (x === 'passenger' ? 'Passager' : 'Chauffeur')).join(', ') : 'Toutes apps');
  parts.push(a.targetCountries && a.targetCountries.length ? a.targetCountries.join(', ') : 'Tous pays');
  if (a.targetTiers && a.targetTiers.length) parts.push(a.targetTiers.join(', '));
  return parts.join(' · ');
}

const VERSION_FIELDS = [
  { side: 'Passager', keys: ['min_version_passenger', 'latest_version_passenger', 'apk_url_passenger'] },
  { side: 'Chauffeur', keys: ['min_version_driver', 'latest_version_driver', 'apk_url_driver'] },
] as const;

const VERSION_LABELS: Record<string, string> = {
  min_version_passenger: 'Version minimale',
  latest_version_passenger: 'Dernière version',
  apk_url_passenger: 'URL APK',
  min_version_driver: 'Version minimale',
  latest_version_driver: 'Dernière version',
  apk_url_driver: 'URL APK',
};

export function AnnoncesPage() {
  const [tab, setTab] = useState<'annonces' | 'version'>('annonces');

  // Annonces state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<EditorState>(EMPTY_EDITOR);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Version state
  const [version, setVersion] = useState<Record<string, string>>({
    min_version_passenger: '',
    latest_version_passenger: '',
    apk_url_passenger: '',
    min_version_driver: '',
    latest_version_driver: '',
    apk_url_driver: '',
  });
  const [versionLoaded, setVersionLoaded] = useState(false);
  const [versionSaving, setVersionSaving] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const [list, countryList] = await Promise.all([
        adminApi.listAnnouncements(),
        adminApi.getCountriesWithTariffs(),
      ]);
      setAnnouncements(list as Announcement[]);
      setCountries(countryList);
    } catch {
      showToast('error', 'Impossible de charger les annonces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const loadVersion = useCallback(async () => {
    try {
      const data = await adminApi.getAppVersion();
      setVersion((prev) => ({ ...prev, ...data }));
    } catch {
      showToast('error', 'Impossible de charger les versions');
    } finally {
      setVersionLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (tab === 'version' && !versionLoaded) loadVersion();
  }, [tab, versionLoaded, loadVersion]);

  const openCreate = () => {
    setEditingId(null);
    setEditorInitial(EMPTY_EDITOR);
    setEditorOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditingId(a.id);
    setEditorInitial({
      type: a.type,
      title: a.title,
      body: a.body || '',
      imageUrl: a.imageUrl || '',
      priority: a.priority || 'normal',
      ctaType: a.ctaType || 'none',
      ctaValue: a.ctaValue || '',
      ctaLabel: a.ctaLabel || '',
      targetApps: a.targetApps || [],
      targetCountries: a.targetCountries || [],
      targetTiers: a.targetTiers || [],
      startsAt: toLocalDatetime(a.startsAt),
      endsAt: toLocalDatetime(a.endsAt),
      isActive: a.isActive !== false,
    });
    setEditorOpen(true);
  };

  const handleDelete = async (a: Announcement) => {
    if (!confirm(`Supprimer l'annonce "${a.title}" ?`)) return;
    try {
      await adminApi.deleteAnnouncement(a.id);
      setAnnouncements((list) => list.filter((x) => x.id !== a.id));
      showToast('success', 'Annonce supprimée');
    } catch {
      showToast('error', 'Erreur lors de la suppression');
    }
  };

  const handleSaved = (msg: string) => {
    setEditorOpen(false);
    showToast('success', msg);
    loadAnnouncements();
  };

  const saveVersion = async () => {
    setVersionSaving(true);
    try {
      await adminApi.setAppVersion(version);
      showToast('success', 'Versions mises à jour');
    } catch (e: any) {
      showToast('error', e?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setVersionSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            Annonces
          </h1>
          <p className="text-sm text-slate-500 mt-1">Annonces in-app et configuration des versions</p>
        </div>
        {tab === 'annonces' && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {([
          { id: 'annonces', label: 'Annonces', icon: Megaphone },
          { id: 'version', label: 'Version', icon: Smartphone },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Annonces ── */}
      {tab === 'annonces' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Megaphone className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Aucune annonce</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Type', 'Titre', 'Ciblage', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {announcements.map((a) => {
                  const meta = TYPE_META[a.type] || TYPE_META.info;
                  const Icon = meta.icon;
                  const active = a.isActive !== false;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${meta.color}`}>
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {a.imageUrl && (
                            <img src={a.imageUrl} alt="" className="w-8 h-8 rounded object-cover border border-slate-200" />
                          )}
                          <span className="font-medium text-slate-800">{a.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{targetSummary(a)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                            active ? 'text-green-700 bg-green-50' : 'text-slate-400 bg-slate-100'
                          }`}
                        >
                          {active ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openEdit(a)}
                            title="Modifier"
                            className="text-slate-400 hover:text-primary transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(a)}
                            title="Supprimer"
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab Version ── */}
      {tab === 'version' && (
        <div className="space-y-6">
          {!versionLoaded ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {VERSION_FIELDS.map((col) => (
                  <div key={col.side} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-primary" />
                      Application {col.side}
                    </h2>
                    {col.keys.map((key) => {
                      const isUrl = key.startsWith('apk_url');
                      return (
                        <div key={key}>
                          <label className="block text-xs font-medium text-slate-600 mb-1">{VERSION_LABELS[key]}</label>
                          <div className="relative">
                            <input
                              value={version[key] ?? ''}
                              onChange={(e) => setVersion((v) => ({ ...v, [key]: e.target.value }))}
                              placeholder={isUrl ? 'https://…/app.apk' : 'ex: 1.2.0'}
                              className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                                isUrl ? 'font-mono pr-9' : 'font-mono'
                              }`}
                            />
                            {isUrl && version[key] && (
                              <a
                                href={version[key]}
                                target="_blank"
                                rel="noreferrer"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={saveVersion}
                  disabled={versionSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {versionSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Editor */}
      {editorOpen && (
        <AnnouncementEditor
          initial={editorInitial}
          editingId={editingId}
          countries={countries}
          onClose={() => setEditorOpen(false)}
          onSaved={handleSaved}
          onError={(msg) => showToast('error', msg)}
        />
      )}
    </div>
  );
}
