import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const SURGE_KEYS = ['nightSurgeRate', 'rainSurgeRate', 'rushHourSurgeRate'] as const;
type SurgeKey = typeof SURGE_KEYS[number];

interface Forfait {
  id: string;
  name: string;
  airportCode: string;
  destinationName: string;
  destLat: number;
  destLng: number;
  destRadius: number;
  priceAmount: number;
  currency: string;
  countryCode: string;
  vehicleTypes: string[];
  bookingTypes: string[];
  driverPercent: number;
  companyPercent: number;
  nightSurgeRate: number | null;
  rainSurgeRate: number | null;
  rushHourSurgeRate: number | null;
  isActive: boolean;
}

const EMPTY: Partial<Forfait> = {
  name: '',
  airportCode: '', destinationName: '', destLat: 0, destLng: 0, destRadius: 2,
  priceAmount: 0, currency: 'XAF', countryCode: 'CM',
  driverPercent: 85, companyPercent: 15, vehicleTypes: [], bookingTypes: [],
  nightSurgeRate: null, rainSurgeRate: null, rushHourSurgeRate: null,
  isActive: true,
};

export function ForfaitsPage() {
  const [forfaits, setForfaits] = useState<Forfait[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partial<Forfait>>(EMPTY);
  const [isNew, setIsNew] = useState(true);
  const [filterCountry, setFilterCountry] = useState('');

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
  }), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const url = filterCountry
      ? `${API}/forfaits/admin?countryCode=${filterCountry}`
      : `${API}/forfaits/admin`;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setForfaits(await res.json());
    } catch (e) {
      setError('Impossible de charger les forfaits');
      console.error('[ForfaitsPage] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [filterCountry, headers]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing({ ...EMPTY }); setIsNew(true); setShowModal(true); };
  const openEdit = (f: Forfait) => { setEditing({ ...f }); setIsNew(false); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  const save = async () => {
    if ((editing.driverPercent ?? 0) + (editing.companyPercent ?? 0) !== 100) {
      alert('Driver% + Société% doit être égal à 100'); return;
    }
    const url = isNew ? `${API}/forfaits/admin` : `${API}/forfaits/admin/${editing.id}`;
    const method = isNew ? 'POST' : 'PATCH';
    try {
      const res = await fetch(url, { method, headers, body: JSON.stringify(editing) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      closeModal();
      await load();
    } catch {
      alert('Erreur lors de la sauvegarde');
    }
  };

  const toggle = async (f: Forfait) => {
    try {
      const res = await fetch(`${API}/forfaits/admin/${f.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ isActive: !f.isActive }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch {
      alert('Erreur lors du changement de statut');
    }
  };

  const remove = async (f: Forfait) => {
    if (!confirm(`Désactiver "${f.name}" ?`)) return;
    try {
      const res = await fetch(`${API}/forfaits/admin/${f.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  const setField = (key: string, value: unknown) =>
    setEditing(prev => ({ ...prev, [key]: value }));

  const numericFields = [
    { label: 'Nom', key: 'name', type: 'text' },
    { label: 'Code aéroport (IATA)', key: 'airportCode', type: 'text' },
    { label: 'Destination', key: 'destinationName', type: 'text' },
    { label: 'Pays (ISO)', key: 'countryCode', type: 'text' },
    { label: 'Lat destination', key: 'destLat', type: 'number' },
    { label: 'Lng destination', key: 'destLng', type: 'number' },
    { label: 'Rayon détection (km)', key: 'destRadius', type: 'number' },
    { label: 'Prix de base', key: 'priceAmount', type: 'number' },
    { label: 'Devise', key: 'currency', type: 'text' },
    { label: 'Driver %', key: 'driverPercent', type: 'number' },
    { label: 'Société %', key: 'companyPercent', type: 'number' },
    { label: 'Surcharge nuit (×)', key: 'nightSurgeRate', type: 'number' },
    { label: 'Surcharge pluie (×)', key: 'rainSurgeRate', type: 'number' },
    { label: 'Surcharge pointe (×)', key: 'rushHourSurgeRate', type: 'number' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forfaits Trajet</h1>
          <p className="text-sm text-gray-500 mt-1">Prix fixes par route — prioritaires sur le tarif kilométrique</p>
        </div>
        <button type="button" onClick={openNew} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={16} /> Nouveau forfait
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="filterCountry" className="sr-only">Filtrer par pays</label>
        <input
          id="filterCountry"
          type="text" placeholder="Filtrer par pays (ex: CM, FR)"
          value={filterCountry} onChange={e => setFilterCountry(e.target.value.toUpperCase())}
          className="border rounded-lg px-3 py-2 text-sm w-48"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : forfaits.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Aucun forfait configuré</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {['Nom', 'Aéroport', 'Destination', 'Prix', 'Driver%', 'Types', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forfaits.map(f => (
                <tr key={f.id} className={`hover:bg-gray-50 ${!f.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono">{f.airportCode}</span></td>
                  <td className="px-4 py-3">{f.destinationName}</td>
                  <td className="px-4 py-3 font-semibold">{f.priceAmount.toLocaleString()} {f.currency}</td>
                  <td className="px-4 py-3">{f.driverPercent}%</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {f.bookingTypes.length === 0 ? 'Tous' : f.bookingTypes.join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggle(f)} className="text-gray-500 hover:text-blue-600" aria-label={f.isActive ? 'Désactiver' : 'Activer'}>
                      {f.isActive ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button type="button" onClick={() => openEdit(f)} className="text-blue-500 hover:text-blue-700" aria-label="Modifier"><Edit2 size={16} /></button>
                    <button type="button" onClick={() => remove(f)} className="text-red-400 hover:text-red-600" aria-label="Supprimer"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onKeyDown={e => e.key === 'Escape' && closeModal()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
          >
            <h2 id="modal-title" className="text-lg font-bold mb-4">
              {isNew ? 'Nouveau forfait' : 'Modifier le forfait'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {numericFields.map(({ label, key, type }) => {
                const isSurge = (SURGE_KEYS as readonly string[]).includes(key);
                const rawVal = (editing as Record<string, unknown>)[key];
                return (
                  <div key={key}>
                    <label htmlFor={`field-${key}`} className="block text-xs text-gray-500 mb-1">
                      {label}{isSurge && <span className="text-gray-400"> (vide = aucune)</span>}
                    </label>
                    <input
                      id={`field-${key}`}
                      type={type}
                      value={(rawVal as string | number) ?? ''}
                      onChange={e => {
                        if (type === 'number') {
                          const v = e.target.value === '' ? null : parseFloat(e.target.value);
                          // keep null for surge fields when empty, use 0 for required numeric fields
                          setField(key, isSurge ? v : (v ?? 0));
                        } else {
                          setField(key, e.target.value);
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <label htmlFor="field-bookingTypes" className="block text-xs text-gray-500 mb-1">
                Types de booking (ARRIVAL, DEPARTURE, INTERNATIONAL — vide = tous)
              </label>
              <input
                id="field-bookingTypes"
                type="text"
                placeholder="ex: ARRIVAL,DEPARTURE"
                value={(editing.bookingTypes ?? []).join(',')}
                onChange={e => setField('bookingTypes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4">
              <label htmlFor="field-vehicleTypes" className="block text-xs text-gray-500 mb-1">
                Types de véhicule (vide = tous)
              </label>
              <input
                id="field-vehicleTypes"
                type="text"
                placeholder="ex: SEDAN,VAN"
                value={(editing.vehicleTypes ?? []).join(',')}
                onChange={e => setField('vehicleTypes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editing.isActive ?? true}
                onChange={e => setField('isActive', e.target.checked)}
              />
              <label htmlFor="isActive" className="text-sm">Actif</label>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Annuler</button>
              <button type="button" onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
