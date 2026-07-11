import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plane, Search, Edit2, Loader2, AlertCircle,
  CheckCircle2, XCircle, MapPin, Globe, Navigation, Save, X,
  ChevronLeft, ChevronRight, Radio, Clock,
} from 'lucide-react';
import { adminApi, Airport } from '../services/api';

const LIMIT = 50;

export function AirportsPage() {
  const [airports, setAirports]       = useState<Airport[]>([]);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingAirport, setEditingAirport] = useState<Partial<Airport> | null>(null);
  const [saving, setSaving]           = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAirports = useCallback(async (p = page, s = search, c = countryFilter) => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getAirportsAdmin({ page: p, limit: LIMIT, search: s || undefined, country: c || undefined });
      setAirports(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setPage(res.page);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAirports(1, '', ''); }, [loadAirports]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => loadAirports(1, value, countryFilter), 350);
  };

  const handleCountryChange = (value: string) => {
    setCountryFilter(value);
    loadAirports(1, search, value);
  };

  const handlePage = (p: number) => loadAirports(p, search, countryFilter);

  const handleToggleStatus = async (airport: Airport) => {
    try {
      await adminApi.updateAirport(airport.id, { isActive: !airport.isActive });
      setAirports(prev => prev.map(a => a.id === airport.id ? { ...a, isActive: !a.isActive } : a));
    } catch (err: any) {
      alert(err.message || 'Erreur statut');
    }
  };

  // Toggle « Opéré » : indique si AeroCab assure réellement le service sur cet aéroport
  // (chauffeurs, tarifs, support). Impacte directement les apps mobiles via /config.
  const handleToggleOperated = async (airport: Airport) => {
    const next = !airport.isOperated;
    if (!next && !window.confirm(`Désactiver ${airport.iataCode} retirera ce service aux passagers. Continuer ?`)) return;
    try {
      await adminApi.setAirportOperated(airport.id, next);
      setAirports(prev => prev.map(a => a.id === airport.id ? { ...a, isOperated: next } : a));
    } catch (err: any) {
      alert(err.message || 'Erreur toggle opéré');
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
        await adminApi.createAirport(editingAirport);
        loadAirports(1, search, countryFilter);
      }
      setModalOpen(false);
      setEditingAirport(null);
    } catch (err: any) {
      alert(err.message || 'Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">Gestion des Aéroports</h2>
          <p className="text-sm text-gray-400 mt-1">
            {total.toLocaleString()} aéroport{total > 1 ? 's' : ''} dans le catalogue mondial — basculer un toggle « OPÉRÉ » pour ouvrir le service.
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-3 relative font-sans">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Nom, IATA, ICAO, ville..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          />
        </div>
        <div className="md:col-span-2 relative font-sans">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Code pays (ex: CM, FR...)"
            value={countryFilter}
            onChange={(e) => handleCountryChange(e.target.value.toUpperCase())}
            maxLength={2}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm uppercase"
          />
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
          <span className="text-lg font-bold text-primary">{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-gray-50 shadow-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white rounded-2xl border border-red-50 shadow-sm text-center px-6">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-900 font-semibold">{error}</p>
          <button onClick={() => loadAirports(page, search, countryFilter)} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer">
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden font-sans">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aéroport</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Localisation</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coordonnées</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rayon / Délai</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statut</th>
                    <th className="text-right py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {airports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <Plane className="w-10 h-10 opacity-20" />
                          <p className="text-sm">Aucun résultat</p>
                        </div>
                      </td>
                    </tr>
                  ) : airports.map((airport) => (
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
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono">
                          <Navigation className="w-3 h-3 text-primary rotate-45" />
                          {airport.latitude.toFixed(4)}, {airport.longitude.toFixed(4)}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                            <Radio className="w-3 h-3 text-primary" />
                            {airport.detectionRadius ?? 3} km
                          </span>
                          <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1" title="Délai sortie moyen">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {airport.exitDelayMinutes} min
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
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
                          <button
                            onClick={() => handleToggleOperated(airport)}
                            title={airport.isOperated
                              ? 'AeroCab assure le service ici — cliquer pour désactiver'
                              : 'Aéroport non desservi — cliquer pour activer le service'}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                              airport.isOperated
                                ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                : 'bg-gray-50 text-gray-400 border border-gray-100'
                            }`}
                          >
                            {airport.isOperated ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {airport.isOperated ? 'OPÉRÉ' : 'NON OPÉRÉ'}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingAirport(airport); setModalOpen(true); }}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                            title="Éditer (nom, rayon de détection)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-6 py-4 shadow-sm">
              <span className="text-sm text-gray-500">
                Page <span className="font-bold text-gray-800">{page}</span> sur <span className="font-bold text-gray-800">{totalPages}</span>
                <span className="ml-2 text-gray-400">({total.toLocaleString()} résultats)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePage(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePage(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                        p === page
                          ? 'bg-primary text-white shadow-md shadow-primary/20'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePage(page + 1)}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{editingAirport?.id ? 'Modifier' : 'Nouvel aéroport'}</h3>
                  <p className="text-xs text-gray-400">Codes, localisation et rayon de détection GPS</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-200/50 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Code IATA *</label>
                  <input required maxLength={3} placeholder="DLA"
                    value={editingAirport?.iataCode || ''}
                    onChange={(e) => setEditingAirport(p => ({ ...p, iataCode: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Code ICAO</label>
                  <input maxLength={4} placeholder="FKKD"
                    value={editingAirport?.icaoCode || ''}
                    onChange={(e) => setEditingAirport(p => ({ ...p, icaoCode: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nom complet *</label>
                <input required placeholder="Aéroport International de Douala"
                  value={editingAirport?.name || ''}
                  onChange={(e) => setEditingAirport(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Ville *</label>
                  <input required placeholder="Douala"
                    value={editingAirport?.city || ''}
                    onChange={(e) => setEditingAirport(p => ({ ...p, city: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Code pays ISO *</label>
                  <input required maxLength={2} placeholder="CM"
                    value={editingAirport?.countryCode || ''}
                    onChange={(e) => setEditingAirport(p => ({ ...p, countryCode: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nom du pays *</label>
                <input required placeholder="Cameroun"
                  value={editingAirport?.country || ''}
                  onChange={(e) => setEditingAirport(p => ({ ...p, country: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-5 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Latitude *</label>
                  <div className="relative">
                    <input required type="number" step="any" placeholder="4.0061"
                      value={editingAirport?.latitude ?? ''}
                      onChange={(e) => setEditingAirport(p => ({ ...p, latitude: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2.5 bg-white border border-primary/20 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pl-8"
                    />
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/40" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Longitude *</label>
                  <div className="relative">
                    <input required type="number" step="any" placeholder="9.7194"
                      value={editingAirport?.longitude ?? ''}
                      onChange={(e) => setEditingAirport(p => ({ ...p, longitude: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2.5 bg-white border border-primary/20 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pl-8"
                    />
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/40" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Rayon de détection GPS (km)
                </label>
                <p className="text-[11px] text-gray-400">
                  Distance maximale pour détecter automatiquement cet aéroport depuis le GPS du passager.
                </p>
                <div className="relative">
                  <input type="number" step="0.5" min="1" max="50" placeholder="3"
                    value={editingAirport?.detectionRadius ?? 3}
                    onChange={(e) => setEditingAirport(p => ({ ...p, detectionRadius: parseFloat(e.target.value) }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pl-10"
                  />
                  <Radio className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Délai sortie (min)
                </label>
                <p className="text-[11px] text-gray-400">
                  Temps moyen entre atterrissage et sortie effective du passager.
                </p>
                <div className="relative">
                  <input type="number" step="1" min="0" max="120" placeholder="15"
                    value={editingAirport?.exitDelayMinutes ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingAirport(p => ({ ...p, exitDelayMinutes: val === '' ? undefined : parseInt(val, 10) }));
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pl-10"
                  />
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 px-6 py-3.5 text-sm font-bold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-6 py-3.5 text-sm font-bold text-white bg-primary rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" />{editingAirport?.id ? 'Mettre à jour' : 'Enregistrer'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
