import { useEffect, useState } from 'react';
import { CreditCard, Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { adminApi } from '../../../services/api';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

interface Method {
  id: string;
  label: string;
  icon: string;
}

interface Props {
  code: string;
  settings?: Record<string, string>;
  onSaved: () => void;
}

export function StepPayments({ code, onSaved }: Props) {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await adminApi.getCountryPaymentMethods(code);
        if (active) setMethods(res?.methods?.length ? res.methods : [{ id: 'cash', label: 'Espèces', icon: 'banknote' }]);
      } catch {
        if (active) setMethods([{ id: 'cash', label: 'Espèces', icon: 'banknote' }]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [code]);

  const update = (i: number, k: keyof Method, v: string) =>
    setMethods((m) => m.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const addRow = () => setMethods((m) => [...m, { id: '', label: '', icon: '' }]);
  const removeRow = (i: number) => setMethods((m) => m.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setError('');
    const cleaned = methods
      .map((m) => ({ id: m.id.trim(), label: m.label.trim(), icon: m.icon.trim() }))
      .filter((m) => m.id && m.label);
    if (cleaned.length === 0) {
      setError('Au moins un moyen de paiement (id + libellé) est requis.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.setCountryPaymentMethods(code, cleaned);
      onSaved();
    } catch (err: any) {
      setError('Enregistrement impossible : ' + (err?.message || 'erreur inconnue'));
    } finally {
      setSaving(false);
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
          <CreditCard className="w-4 h-4 text-primary" /> Moyens de paiement
        </h2>
        <div className="space-y-3">
          {methods.map((m, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input value={m.id} onChange={(e) => update(i, 'id', e.target.value)} placeholder="id (ex: cash)" className={inputCls + ' col-span-3 font-mono'} />
              <input value={m.label} onChange={(e) => update(i, 'label', e.target.value)} placeholder="Libellé" className={inputCls + ' col-span-5'} />
              <input value={m.icon} onChange={(e) => update(i, 'icon', e.target.value)} placeholder="icône" className={inputCls + ' col-span-3'} />
              <button onClick={() => removeRow(i)} className="col-span-1 flex justify-center text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addRow} className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline">
          <Plus className="w-4 h-4" /> Ajouter un moyen
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
