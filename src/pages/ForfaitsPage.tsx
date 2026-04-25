import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

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
  airportCode: '', destinationName: '', destLat: 0, destLng: 0, destRadius: 2,
  priceAmount: 0, currency: 'XAF', countryCode: 'CM',
  driverPercent: 85, companyPercent: 15, vehicleTypes: [], bookingTypes: [],
  isActive: true,
};

export function ForfaitsPage() {
  const [forfaits, setForfaits] = useState<Forfait[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partial<Forfait>>(EMPTY);
  const [isNew, setIsNew] = useState(true);
  const [filterCountry, setFilterCountry] = useState('');

  const token = localStorage.getItem('admin_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    const url = filterCountry ? `${API}/forfaits/admin?countryCode=${filterCountry}` : `${API}/forfaits/admin`;
    const res = await fetch(url, { headers });
    if (res.ok) setForfaits(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterCountry]);

  const openNew = () => { setEditing({ ...EMPTY }); setIsNew(true); setShowModal(true); };
  const openEdit = (f: Forfait) => { setEditing({ ...f }); setIsNew(false); setShowModal(true); };

  const save = async () => {
    if ((editing.driverPercent ?? 0) + (editing.companyPercent ?? 0) !== 100) {
      alert('Driver% + Société% doit être égal à 100'); return;
    }
    const url = isNew ? `${API}/forfaits/admin` : `${API}/forfaits/admin/${editing.id}`;
    const method = isNew ? 'POST' : 'PATCH';
    const res = await fetch(url, { method, headers, body: JSON.stringify(editing) });
    if (res.ok) { setShowModal(false); load(); }
    else alert('Erreur lors de la sauvegarde');
  };

  const toggle = async (f: Forfait) => {
    await fetch(`${API}/forfaits/admin/${f.id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ isActive: !f.isActive }),
    });
    load();
  };

  const remove = async (f: Forfait) => {
    if (!confirm(`Désactiver "${f.name}" ?`)) return;
    await fetch(`${API}/forfaits/admin/${f.id}`, { method: 'DELETE', headers });
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forfaits Trajet</h1>
          <p className="text-sm text-gray-500 mt-1">Prix fixes par route — prioritaires sur le tarif kilométrique</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={16} /> Nouveau forfait
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text" placeholder="Filtrer par pays (ex: CM, FR)"
          value={filterCountry} onChange={e => setFilterCountry(e.target.value.toUpperCase())}
          className="border rounded-lg px-3 py-2 text-sm w-48"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
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
                    <button onClick={() => toggle(f)} className="text-gray-500 hover:text-blue-600">
                      {f.isActive ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(f)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16} /></button>
                    <button onClick={() => remove(f)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold mb-4">{isNew ? 'Nouveau forfait' : 'Modifier le forfait'}</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
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
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(editing as any)[key] ?? ''}
                    onChange={e => setEditing(prev => ({ ...prev, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <label className="block text-xs text-gray-500 mb-1">Types de booking (ARRIVAL, DEPARTURE, INTERNATIONAL — vide = tous)</label>
              <input
                type="text"
                placeholder="ex: ARRIVAL,DEPARTURE"
                value={(editing.bookingTypes ?? []).join(',')}
                onChange={e => setEditing(prev => ({ ...prev, bookingTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={editing.isActive ?? true}
                onChange={e => setEditing(prev => ({ ...prev, isActive: e.target.checked }))} />
              <label htmlFor="isActive" className="text-sm">Actif</label>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Annuler</button>
              <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
