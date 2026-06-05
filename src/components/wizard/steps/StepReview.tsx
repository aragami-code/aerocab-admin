import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Power, AlertCircle, Loader2 } from 'lucide-react';
import { adminApi } from '../../../services/api';

interface Props {
  code: string;
  settings?: Record<string, string>;
  onActivated: () => void;
}

const CRITERIA: { key: string; label: string }[] = [
  { key: 'currency', label: 'Devise configurée' },
  { key: 'payment_methods', label: 'Moyens de paiement' },
  { key: 'tariffs', label: 'Tarifs' },
  { key: 'operated_airports', label: 'Aéroports opérés' },
];

export function StepReview({ code, onActivated }: Props) {
  const [missing, setMissing] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getCountryReadiness(code);
      setReady(!!r.ready);
      setMissing(r.missing ?? []);
    } catch {
      setError('Impossible de charger l’état du pays.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleActivate = async () => {
    setError('');
    setSuccess('');
    setActivating(true);
    try {
      await adminApi.activateCountry(code);
      setSuccess('Pays activé avec succès.');
      onActivated();
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (/400/.test(msg)) {
        setError('Activation refusée : critères manquants. ' + (missing.join(', ') || ''));
        await load();
      } else {
        setError('Activation impossible : ' + (msg || 'erreur inconnue'));
      }
    } finally {
      setActivating(false);
    }
  };

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
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Power className="w-4 h-4 text-primary" /> Récapitulatif & activation
        </h2>
        <div className="space-y-2">
          {CRITERIA.map((c) => {
            const ok = !missing.includes(c.key);
            return (
              <div key={c.key} className="flex items-center gap-2 text-sm">
                {ok ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                <span className={ok ? 'text-gray-700' : 'text-red-600'}>{c.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleActivate}
          disabled={!ready || activating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
          Activer le pays
        </button>
      </div>
    </div>
  );
}
