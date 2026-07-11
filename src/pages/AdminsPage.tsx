import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Shield, User, ChevronRight } from 'lucide-react';
import { adminApi, AdminUser, AdminRole } from '../services/api';
import { Can } from '../components/Can';

export function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', phone: '', email: '', roleId: '' });
  const [creating, setCreating] = useState(false);

  // Role assign modal
  const [assignModal, setAssignModal] = useState<{ admin: AdminUser } | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [a, r] = await Promise.all([adminApi.getAdmins(), adminApi.getRoles()]);
      setAdmins(a.data);
      setRoles(r);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await adminApi.createAdmin({
        name: createForm.name,
        phone: createForm.phone,
        email: createForm.email || undefined,
        roleId: createForm.roleId || undefined,
      });
      setShowCreate(false);
      setCreateForm({ name: '', phone: '', email: '', roleId: '' });
      load();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer l'admin "${name}" ?`)) return;
    try {
      await adminApi.deleteAdmin(id);
      load();
    } catch (err: any) {
      setError(err.status === 403 ? `Accès refusé — ${err.message}` : err.message || 'Erreur');
    }
  };

  const handleAssignRole = async () => {
    if (!assignModal || !selectedRoleId) return;
    try {
      setAssigning(true);
      await adminApi.assignRole(assignModal.admin.id, selectedRoleId);
      setAssignModal(null);
      load();
    } catch (err: any) {
      setError(err.status === 403 ? `Accès refusé — ${err.message}` : err.message || 'Erreur');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      await adminApi.removeRole(userId, roleId);
      load();
    } catch (err: any) {
      setError(err.status === 403 ? `Accès refusé — ${err.message}` : err.message || 'Erreur');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-800">Administrateurs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestion des comptes et rôles admin</p>
        </div>
        <Can permission="create_admin">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvel admin
          </button>
        </Can>
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-2xl p-4 text-sm">{error}</div>}

      {/* Admin list */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucun administrateur</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {admins.map((admin) => {
              const adminRoles = admin.adminRoles ?? [];
              return (
                <div key={admin.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                      {(admin.name ?? admin.phone).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{admin.name ?? '—'}</p>
                      <p className="text-xs text-slate-400 truncate">{admin.phone}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 flex-1 justify-center">
                    {adminRoles.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Aucun rôle</span>
                    ) : (
                      adminRoles.map((ur) => (
                        <span
                          key={ur.role.id}
                          className="group inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium"
                        >
                          <Shield className="w-3 h-3" />
                          {ur.role.label}
                          <Can permission="assign_role">
                            <button
                              onClick={() => handleRemoveRole(admin.id, ur.role.id)}
                              className="ml-0.5 text-primary/40 hover:text-red-500 transition-colors"
                            >
                              ×
                            </button>
                          </Can>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Can permission="assign_role">
                      <button
                        onClick={() => { setAssignModal({ admin }); setSelectedRoleId(''); }}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <ChevronRight className="w-3 h-3" />
                        Rôle
                      </button>
                    </Can>
                    <Can permission="delete_admin">
                      <button
                        onClick={() => handleDelete(admin.id, admin.name ?? admin.phone)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Can>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-slate-800">Nouvel administrateur</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Téléphone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+223..."
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rôle initial</label>
                <select
                  value={createForm.roleId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, roleId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">— Aucun rôle —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign role modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Assigner un rôle</h2>
              <p className="text-sm text-slate-400 mt-0.5">{assignModal.admin.name ?? assignModal.admin.phone}</p>
            </div>
            <div className="p-6 space-y-4">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="">— Choisir un rôle —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button
                  onClick={() => setAssignModal(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAssignRole}
                  disabled={!selectedRoleId || assigning}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {assigning ? '...' : 'Assigner'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
