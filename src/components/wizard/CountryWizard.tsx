import { useEffect, useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { adminApi } from '../../services/api';
import { STEPS, firstMissingStep, stepBlockingSatisfied } from './wizardLogic';
import { StepInfos } from './steps/StepInfos';
import { StepPayments } from './steps/StepPayments';
import { StepTariffs } from './steps/StepTariffs';
import { StepWorkflows } from './steps/StepWorkflows';
import { StepAirports } from './steps/StepAirports';
import { StepAdvanced } from './steps/StepAdvanced';
import { StepReview } from './steps/StepReview';

const STEP_LABELS: Record<string, string> = {
  infos: 'Infos',
  payments: 'Paiement',
  tariffs: 'Tarifs',
  workflows: 'Workflows',
  airports: 'Aéroports',
  advanced: 'Avancé',
  review: 'Activation',
};

interface Props {
  mode: 'create' | 'complete';
  initialCode?: string;
  onClose: () => void;
  onChanged: () => void;
}

export function CountryWizard({ mode, initialCode, onClose, onChanged }: Props) {
  const [code, setCode] = useState<string>(initialCode ?? '');
  const [current, setCurrent] = useState(0);
  const [missing, setMissing] = useState<string[]>(['currency', 'payment_methods', 'tariffs', 'operated_airports']);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [existingCodes, setExistingCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(mode === 'complete');
  // Étapes non bloquantes visitées (pour cocher leur pastille).
  const [visited, setVisited] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      if (mode === 'complete' && initialCode) {
        setLoading(true);
        try {
          const [r, s] = await Promise.all([adminApi.getCountryReadiness(initialCode), adminApi.getSettings()]);
          if (!active) return;
          const miss = r.missing ?? [];
          setMissing(miss);
          setSettings(s ?? {});
          setCurrent(firstMissingStep(miss));
        } catch {
          /* keep defaults */
        } finally {
          if (active) setLoading(false);
        }
      } else {
        // create mode
        try {
          const [s, list] = await Promise.all([adminApi.getSettings(), adminApi.listOperatedCountries()]);
          if (active) {
            setSettings(s ?? {});
            setExistingCodes((list ?? []).map((c: any) => String(c.code).toUpperCase()));
          }
        } catch {
          /* ignore */
        }
        if (active) setCurrent(0);
      }
    })();
    return () => {
      active = false;
    };
  }, [mode, initialCode]);

  const refreshReadiness = async (cc: string) => {
    try {
      const r = await adminApi.getCountryReadiness(cc);
      setMissing(r.missing ?? []);
    } catch {
      /* ignore */
    }
  };

  const reloadSettings = async () => {
    try {
      const s = await adminApi.getSettings();
      setSettings(s ?? {});
    } catch {
      /* ignore */
    }
  };

  const advance = () => setCurrent((c) => Math.min(c + 1, STEPS.length - 1));

  // Sauvegarde générique d'une étape : refresh readiness (+ settings selon étape) puis avance.
  const handleSaved = async () => {
    const stepId = STEPS[current];
    setVisited((v) => ({ ...v, [current]: true }));
    if (code) await refreshReadiness(code);
    if (stepId === 'workflows' || stepId === 'advanced') await reloadSettings();
    if (stepId !== 'review') advance();
  };

  const handleCreated = async (newCode: string) => {
    setCode(newCode);
    setVisited((v) => ({ ...v, 0: true }));
    await refreshReadiness(newCode);
    advance();
  };

  const handleActivated = () => {
    onChanged();
    onClose();
  };

  // Une pastille est cliquable si toutes les étapes bloquantes précédentes sont satisfaites.
  const canNavigateTo = (i: number): boolean => {
    if (!code) return i === 0;
    for (let j = 0; j < i; j++) {
      if (!stepBlockingSatisfied(j, missing)) return false;
    }
    return true;
  };

  const renderStep = () => {
    const stepId = STEPS[current];
    switch (stepId) {
      case 'infos':
        return <StepInfos mode={mode} code={code} existingCodes={existingCodes} onCreated={handleCreated} onSaved={handleSaved} />;
      case 'payments':
        return <StepPayments code={code} settings={settings} onSaved={handleSaved} />;
      case 'tariffs':
        return <StepTariffs code={code} settings={settings} onSaved={handleSaved} />;
      case 'workflows':
        return <StepWorkflows code={code} settings={settings} onSaved={handleSaved} />;
      case 'airports':
        return <StepAirports code={code} settings={settings} onSaved={handleSaved} />;
      case 'advanced':
        return <StepAdvanced code={code} settings={settings} onSaved={handleSaved} />;
      case 'review':
        return <StepReview code={code} settings={settings} onActivated={handleActivated} />;
      default:
        return null;
    }
  };

  const nextDisabled = !stepBlockingSatisfied(current, missing);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
      <div className="bg-gray-50 rounded-2xl shadow-xl w-full max-w-3xl my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white rounded-t-2xl">
          <h1 className="text-lg font-bold text-gray-900">
            {mode === 'create' ? 'Nouveau pays' : `Configurer ${code}`}
          </h1>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-200 bg-white overflow-x-auto">
          {STEPS.map((s, i) => {
            const isDone = i < current && (stepBlockingSatisfied(i, missing) || !!visited[i]);
            const clickable = canNavigateTo(i);
            const active = i === current;
            return (
              <button
                key={s}
                disabled={!clickable}
                onClick={() => clickable && setCurrent(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-primary text-white'
                    : isDone
                    ? 'bg-green-100 text-green-700'
                    : clickable
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                }`}
              >
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/30">
                  {isDone ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                {STEP_LABELS[s]}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            renderStep()
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl">
          <button
            onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
            disabled={current === 0}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Précédent
          </button>
          {STEPS[current] !== 'review' && (
            <button
              onClick={() => !nextDisabled && advance()}
              disabled={nextDisabled || !code}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
              title={nextDisabled ? 'Complétez cette étape obligatoire' : ''}
            >
              Suivant
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
