import { createContext, useContext, useState, type ReactNode } from 'react';

type CountryCtx = { selected: string; setSelected: (c: string) => void };
const Ctx = createContext<CountryCtx>({ selected: 'GLOBAL', setSelected: () => {} });

export function CountryProvider({ children }: { children: ReactNode }) {
  const [selected, set] = useState<string>(() => localStorage.getItem('admin_country') ?? 'GLOBAL');
  const setSelected = (c: string) => { localStorage.setItem('admin_country', c); set(c); };
  return <Ctx.Provider value={{ selected, setSelected }}>{children}</Ctx.Provider>;
}
export const useCountry = () => useContext(Ctx);
