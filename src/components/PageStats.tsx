import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { BarChart3, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { adminApi, type AdminStats, type AdminChart } from '../services/api';
import { useCountry } from '../contexts/CountryContext';

type Preset = 'last_7d' | 'last_30d' | 'this_month' | 'this_year' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'last_7d', label: '7 jours' },
  { key: 'last_30d', label: '30 jours' },
  { key: 'this_month', label: 'Ce mois' },
  { key: 'this_year', label: 'Année' },
  { key: 'custom', label: 'Perso' },
];

const PIE_COLORS = ['#1a56db', '#059669', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899'];

const TONE: Record<string, string> = {
  emerald: 'text-emerald-600', red: 'text-red-500', purple: 'text-purple-600',
  amber: 'text-amber-600', blue: 'text-blue-600',
};

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
function fmtVal(value: number, money?: boolean, suffix?: string): string {
  if (money) return fmtMoney(value);
  return `${Math.round(value).toLocaleString('fr-FR')}${suffix ?? ''}`;
}

/** Rend un graphe selon son type (courbe / camembert / barres). */
function ChartBlock({ chart, domain }: { chart: AdminChart; domain: string }) {
  if (chart.kind === 'timeseries') {
    if (chart.data.length === 0) {
      return <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">Aucune donnée sur la période</div>;
    }
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chart.data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <defs>
            {chart.series.map((s) => (
              <linearGradient key={s.key} id={`grad-${domain}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} width={48} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {chart.series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label}
              stroke={s.color} fill={`url(#grad-${domain}-${s.key})`} strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chart.data.length === 0) return <p className="text-xs text-gray-400 py-8 text-center">—</p>;

  if (chart.kind === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={42}>
            {chart.data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // bar
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chart.data} barSize={18} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" interval={0} angle={chart.data.length > 6 ? -30 : 0} textAnchor={chart.data.length > 6 ? 'end' : 'middle'} height={chart.data.length > 6 ? 48 : 24} />
        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} width={40} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }} />
        <Bar dataKey="value" fill={chart.color ?? '#1a56db'} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function presetRange(preset: Preset, from: string, to: string): { from: string; to: string; gran: 'day' | 'month' } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  switch (preset) {
    case 'last_7d':
      return { from: iso(new Date(now.getTime() - 7 * 86400000)), to: iso(now), gran: 'day' };
    case 'last_30d':
      return { from: iso(new Date(now.getTime() - 30 * 86400000)), to: iso(now), gran: 'day' };
    case 'this_month':
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now), gran: 'day' };
    case 'this_year':
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now), gran: 'month' };
    case 'custom': {
      const f = from ? new Date(`${from}T00:00:00.000Z`) : new Date(now.getTime() - 30 * 86400000);
      const t = to ? new Date(`${to}T23:59:59.999Z`) : now;
      const spanDays = (t.getTime() - f.getTime()) / 86400000;
      return { from: iso(f), to: iso(t), gran: spanDays > 92 ? 'month' : 'day' };
    }
  }
}

/**
 * Bande analytique réutilisable (style page Revenus), branchable sur n'importe quelle page.
 * Charge GET /admin/stats/:domain et affiche KPIs + courbe + répartitions.
 * Respecte le pays actif (contexte) et un filtre de période.
 */
export function PageStats({ domain, title = 'Statistiques' }: { domain: string; title?: string }) {
  const { selected: country } = useCountry();
  const [open, setOpen] = useState(true);
  const [preset, setPreset] = useState<Preset>('last_30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = presetRange(preset, from, to);
      const res = await adminApi.getPageStats(domain, { from: r.from, to: r.to, granularity: r.gran, country });
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de chargement des stats');
    } finally {
      setLoading(false);
    }
  }, [domain, preset, from, to, country]);

  useEffect(() => { if (open) load(); }, [open, load]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
      {/* En-tête */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-sm font-semibold text-gray-900 cursor-pointer">
          <BarChart3 className="w-4 h-4 text-primary" />
          {title}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {open && (
          <div className="flex items-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  preset === p.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button onClick={load} className="ml-1 p-1.5 text-gray-500 hover:text-primary transition-colors" title="Rafraîchir">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="p-5">
          {preset === 'custom' && (
            <div className="flex items-center gap-2 mb-4 text-xs">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <span className="text-gray-400">→</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement des statistiques…
            </div>
          ) : error ? (
            <p className="text-sm text-red-500 py-6 text-center">{error}</p>
          ) : !data ? null : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                {data.kpis.map((k) => (
                  <div key={k.label} className="bg-gray-50 rounded-xl p-3.5">
                    <p className="text-xs text-gray-400 mb-1">{k.label}</p>
                    <p className={`text-xl font-bold ${k.tone ? TONE[k.tone] ?? 'text-gray-900' : 'text-gray-900'}`}>
                      {fmtVal(k.value, k.money, k.suffix)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Grille de graphes (timeseries = pleine largeur, pie/bar = compacts) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {data.charts.map((c, idx) => (
                  <div
                    key={`${c.title}-${idx}`}
                    className={`${c.kind === 'timeseries' && (c.span ?? 1) === 2 ? 'md:col-span-2' : ''} bg-gray-50/60 rounded-xl p-4`}
                  >
                    <p className="text-xs font-semibold text-gray-500 mb-2">{c.title}</p>
                    <ChartBlock chart={c} domain={domain} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
