import { useEffect, useState } from 'react';
import { Plane, AlertCircle, Loader2 } from 'lucide-react';
import { adminApi, type Airport } from '../../../services/api';

interface Props {
  code: string;
  settings?: Record<string, string>;
  onSaved: () => void;
}

export function StepAirports({ code, onSaved }: Props) {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAirportsAdmin({ country: code });
      setAirports(res?.data ?? []);
    } catch {
      setError('Impossible de charger les aéroports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const toggle = async (a: Airport) => {
    setError('');
    setBusy(a.id);
    try {
      await adminApi.setAirportOperated(a.id, !a.isOperated);
      setAirports((list) => list.map((x) => (x.id === a.id ? { ...x, isOperated: !x.isOperated } : x)));
      onSaved();
    } catch (err: any) {
      setError('Mise à jour impossible : ' + (err?.message || 'erreur inconnue'));
    } finally {
      setBusy('');
    }
  };

  const operatedCount = airports.filter((a) => a.isOperated).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Plane className="w-4 h-4 text-primary" /> Aéroports opérés
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          {operatedCount} aéroport{operatedCount > 1 ? 's' : ''} opéré{operatedCount > 1 ? 's' : ''} sur {airports.length}.
        </p>

        {airports.length === 0 ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> Aucun aéroport pour ce pays.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {airports.map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                <div>
                  <span className="font-mono font-semibold text-sm mr-2">{a.iataCode}</span>
                  <span className="text-sm text-gray-700">{a.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{a.city}</span>
                </div>
                <button
                  type="button"
                  disabled={busy === a.id}
                  onClick={() => toggle(a)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${a.isOperated ? 'bg-primary' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${a.isOperated ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
