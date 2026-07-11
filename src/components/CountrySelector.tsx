import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { adminApi } from '../services/api';
import { useCountry } from '../contexts/CountryContext';

interface OperatedCountry {
  code: string;
  name?: string;
  flagEmoji?: string;
}

export function CountrySelector() {
  const { selected, setSelected } = useCountry();
  const [countries, setCountries] = useState<OperatedCountry[]>([]);

  useEffect(() => {
    let active = true;
    adminApi
      .listOperatedCountries()
      .then((list) => {
        if (active && Array.isArray(list)) setCountries(list as OperatedCountry[]);
      })
      .catch(() => {
        // Fail silently: keep only the Global option.
      });
    return () => {
      active = false;
    };
  }, []);

  const isScoped = selected !== 'GLOBAL';

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-1 px-1">
        Pays actif {isScoped && <span className="text-accent">• override</span>}
      </div>
      <div className="relative">
        <Globe
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
            isScoped ? 'text-accent' : 'text-white/70'
          }`}
        />
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          title="Pays sélectionné — porte la configuration par pays"
          className={`w-full appearance-none text-white text-sm font-semibold rounded-xl pl-9 pr-8 py-3 border-2 focus:outline-none transition-all cursor-pointer ${
            isScoped
              ? 'bg-accent/20 border-accent/70 ring-2 ring-accent/30'
              : 'bg-white/15 border-white/30 hover:bg-white/20'
          }`}
        >
          <option value="GLOBAL" className="bg-primary-dark text-white">
            🌍 Global (tous les pays)
          </option>
          {countries.map((c) => (
            <option key={c.code} value={c.code} className="bg-primary-dark text-white">
              {[c.flagEmoji, c.name, `(${c.code})`].filter(Boolean).join(' ')}
            </option>
          ))}
        </select>
        <svg
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
            isScoped ? 'text-accent' : 'text-white/70'
          }`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
