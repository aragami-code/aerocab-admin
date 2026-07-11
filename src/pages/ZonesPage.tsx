import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronRight, Plane, Search, Route, Layers } from 'lucide-react';
import { adminApi } from '../services/api';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

type VehicleTypeDef = { id: string; label: string };

type ZonePrices = Record<string, number | undefined>;

interface PricingZone {
  id: string;
  name: string;
  minDistKm: number;
  maxDistKm: number;
  prices: ZonePrices;
  currency: string;
  airportIata: string | null;
  countryCode: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface AirportInfo {
  iataCode: string;
  name: string;
  city: string;
  countryCode: string;
}

interface ZoneFormState {
  id: string;
  name: string;
  minDistKm: number;
  maxDistKm: number;
  prices: ZonePrices;
  currency: string;
  airportIata: string | null;
  countryCode: string | null;
  isActive: boolean;
  sortOrder: number;
}

const CURRENCIES = ['XAF', 'XOF', 'USD', 'EUR', 'MAD', 'NGN', 'GHS', 'KES'];

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
});

export default function ZonesPage() {
  const [countries, setCountries]             = useState<string[]>([]);
  const [countrySearch, setCountrySearch]     = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [airports, setAirports]               = useState<AirportInfo[]>([]);
  const [airportSearch, setAirportSearch]     = useState('');
  const [expandedAirport, setExpandedAirport] = useState<string | null>(null);
  const [zonesByAirport, setZonesByAirport]   = useState<Record<string, PricingZone[]>>({});
  const [vehicleTypes, setVehicleTypes]       = useState<VehicleTypeDef[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingAirports, setLoadingAirports]   = useState(false);
  const [editing, setEditing]                 = useState<ZoneFormState | null>(null);
  const [isNew, setIsNew]                     = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState('');
  // Mode tarifaire (zone | kilometrage) par aéroport — réglages app_settings
  const [settings, setSettings]               = useState<Record<string, string>>({});
  const [savingMode, setSavingMode]           = useState<string | null>(null);

  // Résolution cascade : aéroport → pays → global → 'zone'
  const resolveMode = useCallback((iata: string): 'zone' | 'kilometrage' => {
    const a = settings[`pricing_mode:${iata.toUpperCase()}`];
    if (a === 'zone' || a === 'kilometrage') return a;
    const c = selectedCountry ? settings[`pricing_mode:${selectedCountry.toUpperCase()}`] : undefined;
    if (c === 'zone' || c === 'kilometrage') return c;
    return settings['pricing_mode'] === 'kilometrage' ? 'kilometrage' : 'zone';
  }, [settings, selectedCountry]);

  const setAirportMode = useCallback(async (iata: string, mode: 'zone' | 'kilometrage') => {
    const key = `pricing_mode:${iata.toUpperCase()}`;
    setSavingMode(iata);
    setError('');
    try {
      await adminApi.setSetting(key, mode);
      setSettings((s) => ({ ...s, [key]: mode }));
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors du changement de mode tarifaire');
    } finally {
      setSavingMode(null);
    }
  }, []);

  // Mode par défaut du pays (`pricing_mode:<CC>`) — appliqué aux aéroports sans réglage propre.
  const setCountryMode = useCallback(async (mode: 'zone' | 'kilometrage') => {
    if (!selectedCountry) return;
    const key = `pricing_mode:${selectedCountry.toUpperCase()}`;
    setSavingMode(`__country_${selectedCountry}`);
    setError('');
    try {
      await adminApi.setSetting(key, mode);
      setSettings((s) => ({ ...s, [key]: mode }));
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors du changement de mode par défaut');
    } finally {
      setSavingMode(null);
    }
  }, [selectedCountry]);

  const filteredCountries = useMemo(
    () => countries.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase())),
    [countries, countrySearch],
  );

  const filteredAirports = useMemo(
    () => airports.filter(a =>
      a.iataCode.toLowerCase().includes(airportSearch.toLowerCase()) ||
      a.name.toLowerCase().includes(airportSearch.toLowerCase()) ||
      a.city.toLowerCase().includes(airportSearch.toLowerCase()),
    ),
    [airports, airportSearch],
  );

  // Chargement des véhicules — fusionne global + pays sélectionné
  const loadVehicleTypes = useCallback(async (countryCode?: string | null) => {
    try {
      const [globalRes, countryRes] = await Promise.all([
        fetch(`${API}/admin/settings/tariffs`, { headers: headers() }),
        countryCode
          ? fetch(`${API}/admin/settings/tariffs/${countryCode}`, { headers: headers() })
          : Promise.resolve(null),
      ]);
      const global: any  = globalRes.ok  ? await globalRes.json()  : {};
      const country: any = countryRes?.ok ? await countryRes.json() : {};
      const merged = { ...(global.vehicles ?? {}), ...(country.vehicles ?? {}) };
      const types: VehicleTypeDef[] = Object.entries(merged)
        .filter(([, v]: [string, any]) => v?.isActive !== false)
        .map(([id, v]: [string, any]) => ({ id, label: v?.label ?? id }));
      setVehicleTypes(types);
    } catch { /* silencieux */ }
  }, []);

  // Chargement des pays opérés
  const loadCountries = useCallback(async () => {
    setLoadingCountries(true);
    try {
      const res = await fetch(`${API}/zones/admin/countries`, { headers: headers() });
      if (!res.ok) return;
      const codes: string[] = await res.json();
      setCountries(codes);
      if (codes.length > 0 && !selectedCountry) setSelectedCountry(codes[0]);
    } catch { /* silencieux */ }
    finally { setLoadingCountries(false); }
  }, []);

  // Chargement des aéroports opérés pour le pays sélectionné
  const loadAirports = useCallback(async (countryCode: string) => {
    setLoadingAirports(true);
    setAirports([]);
    setZonesByAirport({});
    setExpandedAirport(null);
    try {
      const res = await fetch(`${API}/zones/admin/airports?countryCode=${countryCode}`, { headers: headers() });
      if (!res.ok) return;
      const list: AirportInfo[] = await res.json();
      setAirports(list);
      // Charge les zones de chaque aéroport en parallèle
      const entries = await Promise.all(
        list.map(async (a) => {
          const r = await fetch(`${API}/zones/admin/all?airportIata=${a.iataCode}`, { headers: headers() });
          const zones: PricingZone[] = r.ok ? await r.json() : [];
          return [a.iataCode, zones] as [string, PricingZone[]];
        }),
      );
      setZonesByAirport(Object.fromEntries(entries));
      if (list.length > 0) setExpandedAirport(list[0].iataCode);
    } catch { /* silencieux */ }
    finally { setLoadingAirports(false); }
  }, []);

  // Recharge les zones d'un aéroport spécifique
  const reloadAirportZones = useCallback(async (iataCode: string) => {
    const res = await fetch(`${API}/zones/admin/all?airportIata=${iataCode}`, { headers: headers() });
    if (!res.ok) return;
    const zones: PricingZone[] = await res.json();
    setZonesByAirport((prev) => ({ ...prev, [iataCode]: zones }));
  }, []);

  useEffect(() => { loadVehicleTypes(); loadCountries(); }, [loadVehicleTypes, loadCountries]);
  useEffect(() => { adminApi.getSettings().then(setSettings).catch(() => {}); }, []);

  useEffect(() => {
    if (selectedCountry) {
      loadAirports(selectedCountry);
      loadVehicleTypes(selectedCountry);
    }
  }, [selectedCountry, loadAirports, loadVehicleTypes]);

  const openNewZone = (airport: AirportInfo) => {
    const existingZones = zonesByAirport[airport.iataCode] ?? [];
    setEditing({
      id: '',
      name: '',
      minDistKm: 0,
      maxDistKm: 10,
      prices: {},
      currency: 'XAF',
      airportIata: airport.iataCode,
      countryCode: airport.countryCode,
      isActive: true,
      sortOrder: existingZones.length + 1,
    });
    setIsNew(true);
    setError('');
  };

  const openEdit = (zone: PricingZone) => {
    setEditing({ ...zone });
    setIsNew(false);
    setError('');
  };

  const cancel = () => { setEditing(null); setIsNew(false); };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        name:        editing.name,
        minDistKm:   editing.minDistKm,
        maxDistKm:   editing.maxDistKm,
        prices:      editing.prices,
        currency:    editing.currency,
        airportIata: editing.airportIata,
        countryCode: editing.countryCode,
        isActive:    editing.isActive,
        sortOrder:   editing.sortOrder,
      };
      const res = isNew
        ? await fetch(`${API}/zones`,               { method: 'POST',  headers: headers(), body: JSON.stringify(body) })
        : await fetch(`${API}/zones/${editing.id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Erreur sauvegarde');
      if (editing.airportIata) await reloadAirportZones(editing.airportIata);
      setEditing(null);
    } catch { setError('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const remove = async (zone: PricingZone) => {
    if (!confirm(`Désactiver la zone "${zone.name}" ?`)) return;
    await fetch(`${API}/zones/${zone.id}`, { method: 'DELETE', headers: headers() });
    if (zone.airportIata) await reloadAirportZones(zone.airportIata);
  };

  const setPrice = (vType: string, val: string) => {
    if (!editing) return;
    const trimmed = val.trim();
    const next = { ...editing.prices };
    if (trimmed === '') {
      delete next[vType];
    } else {
      const n = Number(trimmed);
      if (!Number.isNaN(n)) next[vType] = n;
    }
    setEditing({ ...editing, prices: next });
  };

  if (loadingCountries) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Chargement…</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Zones tarifaires</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configurez les prix par aéroport et tranche de distance
        </p>
      </div>

      {/* Sélecteur de pays avec recherche */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={countrySearch}
              onChange={e => setCountrySearch(e.target.value)}
              placeholder="Rechercher un pays (ex: CM, SN…)"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <span className="text-xs text-gray-400">{countries.length} pays opérés</span>
        </div>
        <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
          {filteredCountries.map((code) => (
            <button
              key={code}
              onClick={() => { setSelectedCountry(code); setAirportSearch(''); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                selectedCountry === code
                  ? 'bg-primary text-white border-primary'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-primary/40'
              }`}
            >
              {code}
            </button>
          ))}
          {filteredCountries.length === 0 && (
            <p className="text-sm text-gray-400 py-1">
              {countries.length === 0
                ? 'Aucun pays opéré — activez des aéroports dans la section « Aéroports ».'
                : 'Aucun pays ne correspond à la recherche.'}
            </p>
          )}
        </div>
      </div>

      {/* Liste des aéroports du pays sélectionné */}
      {selectedCountry && (
        <div className="space-y-4">
          {/* Mode tarifaire par défaut du pays (cascade : sert de défaut aux aéroports sans réglage propre) */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 flex-wrap">
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">Mode par défaut — {selectedCountry}</span>
              <span className="text-gray-400"> — appliqué aux aéroports sans réglage propre</span>
              {!settings[`pricing_mode:${selectedCountry.toUpperCase()}`] && (
                <span className="text-gray-400"> (actuel : hérité du global = <b>zone</b>)</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {(['zone', 'kilometrage'] as const).map((m) => {
                const active = settings[`pricing_mode:${selectedCountry.toUpperCase()}`] === m;
                return (
                  <button
                    key={m}
                    disabled={savingMode === `__country_${selectedCountry}`}
                    onClick={() => setCountryMode(m)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${active ? 'bg-primary text-white' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                  >
                    {m === 'zone' ? <Layers size={13} /> : <Route size={13} />}
                    {m === 'zone' ? 'Zones' : 'Kilométrage'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recherche par aéroport */}
          {!loadingAirports && airports.length > 0 && (
            <div className="relative max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={airportSearch}
                onChange={e => setAirportSearch(e.target.value)}
                placeholder="Filtrer les aéroports…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {loadingAirports && (
            <div className="text-center py-8 text-gray-400">Chargement des aéroports…</div>
          )}

          {!loadingAirports && airports.length === 0 && (
            <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-gray-100">
              Aucun aéroport opéré pour {selectedCountry}.<br />
              <span className="text-xs">Activez des aéroports dans la section « Aéroports ».</span>
            </div>
          )}

          {filteredAirports.map((airport) => {
            const isOpen  = expandedAirport === airport.iataCode;
            const zones   = (zonesByAirport[airport.iataCode] ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
            const currency = zones[0]?.currency ?? 'XAF';

            return (
              <div key={airport.iataCode} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Header aéroport */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedAirport(isOpen ? null : airport.iataCode)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plane size={16} className="text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">
                        {airport.iataCode} — {airport.name}
                      </div>
                      <div className="text-xs text-gray-500">{airport.city} · {zones.length} zone{zones.length !== 1 ? 's' : ''} · {currency}</div>
                    </div>
                  </div>
                  {isOpen ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                </button>

                {/* Zones de l'aéroport */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {/* Sélecteur de mode tarifaire (cascade aéroport → pays → global) */}
                    <div className="flex items-center justify-between gap-3 px-5 py-3 bg-gray-50/60 border-b border-gray-100 flex-wrap">
                      <div className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">Mode tarifaire</span>
                        <span className="text-gray-400"> — comment cet aéroport facture chaque course</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(['zone', 'kilometrage'] as const).map((m) => {
                          const active = resolveMode(airport.iataCode) === m;
                          return (
                            <button
                              key={m}
                              disabled={savingMode === airport.iataCode}
                              onClick={() => setAirportMode(airport.iataCode, m)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${active ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                              {m === 'zone' ? <Layers size={13} /> : <Route size={13} />}
                              {m === 'zone' ? 'Zones' : 'Kilométrage'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {resolveMode(airport.iataCode) === 'kilometrage' && (
                      <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
                        Mode <b>kilométrage</b> actif : le prix est calculé par la formule au km (page <b>Tarifs &amp; Points</b>, par véhicule/pays). Les zones ci-dessous sont <b>ignorées</b> pour cet aéroport.
                      </div>
                    )}
                    {zones.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Zone</th>
                              <th className="text-center px-3 py-2.5 font-medium text-gray-600">Distance</th>
                              {vehicleTypes.map((v) => (
                                <th key={v.id} className="text-center px-3 py-2.5 font-medium text-gray-600">{v.label}</th>
                              ))}
                              <th className="text-center px-3 py-2.5 font-medium text-gray-600">Devise</th>
                              <th className="text-center px-3 py-2.5 font-medium text-gray-600">Statut</th>
                              <th className="px-3 py-2.5 w-20" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {zones.map((z) => (
                              <tr key={z.id} className={`hover:bg-gray-50 ${!z.isActive ? 'opacity-50' : ''}`}>
                                <td className="px-4 py-3 font-medium text-gray-900">{z.name}</td>
                                <td className="px-3 py-3 text-center text-gray-600 whitespace-nowrap">
                                  {z.minDistKm}–{z.maxDistKm} km
                                </td>
                                {vehicleTypes.map((v) => (
                                  <td key={v.id} className="px-3 py-3 text-center text-gray-700">
                                    {z.prices[v.id] !== undefined
                                      ? z.prices[v.id]!.toLocaleString()
                                      : <span className="text-gray-300">—</span>}
                                  </td>
                                ))}
                                <td className="px-3 py-3 text-center">
                                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    {z.currency}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${z.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {z.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-1 justify-end">
                                    <button onClick={() => openEdit(z)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg">
                                      <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => remove(z)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-gray-400 text-sm">
                        Aucune zone configurée pour cet aéroport
                      </div>
                    )}

                    {/* Bouton Ajouter zone */}
                    <div className="px-4 py-3 border-t border-gray-50">
                      <button
                        onClick={() => openNewZone(airport)}
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
                      >
                        <Plus size={15} /> Ajouter une zone
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal édition / création */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="font-semibold text-gray-900">{isNew ? 'Nouvelle zone' : 'Modifier la zone'}</h2>
                {editing.airportIata && (
                  <p className="text-xs text-gray-500 mt-0.5">Aéroport {editing.airportIata}</p>
                )}
              </div>
              <button onClick={cancel} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

              {/* Nom */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nom de la zone</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Ex: Zone 1 — 0-5 km"
                />
              </div>

              {/* Distance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Distance min (km)</label>
                  <input
                    type="number" min={0}
                    value={editing.minDistKm}
                    onChange={(e) => setEditing({ ...editing, minDistKm: +e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Distance max (km)</label>
                  <input
                    type="number" min={1}
                    value={editing.maxDistKm}
                    onChange={(e) => setEditing({ ...editing, maxDistKm: +e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Devise */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Devise</label>
                <select
                  value={editing.currency}
                  onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Prix par type de véhicule */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Prix par type de véhicule
                  <span className="text-gray-400 font-normal ml-2">(vide = non disponible)</span>
                </label>
                {vehicleTypes.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">Aucun type de véhicule configuré.</p>
                ) : (
                  <div className="space-y-2">
                    {vehicleTypes.map((v) => (
                      <div key={v.id} className="flex items-center gap-3">
                        <span className="w-32 text-sm text-gray-700 shrink-0">{v.label}</span>
                        <input
                          type="number" min={0} step={100}
                          value={editing.prices[v.id] ?? ''}
                          onChange={(e) => setPrice(v.id, e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="vide = indisponible"
                        />
                        <span className="text-xs text-gray-400 w-10">{editing.currency}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Statut */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox" id="zoneActive"
                  checked={editing.isActive}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="zoneActive" className="text-sm text-gray-700">Zone active</label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={cancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Annuler</button>
              <button
                onClick={save}
                disabled={saving || !editing.name}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
