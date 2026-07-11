import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  Car,
  Coins,
  Download,
  CheckCircle2,
  Info,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { adminApi, RevenueResponse } from '../services/api';

type Preset = 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';
type Granularity = 'range' | 'monthly';

const PRIMARY = '#1D2C4D';
const PLATFORM_COLOR = '#1D2C4D';
const RIDES_COLOR = '#F59E0B';

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');

const currencyLabel = (code: string) => (code === 'XAF' ? 'FCFA' : code);

function presetRange(preset: Preset, from: string, to: string): { from: string; to: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  switch (preset) {
    case 'this_month': {
      const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      return { from: iso(start), to: iso(now) };
    }
    case 'last_month': {
      const start = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const end = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      end.setMilliseconds(end.getMilliseconds() - 1);
      return { from: iso(start), to: iso(end) };
    }
    case 'this_year': {
      const start = startOfDay(new Date(now.getFullYear(), 0, 1));
      return { from: iso(start), to: iso(now) };
    }
    case 'all': {
      return { from: '2020-01-01T00:00:00.000Z', to: iso(now) };
    }
    case 'custom': {
      const f = from ? new Date(`${from}T00:00:00.000Z`) : startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const t = to ? new Date(`${to}T23:59:59.999Z`) : now;
      return { from: iso(f), to: iso(t) };
    }
  }
}

const PRESET_LABELS: { key: Preset; label: string }[] = [
  { key: 'this_month', label: 'Ce mois' },
  { key: 'last_month', label: 'Mois dernier' },
  { key: 'this_year', label: 'Cette année' },
  { key: 'all', label: 'Cumul' },
  { key: 'custom', label: 'Perso' },
];

export function RevenuePage() {
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [preset, setPreset] = useState<Preset>('this_month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [granularity, setGranularity] = useState<Granularity>('monthly');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const range = presetRange(preset, from, to);
      const res = await adminApi.getRevenue({ from: range.from, to: range.to, granularity });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [preset, from, to, granularity]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const cur = currencyLabel(data.baseCurrency);
    const header = ['Pays', 'Inscription', 'Pass', 'Plateforme', 'Courses', 'TotalLocal', 'Devise', 'TotalBase'];
    const rows = data.byCountry.map((c) => [
      c.country,
      Math.round(c.platform.registration),
      Math.round(c.platform.accessPass),
      Math.round(c.platform.total),
      Math.round(c.rides.total),
      Math.round(c.grandLocal),
      c.currency,
      Math.round(c.grandBase),
    ]);
    rows.push([
      'Total consolidé',
      '',
      '',
      Math.round(data.consolidated.platform),
      Math.round(data.consolidated.rides),
      '',
      cur,
      Math.round(data.consolidated.total),
    ]);
    const csv = [header, ...rows].map((r) => r.join(';')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenus_${data.period.from.slice(0, 10)}_${data.period.to.slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const baseCur = data ? currencyLabel(data.baseCurrency) : 'FCFA';

  const isEmpty =
    !!data &&
    data.consolidated.platform === 0 &&
    data.consolidated.rides === 0 &&
    data.consolidated.total === 0;

  // ── Controls bar (always rendered) ───────────────────────────────────────
  const controls = (
    <div className="flex flex-wrap items-center gap-3 mb-8">
      <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs font-medium">
        {PRESET_LABELS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`px-3.5 py-2 transition-colors cursor-pointer ${
              preset === p.key ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="text-gray-400 text-xs">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs font-medium ml-auto">
        <button
          onClick={() => setGranularity('range')}
          className={`px-3.5 py-2 transition-colors cursor-pointer ${
            granularity === 'range' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Plage
        </button>
        <button
          onClick={() => setGranularity('monthly')}
          className={`px-3.5 py-2 transition-colors cursor-pointer ${
            granularity === 'monthly' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Mensuel
        </button>
      </div>

      <button
        onClick={exportCsv}
        disabled={!data}
        className="flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download className="w-3.5 h-3.5" strokeWidth={2} />
        Export CSV
      </button>
    </div>
  );

  const header = (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-primary font-heading">Revenus</h2>
      <p className="text-sm text-gray-400 mt-1">
        Revenus consolidés multi-pays — plateforme &amp; commissions courses
      </p>
    </div>
  );

  if (loading) {
    return (
      <div>
        {header}
        {controls}
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {header}
        {controls}
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-gray-500">{error}</p>
          <button onClick={load} className="text-sm text-primary font-medium hover:underline cursor-pointer">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        {header}
        {controls}
      </div>
    );
  }

  // KPI cards
  const growth = data.comparison.total.deltaPct;
  const kpiCards = [
    {
      label: 'Total Plateforme',
      value: `${fmt(data.consolidated.platform)} ${baseCur}`,
      icon: Coins,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-600',
    },
    {
      label: 'Total Courses',
      value: `${fmt(data.consolidated.rides)} ${baseCur}`,
      icon: Car,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-600',
    },
    {
      label: 'Grand total consolidé',
      value: `${fmt(data.consolidated.total)} ${baseCur}`,
      icon: Wallet,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-600',
    },
  ];

  // Pie data
  const pieData = [
    { name: 'Plateforme', value: data.consolidated.platform },
    { name: 'Courses', value: data.consolidated.rides },
  ];

  // Comparison bar data
  const comparisonData = [
    { name: 'Plateforme', actuel: data.comparison.platform.current, précédent: data.comparison.platform.previous },
    { name: 'Courses', actuel: data.comparison.rides.current, précédent: data.comparison.rides.previous },
    { name: 'Total', actuel: data.comparison.total.current, précédent: data.comparison.total.previous },
  ];

  // Per-country bar data
  const countryBarData = data.byCountry.map((c) => ({
    country: c.country,
    platform: c.platform.total,
    rides: c.rides.total,
  }));

  return (
    <div>
      {header}
      {controls}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 bg-white rounded-2xl border border-gray-100/80 shadow-sm">
          <Wallet className="w-10 h-10 text-gray-300" />
          <p className="text-sm text-gray-400">Aucun revenu sur cette période</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            {kpiCards.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.label}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.iconBg}`}>
                      <Icon className={`w-5 h-5 ${c.iconColor}`} strokeWidth={2} />
                    </div>
                  </div>
                  <p className={`text-2xl font-bold tracking-tight ${c.valueColor}`}>{c.value}</p>
                  <p className="text-xs text-gray-400 mt-1 font-medium">{c.label}</p>
                </div>
              );
            })}

            {/* Growth card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    growth == null ? 'bg-gray-100' : growth >= 0 ? 'bg-emerald-100' : 'bg-red-100'
                  }`}
                >
                  {growth == null ? (
                    <TrendingUp className="w-5 h-5 text-gray-400" strokeWidth={2} />
                  ) : growth >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-600" strokeWidth={2} />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-500" strokeWidth={2} />
                  )}
                </div>
              </div>
              <p
                className={`text-2xl font-bold tracking-tight ${
                  growth == null ? 'text-gray-400' : growth >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {growth == null ? '—' : `${growth >= 0 ? '↑ ' : '↓ '}${Math.abs(growth).toFixed(1)}%`}
              </p>
              <p className="text-xs text-gray-400 mt-1 font-medium">Croissance · vs période précédente</p>
            </div>
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Tendance */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
              <h3 className="font-semibold text-gray-900 text-sm mb-5">
                Tendance ({baseCur})
              </h3>
              {data.timeseries.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">
                  Aucune donnée disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.timeseries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradPlatform" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PLATFORM_COLOR} stopOpacity={0.7} />
                        <stop offset="95%" stopColor={PLATFORM_COLOR} stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gradRides" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={RIDES_COLOR} stopOpacity={0.7} />
                        <stop offset="95%" stopColor={RIDES_COLOR} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip formatter={(v: any) => `${fmt(Number(v))} ${baseCur}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="platform"
                      name="Plateforme"
                      stackId="1"
                      stroke={PLATFORM_COLOR}
                      fill="url(#gradPlatform)"
                    />
                    <Area
                      type="monotone"
                      dataKey="rides"
                      name="Courses"
                      stackId="1"
                      stroke={RIDES_COLOR}
                      fill="url(#gradRides)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Répartition */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
              <h3 className="font-semibold text-gray-900 text-sm mb-5">Répartition ({baseCur})</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    <Cell fill={PLATFORM_COLOR} />
                    <Cell fill={RIDES_COLOR} />
                  </Pie>
                  <Tooltip formatter={(v: any) => `${fmt(Number(v))} ${baseCur}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            {/* Par pays */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-900 text-sm">Par pays</h3>
                <span className="text-[10px] text-gray-400 font-medium">devise locale</span>
              </div>
              {countryBarData.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">
                  Aucune donnée disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={countryBarData} barSize={16} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="country" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="platform" name="Plateforme" fill={PLATFORM_COLOR} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rides" name="Courses" fill={RIDES_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Actuel vs précédent */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
              <h3 className="font-semibold text-gray-900 text-sm mb-5">Actuel vs précédent ({baseCur})</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comparisonData} barSize={18} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(v: any) => `${fmt(Number(v))} ${baseCur}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="actuel" name="Actuel" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="précédent" name="Précédent" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table par pays */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Détail par pays</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="px-6 py-3 font-medium">Pays</th>
                    <th className="px-6 py-3 font-medium text-right">Inscription</th>
                    <th className="px-6 py-3 font-medium text-right">Pass</th>
                    <th className="px-6 py-3 font-medium text-right">Plateforme</th>
                    <th className="px-6 py-3 font-medium text-right">Courses</th>
                    <th className="px-6 py-3 font-medium text-right">Total (local)</th>
                    <th className="px-6 py-3 font-medium text-right">Total ({baseCur})</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCountry.map((c) => (
                    <tr key={c.country} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-gray-700">{c.country}</td>
                      <td className="px-6 py-3 text-right text-gray-600">
                        {fmt(c.platform.registration)} {currencyLabel(c.currency)}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-600">
                        {fmt(c.platform.accessPass)} {currencyLabel(c.currency)}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-600">
                        {fmt(c.platform.total)} {currencyLabel(c.currency)}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-600">
                        {fmt(c.rides.total)} {currencyLabel(c.currency)}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-gray-700">
                        {fmt(c.grandLocal)} {currencyLabel(c.currency)}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-primary">
                        {fmt(c.grandBase)} {baseCur}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold text-gray-800">
                    <td className="px-6 py-3">Total consolidé</td>
                    <td className="px-6 py-3 text-right text-gray-400">—</td>
                    <td className="px-6 py-3 text-right text-gray-400">—</td>
                    <td className="px-6 py-3 text-right">
                      {fmt(data.consolidated.platform)} {baseCur}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {fmt(data.consolidated.rides)} {baseCur}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-400">—</td>
                    <td className="px-6 py-3 text-right text-primary">
                      {fmt(data.consolidated.total)} {baseCur}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Analyses &amp; propositions</h3>
            {data.insights.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune analyse pour cette période.</p>
            ) : (
              <div className="space-y-3">
                {data.insights.map((ins, i) => {
                  const styles =
                    ins.level === 'good'
                      ? { bg: 'bg-emerald-50', text: 'text-emerald-700', Icon: CheckCircle2, iconColor: 'text-emerald-600' }
                      : ins.level === 'warn'
                        ? { bg: 'bg-amber-50', text: 'text-amber-800', Icon: AlertTriangle, iconColor: 'text-amber-600' }
                        : { bg: 'bg-gray-50', text: 'text-gray-600', Icon: Info, iconColor: 'text-gray-400' };
                  const Icon = styles.Icon;
                  return (
                    <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl ${styles.bg}`}>
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.iconColor}`} strokeWidth={2} />
                      <p className={`text-sm ${styles.text}`}>{ins.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
