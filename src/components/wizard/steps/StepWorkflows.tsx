import { useState } from 'react';
import { Workflow, AlertCircle, Loader2 } from 'lucide-react';
import { adminApi } from '../../../services/api';
import { scopedKey, resolveScopedSetting } from '../../../lib/scopedSetting';

interface Props {
  code: string;
  settings: Record<string, string>;
  onSaved: () => void;
}

const WORKFLOWS: { key: string; label: string }[] = [
  { key: 'arrival', label: 'Arrivée' },
  { key: 'departure', label: 'Départ' },
  { key: 'international', label: 'International' },
];

export function StepWorkflows({ code, settings, onSaved }: Props) {
  const [state, setState] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const w of WORKFLOWS) {
      init[w.key] = resolveScopedSetting(settings, `workflow_${w.key}_enabled`, code, 'true').value === 'true';
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (k: string) => setState((s) => ({ ...s, [k]: !s[k] }));

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      for (const w of WORKFLOWS) {
        await adminApi.setSetting(scopedKey(`workflow_${w.key}_enabled`, code), String(state[w.key]));
      }
      onSaved();
    } catch (err: any) {
      setError('Enregistrement impossible : ' + (err?.message || 'erreur inconnue'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Workflow className="w-4 h-4 text-primary" /> Workflows actifs
        </h2>
        <p className="text-xs text-gray-500 mb-4">Étape facultative — activez les types de courses pour ce pays.</p>
        <div className="space-y-3">
          {WORKFLOWS.map((w) => (
            <label key={w.key} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 cursor-pointer">
              <span className="text-sm font-medium text-gray-800">{w.label}</span>
              <button
                type="button"
                onClick={() => toggle(w.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${state[w.key] ? 'bg-primary' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state[w.key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </label>
          ))}
        </div>
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
