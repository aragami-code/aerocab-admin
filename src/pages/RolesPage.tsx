import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Shield, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { adminApi, AdminRole } from '../services/api';
import { Can } from '../components/Can';

interface Permission {
  id: string;
  key: string;
  group: string;
  description: string;
}

export function RolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // Create role modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', label: '', description: '' });
  const [creating, setCreating] = useState(false);

  // Permission matrix edit
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [r, p] = await Promise.all([adminApi.getRoles(), adminApi.getPermissions()]);
      setRoles(r);
      setPermissions(p);
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
      await adminApi.createRole(createForm);
      setShowCreate(false);
      setCreateForm({ name: '', label: '', description: '' });
      load();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (role: AdminRole) => {
    if (!confirm(`Supprimer le rôle "${role.label}" ?`)) return;
    try {
      await adminApi.deleteRole(role.id);
      load();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    }
  };

  const startEditPerms = (role: AdminRole) => {
    const currentKeys = new Set(
      (role.rolePerms ?? []).map((rp) => rp.permission.key),
    );
    setEditPerms(currentKeys);
    setEditingRole(role.id);
  };

  const savePerms = async (roleId: string) => {
    try {
      setSaving(true);
      await adminApi.setRolePermissions(roleId, Array.from(editPerms));
      setEditingRole(null);
      load();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by group
  const groupedPerms = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-800">Rôles & Permissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Matrice de contrôle d'accès</p>
        </div>
        <Can permission="create_role">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau rôle
          </button>
        </Can>
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-2xl p-4 text-sm">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => {
            const isExpanded = expandedRole === role.id;
            const isEditing = editingRole === role.id;
            const permKeys = new Set((role.rolePerms ?? []).map((rp) => rp.permission.key));
            const permCount = permKeys.size;

            return (
              <div key={role.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {/* Role header */}
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">{role.label}</p>
                        {role.isSystem && (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                            Système
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {role.description ?? role.name} · {permCount} permission{permCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Can permission="assign_permissions_to_role">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => setEditingRole(null)}
                            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => savePerms(role.id)}
                            disabled={saving}
                            className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            {saving ? '...' : 'Sauvegarder'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { startEditPerms(role); setExpandedRole(role.id); }}
                          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          Modifier permissions
                        </button>
                      )}
                    </Can>
                    {!role.isSystem && (
                      <Can permission="delete_role">
                        <button
                          onClick={() => handleDelete(role)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Can>
                    )}
                    <button
                      onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Permissions matrix */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <div className="space-y-4">
                      {Object.entries(groupedPerms).map(([group, perms]) => (
                        <div key={group}>
                          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
                            {group}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                            {perms.map((perm) => {
                              const active = isEditing ? editPerms.has(perm.key) : permKeys.has(perm.key);
                              return (
                                <button
                                  key={perm.key}
                                  disabled={!isEditing}
                                  onClick={() => {
                                    if (!isEditing) return;
                                    setEditPerms((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(perm.key)) next.delete(perm.key);
                                      else next.add(perm.key);
                                      return next;
                                    });
                                  }}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all
                                    ${isEditing ? 'cursor-pointer' : 'cursor-default'}
                                    ${active
                                      ? 'bg-primary/10 text-primary font-medium'
                                      : 'bg-slate-50 text-slate-400'
                                    }`}
                                >
                                  <Check
                                    className={`w-3 h-3 flex-shrink-0 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}
                                  />
                                  <span className="truncate">{perm.description}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create role modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-slate-800">Nouveau rôle</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Identifiant *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: billing_manager"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Label *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Gestionnaire facturation"
                  value={createForm.label}
                  onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
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
    </div>
  );
}
