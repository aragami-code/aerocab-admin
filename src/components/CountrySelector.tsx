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

  return (
    <div className="relative">
      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        title="Pays sélectionné"
        className="w-full appearance-none bg-white/8 hover:bg-white/12 text-white/90 text-sm font-medium rounded-xl pl-9 pr-8 py-2.5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-colors cursor-pointer"
      >
        <option value="GLOBAL" className="bg-primary-dark text-white">
          Global
        </option>
        {countries.map((c) => (
          <option key={c.code} value={c.code} className="bg-primary-dark text-white">
            {[c.flagEmoji, c.name, `(${c.code})`].filter(Boolean).join(' ')}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
