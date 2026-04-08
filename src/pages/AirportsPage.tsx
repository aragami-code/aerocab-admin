import { useState, useEffect } from 'react';
import {
  Plane,
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MapPin,
  Globe,
  Navigation,
  Save,
  X
} from 'lucide-react';
import { adminApi, Airport } from '../services/api';

export function AirportsPage() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState('');
  const [editingAirport, setEditingAirport] = useState<Partial<Airport> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAirports();
  }, []);

  const loadAirports = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getAirportsAdmin();
      setAirports(data);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement des aéroports');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (airport: Airport) => {
    try {
      await adminApi.updateAirport(airport.id, { isActive: !airport.isActive });
      setAirports(prev => prev.map(a => a.id === airport.id ? { ...a, isActive: !a.isActive } : a));
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la modification du statut');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Supprimer l'aéroport ${name} ? Cette action est irréversible.`)) return;
    try {
      await adminApi.deleteAirport(id);
      setAirports(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAirport) return;

    setSaving(true);
    try {
      if (editingAirport.id) {
        const updated = await adminApi.updateAirport(editingAirport.id, editingAirport);
        setAirports(prev => prev.map(a => a.id === updated.id ? updated : a));
      } else {
        const created = await adminApi.createAirport(editingAirport);
        setAirports(prev => [created, ...prev]);
      }
      setModalOpen(false);
      setEditingAirport(null);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const countries = Array.from(new Set(airports.map(a => a.country))).sort();

  const filteredAirports = airports.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.iataCode.toLowerCase().includes(search.toLowerCase()) ||
      (a.icaoCode || '').toLowerCase().includes(search.toLowerCase()) ||
      a.city.toLowerCase().includes(search.toLowerCase());
    
    const matchesCountry = countryFilter === '' || a.country === countryFilter;
    
    return matchesSearch && matchesCountry;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">Gestion des Aéroports</h2>
          <p className="text-sm text-gray-400 mt-1">Administration des hubs nationaux et internationaux</p>
        </div>
        <button
          onClick={() => { setEditingAirport({ isActive: true }); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 text-sm font-medium cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Ajouter un aéroport
        </button>
      </div>

      {/* Stats & Search */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-3 relative font-sans">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, IATA, ICAO ou ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          />
        </div>
        <div className="md:col-span-2 relative font-sans">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all shadow-sm cursor-pointer"
          >
            <option value="">Tous les pays</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
          <span className="text-lg font-bold text-primary">{filteredAirports.length}</span>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-gray-50 shadow-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-gray-400">Chargement des hubs mondiaux...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white rounded-2xl border border-red-50 shadow-sm text-center px-6">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <div>
            <p className="text-gray-900 font-semibold text-lg">{error}</p>
            <p className="text-gray-400 text-sm">Vérifiez votre connexion ou contactez le support.</p>
          </div>
          <button onClick={loadAirports} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer">
            Réessayer
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden font-sans">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-left py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aéroport</th>
                  <th className="text-left py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Localisation</th>
                  <th className="text-left py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coordonnées</th>
                  <th className="text-left py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statut</th>
                  <th className="text-right py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAirports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Plane className="w-10 h-10 opacity-20" />
                        <p className="text-sm">Aucun aéroport ne correspond à votre recherche</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAirports.map((airport) => (
                    <tr key={airport.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/5 flex flex-col items-center justify-center border border-primary/10">
                            <span className="text-[10px] font-bold text-primary leading-none mb-0.5">{airport.iataCode}</span>
                            <span className="text-[9px] text-gray-400 font-medium leading-none">{airport.icaoCode || '----'}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{airport.name}</p>
                            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-tight">{airport.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-600 font-medium">{airport.country} ({airport.countryCode})</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono">
                            <Navigation className="w-3 h-3 text-primary rotate-45" />
                            {airport.latitude.toFixed(4)}, {airport.longitude.toFixed(4)}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleStatus(airport)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            airport.isActive 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-gray-50 text-gray-400 border border-gray-100'
                          }`}
                        >
                          {airport.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {airport.isActive ? 'ACTIF' : 'INACTIF'}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingAirport(airport); setModalOpen(true); }}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(airport.id, airport.name)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{editingAirport?.id ? 'Modifier l\'aéroport' : 'Nouvel aéroport'}</h3>
                  <p className="text-xs text-gray-400 font-medium">Configurez les codes et la localisation précise</p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-200/50 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Code IATA (3)</label>
                  <input
                    required
                    maxLength={3}
                    placeholder="ex: DLA"
                    value={editingAirport?.iataCode || ''}
                    onChange={(e) => setEditingAirport(p => ({ ...p, iataCode: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Code ICAO (4)</label>
                  <input
                    maxLength={4}
                    placeholder="ex: FKKD"
                    value={editingAirport?.icaoCode || ''}
                    onChange={(e) => setEditingAirport(p => ({ ...p, icaoCode: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nom complet</label>
                <input
                  required
                  placeholder="ex: Aéroport International de Douala"
                  value={editingAirport?.name || ''}
                  onChange={(e) => setEditingAirport(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Ville</label>
                  <input
                    required
                    placeholder="Douala"
                    value={editingAirport?.city || ''}
                    onChange={(e) => setEditingAirport(p => ({ ...p, city: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pays (ISO Code)</label>
                  <div className="relative">
                    <input
                      required
                      maxLength={2}
                      placeholder="CM"
                      value={editingAirport?.countryCode || ''}
                      onChange={(e) => setEditingAirport(p => ({ ...p, countryCode: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pl-10"
                    />
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Latitude</label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      step="any"
                      placeholder="4.0061"
                      value={editingAirport?.latitude || ''}
                      onChange={(e) => setEditingAirport(p => ({ ...p, latitude: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2.5 bg-white border border-primary/20 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pl-8"
                    />
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/40" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Longitude</label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      step="any"
                      placeholder="9.7194"
                      value={editingAirport?.longitude || ''}
                      onChange={(e) => setEditingAirport(p => ({ ...p, longitude: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2.5 bg-white border border-primary/20 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pl-8"
                    />
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/40" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-6 py-3.5 text-sm font-bold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3.5 text-sm font-bold text-white bg-primary rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingAirport?.id ? 'Mettre à jour' : 'Enregistrer'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
