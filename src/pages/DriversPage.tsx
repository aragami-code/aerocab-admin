import { useState, useEffect, useCallback } from 'react';
import {
  Car, Search, Clock, CheckCircle, XCircle, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, Eye, ShieldCheck, ShieldX, ArrowLeft,
  FileText, AlertTriangle, User, MapPin, Phone, Mail, ExternalLink,
} from 'lucide-react';
import { adminApi } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

const statusConfig = {
  approved:  { label: 'Approuvé',    icon: CheckCircle, classes: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  pending:   { label: 'En attente',  icon: Clock,       classes: 'text-amber-600 bg-amber-50 border-amber-200' },
  rejected:  { label: 'Rejeté',      icon: XCircle,     classes: 'text-red-500 bg-red-50 border-red-200' },
  suspended: { label: 'Suspendu',    icon: XCircle,     classes: 'text-gray-500 bg-gray-100 border-gray-200' },
};

const DOC_CONFIG: Record<string, { label: string; desc: string; kycKey: string }> = {
  cni_front:     { label: 'CNI recto / verso',   desc: 'Nom lisible, photo visible',       kycKey: 'Identité' },
  cni_back:      { label: 'CNI verso',            desc: 'Dos de la carte',                  kycKey: 'Identité' },
  license:       { label: 'Permis de conduire',   desc: 'Validité et identité',             kycKey: 'Permis' },
  registration:  { label: 'Carte grise',          desc: 'Plaque et modèle cohérents',       kycKey: 'Véhicule' },
  vehicle_photo: { label: 'Photo du véhicule',    desc: 'Vue extérieure claire',            kycKey: 'Véhicule' },
  selfie:        { label: 'Selfie avec CNI',      desc: 'Visage visible et cohérent',       kycKey: 'Selfie' },
  criminal_record:{ label: 'Casier judiciaire',   desc: 'Ajouté par le chauffeur',          kycKey: 'Casier' },
};

const DOC_STATUS_BADGE: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
  pending:  'bg-amber-100 text-amber-700',
};
const DOC_STATUS_LABEL: Record<string, string> = {
  approved: 'Vérifié', rejected: 'Rejeté', pending: 'À vérifier',
};

// ── Helper: ouvrir un document protégé ───────────────────────────────────────

async function openProtectedDoc(fileUrl: string) {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Fichier introuvable');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

// ── Composant : card document ─────────────────────────────────────────────────

function DocCard({ doc, onApprove, onReject }: {
  doc: any;
  onApprove: () => void;
  onReject: () => void;
}) {
  const cfg = DOC_CONFIG[doc.type] ?? { label: doc.type, desc: '', kycKey: '' };
  const status = doc.status ?? 'pending';
  const isImg = doc.fileUrl && !doc.fileUrl.endsWith('.pdf');
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    if (!doc.fileUrl) return;
    try {
      setOpening(true);
      await openProtectedDoc(doc.fileUrl);
    } catch (e: any) {
      alert('Impossible d\'ouvrir le document : ' + e.message);
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
      status === 'approved' ? 'border-emerald-200' :
      status === 'rejected' ? 'border-red-200' : 'border-gray-200'
    }`}>
      {/* Thumbnail */}
      <div className="relative h-40 bg-gray-100 flex flex-col items-center justify-center gap-2">
        {isImg ? (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
        ) : (
          <FileText className="w-10 h-10 text-gray-400" />
        )}
        {doc.fileUrl && (
          <button
            onClick={handleOpen}
            disabled={opening}
            className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-medium text-primary bg-white border border-primary/20 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <ExternalLink className="w-3 h-3" />
            {opening ? '…' : 'Aperçu document'}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-white">
        <div className="flex items-start justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{cfg.label}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${DOC_STATUS_BADGE[status]}`}>
            {DOC_STATUS_LABEL[status]}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-3">{cfg.desc}</p>

        {doc.rejectionReason && (
          <p className="text-xs text-red-500 italic mb-2">↳ {doc.rejectionReason}</p>
        )}

        <div className="flex gap-2">
          {status !== 'approved' && (
            <button
              onClick={onApprove}
              className="flex-1 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Approuver
            </button>
          )}
          {status !== 'rejected' && (
            <button
              onClick={onReject}
              className="flex-1 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer"
            >
              Rejeter
            </button>
          )}
          {status === 'approved' && (
            <button
              onClick={onReject}
              className="flex-1 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
          )}
        </div>

        {doc.fileUrl && (
          <button
            onClick={handleOpen}
            disabled={opening}
            className="mt-2 w-full py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
          >
            Ouvrir
          </button>
        )}
      </div>
    </div>
  );
}

// ── Composant : KYC Detail (vue pleine page) ──────────────────────────────────

function DriverKycDetail({ driver: initialDriver, onBack, onRefresh }: {
  driver: any;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [driver, setDriver] = useState<any>(initialDriver);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDocModal, setRejectDocModal] = useState<{ docId: string } | null>(null);
  const [rejectDocReason, setRejectDocReason] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const name = driver.user?.name || 'Sans nom';
  const phone = driver.user?.phone || '--';
  const email = driver.user?.email || '--';
  const vehicle = [driver.vehicleBrand, driver.vehicleModel].filter(Boolean).join(' ') || 'Non renseigné';
  const plate = driver.vehiclePlate || '--';
  const status = driver.status || 'pending';
  const statusCfg = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = statusCfg.icon;

  const handleVerify = async (action: 'approve' | 'reject' | 'suspend') => {
    try {
      setActionLoading(action);
      await adminApi.verifyDriver(driver.id, action as any, comment || undefined);
      onRefresh();
      onBack();
    } catch (e: any) {
      alert(e.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDocApprove = async (docId: string) => {
    try {
      await adminApi.verifyDocument(docId, 'approve');
      setDriver((prev: any) => ({
        ...prev,
        documents: prev.documents.map((d: any) =>
          d.id === docId ? { ...d, status: 'approved', rejectionReason: null } : d
        ),
      }));
    } catch (e: any) { alert(e.message); }
  };

  const handleDocReject = async (docId: string, reason?: string) => {
    try {
      await adminApi.verifyDocument(docId, 'reject', reason);
      setDriver((prev: any) => ({
        ...prev,
        documents: prev.documents.map((d: any) =>
          d.id === docId ? { ...d, status: 'rejected', rejectionReason: reason || null } : d
        ),
      }));
    } catch (e: any) { alert(e.message); }
  };

  // KYC checklist résumé
  const kycGroups = ['Identité', 'Permis', 'Véhicule', 'Selfie', 'Casier'];
  const kycStatus = (group: string) => {
    const docs = (driver.documents || []).filter((d: any) =>
      DOC_CONFIG[d.type]?.kycKey === group
    );
    if (docs.length === 0) return 'missing';
    if (docs.every((d: any) => d.status === 'approved')) return 'approved';
    if (docs.some((d: any) => d.status === 'rejected')) return 'rejected';
    return 'pending';
  };

  const kycBadge = (s: string) => ({
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-600',
    pending:  'bg-amber-100 text-amber-700',
    missing:  'bg-gray-100 text-gray-500',
  }[s] ?? 'bg-gray-100 text-gray-500');

  const kycLabel = (s: string) => ({
    approved: 'Vérifié', rejected: 'Rejeté', pending: 'À vérifier', missing: 'Absent',
  }[s] ?? 'Absent');

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        {status === 'approved' && (
          <div className="flex gap-2">
            <button
              onClick={() => handleVerify('suspend')}
              disabled={!!actionLoading}
              className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Suspendre
            </button>
          </div>
        )}
      </div>

      {/* Driver header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">{name.charAt(0)}</span>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{name}</p>
            <p className="text-sm text-gray-500">{driver.city ?? 'Ville non renseignée'} · {vehicle} · {plate}</p>
            <p className="text-xs text-gray-400 mt-0.5">{phone}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border ${statusCfg.classes}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusCfg.label}
          </span>
          {driver.user?.lastActiveAt && (
            <span className="text-xs text-gray-400">
              Dernière activité : {new Date(driver.user.lastActiveAt).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      </div>

      {/* Warning banner (pending only) */}
      {status === 'pending' && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Contrôle requis : </span>
            identité, permis, carte grise, selfie avec CNI et casier judiciaire.
            Vérifiez la cohérence des données avant approbation.
          </p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Left — Documents 2×2 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Documents à vérifier</h3>
            <span className="text-xs text-gray-400 font-medium">KYC</span>
          </div>
          {driver.documents && driver.documents.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {driver.documents.map((doc: any) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  onApprove={() => handleDocApprove(doc.id)}
                  onReject={() => setRejectDocModal({ docId: doc.id })}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
              Aucun document soumis
            </div>
          )}
        </div>

        {/* Right — Infos + KYC checklist */}
        <div className="space-y-4">
          {/* Informations */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">Informations fournies</h3>
              <span className="text-xs text-gray-400">Profil</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: User,  label: 'Nom complet',  value: name },
                { icon: MapPin, label: 'Ville',        value: driver.city ?? '--' },
                { icon: Phone, label: 'Téléphone',    value: phone },
                { icon: Mail,  label: 'Email',         value: email },
                { icon: Car,   label: 'Véhicule',      value: vehicle },
                { icon: FileText, label: 'Plaque',     value: plate },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                  <p className="text-xs font-semibold text-gray-900 truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* Type chauffeur */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="text-xs text-gray-500 mb-1.5 block">Type chauffeur</label>
              <select
                value={driver.driverType ?? 'external'}
                onChange={(e) => setDriver({ ...driver, driverType: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              >
                <option value="external">Partenaire externe</option>
                <option value="internal">Flotte AeroGo (interne)</option>
              </select>
              <button
                disabled={profileSaving}
                onClick={async () => {
                  setProfileSaving(true);
                  try {
                    await adminApi.updateDriverProfile(driver.id, {
                      driverType: driver.driverType,
                      consigneEnabled: driver.consigneEnabled,
                    });
                  } catch (e: any) { alert(e.message); }
                  finally { setProfileSaving(false); }
                }}
                className="mt-2 w-full py-2 text-xs font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {profileSaving ? 'Enregistrement…' : 'Sauvegarder'}
              </button>
            </div>
          </div>

          {/* KYC Checklist */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">Documents</h3>
              <span className="text-xs text-gray-400">KYC</span>
            </div>
            <div className="space-y-2.5">
              {kycGroups.map((group) => {
                const s = kycStatus(group);
                const desc: Record<string, string> = {
                  Identité: 'CNI conforme aux infos du profil',
                  Permis:   'Validité et identité vérifiées',
                  Véhicule: 'Carte grise et plaque cohérentes',
                  Selfie:   'Visage visible et cohérent',
                  Casier:   'Ajouté par le chauffeur',
                };
                return (
                  <div key={group} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{group}</p>
                      <p className="text-[10px] text-gray-400">{desc[group]}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kycBadge(s)}`}>
                      {kycLabel(s)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Surveillance */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Surveillance</h3>
          <span className="text-xs text-gray-400">Confiance</span>
        </div>
        <div className="space-y-1">
          {[
            {
              label: 'GPS',
              desc: 'Aucune anomalie détectée',
              statusLabel: 'Vérifié',
              color: 'emerald',
            },
            {
              label: 'Comportement',
              desc: (driver.totalRides ?? 0) > 0 ? `${driver.totalRides} courses effectuées` : 'Aucun incident signalé',
              statusLabel: 'Stable',
              color: 'emerald',
            },
            {
              label: 'Fraude',
              desc: driver.status === 'suspended' ? 'Compte suspendu — vérification en cours' : 'Pas d\'alerte active',
              statusLabel: driver.status === 'suspended' ? 'Alerte' : 'RAS',
              color: driver.status === 'suspended' ? 'amber' : 'emerald',
            },
          ].map(({ label, desc, statusLabel, color }) => (
            <div key={label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color === 'emerald' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  <ShieldCheck className={`w-4 h-4 ${color === 'emerald' ? 'text-emerald-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {statusLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Décision admin */}
      {(status === 'pending' || status === 'rejected') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Décision admin</h3>
            <span className="text-xs text-gray-400">Commentaire</span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ajoutez ici un commentaire interne ou la raison d'un rejet / d'une demande de correction."
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mb-4"
          />
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => handleVerify('reject')}
              disabled={!!actionLoading}
              className="px-5 py-2.5 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rejeter'}
            </button>
            <button
              onClick={() => handleVerify('approve')}
              disabled={!!actionLoading}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Valider le chauffeur'}
            </button>
          </div>
        </div>
      )}

      {/* Reject doc modal */}
      {rejectDocModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl mx-4">
            <h3 className="text-base font-bold text-gray-900 mb-3">Motif de rejet</h3>
            <textarea
              value={rejectDocReason}
              onChange={(e) => setRejectDocReason(e.target.value)}
              placeholder="Motif (optionnel)…"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectDocModal(null); setRejectDocReason(''); }}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  await handleDocReject(rejectDocModal.docId, rejectDocReason || undefined);
                  setRejectDocModal(null);
                  setRejectDocReason('');
                }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadDrivers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.getDrivers({
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setDrivers(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const handleVerify = async (driverId: string, action: 'approve' | 'reject' | 'suspend', reason?: string) => {
    try {
      setActionLoading(driverId);
      await adminApi.verifyDriver(driverId, action as any, reason);
      await loadDrivers();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const openDetail = async (driver: any) => {
    try {
      const detail = await adminApi.getDriverDetail(driver.id);
      setSelectedDriver(detail);
    } catch (err: any) {
      alert(err.message || 'Erreur');
    }
  };

  // Vue KYC pleine page
  if (selectedDriver) {
    return (
      <DriverKycDetail
        driver={selectedDriver}
        onBack={() => setSelectedDriver(null)}
        onRefresh={loadDrivers}
      />
    );
  }

  const filteredDrivers = search
    ? drivers.filter((d) =>
        (d.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.user?.phone || '').includes(search)
      )
    : drivers;

  const filters = [
    { value: '',          label: 'Tous' },
    { value: 'pending',   label: 'En attente' },
    { value: 'approved',  label: 'Validés' },
    { value: 'rejected',  label: 'Rejetés' },
    { value: 'suspended', label: 'Suspendus' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">Gestion des Chauffeurs</h2>
          <p className="text-sm text-gray-400 mt-1">
            Validation des documents et gestion des profils chauffeurs
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors cursor-pointer">
          Exporter CSV
        </button>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un chauffeur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === f.value
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-gray-500">{error}</p>
          <button onClick={loadDrivers} className="text-sm text-primary font-medium hover:underline cursor-pointer">
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Nom</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Ville</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Courses</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Statut</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Note</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                      Aucun chauffeur trouvé
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((driver) => {
                    const driverStatus = driver.status || 'pending';
                    const status = statusConfig[driverStatus as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    const name = driver.user?.name || 'Sans nom';
                    const phone = driver.user?.phone || '';

                    return (
                      <tr key={driver.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-primary">{name.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{name}</p>
                              <p className="text-xs text-gray-400">{phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{driver.city ?? '--'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{driver.totalRides ?? 0}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${status.classes}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {driver.ratingAvg ? `${Number(driver.ratingAvg).toFixed(1)}` : '--'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openDetail(driver)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Voir
                            </button>
                            {driverStatus === 'pending' && (
                              <button
                                onClick={() => handleVerify(driver.id, 'approve')}
                                disabled={actionLoading === driver.id}
                                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                Approuver
                              </button>
                            )}
                            {driverStatus === 'approved' && (
                              <button
                                onClick={() => handleVerify(driver.id, 'suspend')}
                                disabled={actionLoading === driver.id}
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <ShieldX className="w-3 h-3" />
                                Suspendre
                              </button>
                            )}
                            {driverStatus === 'suspended' && (
                              <button
                                onClick={() => handleVerify(driver.id, 'approve')}
                                disabled={actionLoading === driver.id}
                                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Réactiver
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 px-2">
            <p className="text-xs text-gray-400">
              1 à {filteredDrivers.length} sur {pagination.total} chauffeurs
            </p>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500">{page} / {pagination.totalPages}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
