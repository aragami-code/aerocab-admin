import { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Users,
  Ticket,
  TrendingUp,
  Activity,
  Loader2,
  AlertCircle,
  BarChart2,
  AlertTriangle,
  ShieldAlert,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { adminApi } from '../services/api';
import { useCountry } from '../contexts/CountryContext';

interface Stats {
  totalUsers: number;
  totalDrivers: number;
  pendingDrivers: number;
  approvedDrivers: number;
  activeAccessPasses: number;
  totalRevenue: number;
  bookings?: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
    completedToday: number;
  };
}

interface ChartEntry {
  day: string;
  courses: number;
  revenus: number;
}

const formatFCFA = (amount: number) =>
  new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

// Tooltip personnalisé
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name} : {p.dataKey === 'revenus' ? formatFCFA(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartEntry[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [withdrawalStats, setWithdrawalStats] = useState<{
    total: number;
    byStatus: { pending: number; approved: number; paid: number; rejected: number };
    totalPaidAmount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMetric, setActiveMetric] = useState<'courses' | 'revenus'>('courses');
  const { selected } = useCountry();
  const countryParam = selected === 'GLOBAL' ? undefined : selected;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [statsData, chart, reports, wStats] = await Promise.all([
        adminApi.getStats(countryParam),
        adminApi.getChartData(countryParam),
        Promise.all([
          adminApi.getReports({ status: 'open', limit: 5 }).catch(() => ({ data: [] })),
          adminApi.getReports({ status: 'investigating', limit: 5 }).catch(() => ({ data: [] })),
        ]).then(([open, inv]) => ({ data: [...(open.data ?? []), ...(inv.data ?? [])] })),
        adminApi.getWithdrawalStats().catch(() => null),
      ]);
      setStats(statsData);
      setChartData(chart);
      setIncidents((reports.data ?? []).slice(0, 5));
      setWithdrawalStats(wStats);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [countryParam]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-gray-500">{error}</p>
        <button
          onClick={load}
          className="text-sm text-primary font-medium hover:underline cursor-pointer"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Chauffeurs approuvés',
      value: String(stats?.approvedDrivers ?? 0),
      subValue: `${stats?.pendingDrivers ?? 0} en attente`,
      icon: Car,
      valueColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Voyageurs inscrits',
      value: String(stats?.totalUsers ?? 0),
      subValue: `${stats?.totalDrivers ?? 0} chauffeurs`,
      icon: Users,
      valueColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Pass actifs (48h)',
      value: String(stats?.activeAccessPasses ?? 0),
      subValue: 'Pass en cours',
      icon: Ticket,
      valueColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Revenus totaux',
      value: formatFCFA(stats?.totalRevenue ?? 0),
      subValue: 'Depuis le lancement',
      icon: TrendingUp,
      valueColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
  ];

  const totalDrivers = stats?.totalDrivers ?? 0;
  const approvedDrivers = stats?.approvedDrivers ?? 0;
  const pendingDrivers = stats?.pendingDrivers ?? 0;
  const rejectedDrivers = Math.max(0, totalDrivers - approvedDrivers - pendingDrivers);

  // Variation 7 derniers jours vs 7 précédents
  const last7 = chartData.slice(-7).reduce((s, d) => s + d.courses, 0);
  const prev7 = chartData.slice(-14, -7).reduce((s, d) => s + d.courses, 0);
  const variation = prev7 > 0 ? (((last7 - prev7) / prev7) * 100).toFixed(1) : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary font-heading">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-1">
          Vue d'ensemble de la plateforme AeroGo 24 Connect
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                  <Icon className={`w-5 h-5 ${stat.iconColor}`} strokeWidth={2} />
                </div>
                <span className="text-xs font-medium text-gray-400">{stat.subValue}</span>
              </div>
              <p className={`text-2xl font-bold tracking-tight ${stat.valueColor}`}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-400 mt-1 font-medium">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Booking Stats */}
      {stats?.bookings && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.bookings.total, color: 'text-gray-700' },
            { label: 'En attente', value: stats.bookings.pending, color: 'text-amber-600' },
            { label: 'En cours', value: stats.bookings.active, color: 'text-blue-600' },
            { label: 'Terminées', value: stats.bookings.completed, color: 'text-emerald-600' },
            { label: 'Annulées', value: stats.bookings.cancelled, color: 'text-red-500' },
            { label: "Aujourd'hui", value: stats.bookings.completedToday, color: 'text-purple-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100/80 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Withdrawal Stats */}
      {withdrawalStats && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-primary" strokeWidth={2.5} />
            <h3 className="text-sm font-semibold text-gray-700">Retraits chauffeurs</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total demandes', value: withdrawalStats.total, color: 'text-gray-700', icon: Wallet },
              { label: 'En attente', value: withdrawalStats.byStatus.pending, color: 'text-amber-600', icon: Clock },
              { label: 'Approuvés', value: withdrawalStats.byStatus.approved, color: 'text-blue-600', icon: CheckCircle },
              { label: 'Payés', value: withdrawalStats.byStatus.paid, color: 'text-emerald-600', icon: CheckCircle },
              { label: 'Rejetés', value: withdrawalStats.byStatus.rejected, color: 'text-red-500', icon: XCircle },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100/80">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-4 h-4 ${s.color} opacity-70`} strokeWidth={2} />
                  </div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" strokeWidth={2} />
              <span className="text-sm text-gray-500">Montant total versé aux chauffeurs</span>
            </div>
            <span className="text-base font-bold text-emerald-600">{formatFCFA(withdrawalStats.totalPaidAmount)}</span>
          </div>
        </div>
      )}

      {/* Graphique + Répartition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Graphique en barres — 15 derniers jours */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" strokeWidth={2.5} />
              <h3 className="font-semibold text-gray-900 text-sm">
                Activité — 15 derniers jours
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {variation !== null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  Number(variation) >= 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-500'
                }`}>
                  {Number(variation) >= 0 ? '+' : ''}{variation}% vs sem. préc.
                </span>
              )}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-medium">
                <button
                  onClick={() => setActiveMetric('courses')}
                  className={`px-3 py-1.5 transition-colors cursor-pointer ${
                    activeMetric === 'courses'
                      ? 'bg-primary text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Courses
                </button>
                <button
                  onClick={() => setActiveMetric('revenus')}
                  className={`px-3 py-1.5 transition-colors cursor-pointer ${
                    activeMetric === 'revenus'
                      ? 'bg-primary text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Revenus
                </button>
              </div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={14} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  width={activeMetric === 'revenus' ? 70 : 30}
                  tickFormatter={activeMetric === 'revenus' ? (v) => `${(v / 1000).toFixed(0)}k` : undefined}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB', radius: 6 }} />
                {activeMetric === 'courses' ? (
                  <Bar
                    dataKey="courses"
                    name="Courses"
                    fill="#1E3A5F"
                    radius={[4, 4, 0, 0]}
                  />
                ) : (
                  <Bar
                    dataKey="revenus"
                    name="Revenus (FCFA)"
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Répartition chauffeurs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-primary" strokeWidth={2.5} />
            <h3 className="font-semibold text-gray-900 text-sm">Répartition chauffeurs</h3>
          </div>
          <div className="space-y-4">
            <QuickStat
              label="Approuvés"
              value={String(approvedDrivers)}
              percentage={totalDrivers > 0 ? (approvedDrivers / totalDrivers) * 100 : 0}
              barColor="bg-emerald-400"
            />
            <QuickStat
              label="En attente"
              value={String(pendingDrivers)}
              percentage={totalDrivers > 0 ? (pendingDrivers / totalDrivers) * 100 : 0}
              barColor="bg-amber-400"
            />
            <QuickStat
              label="Rejetés"
              value={String(rejectedDrivers)}
              percentage={totalDrivers > 0 ? (rejectedDrivers / totalDrivers) * 100 : 0}
              barColor="bg-red-400"
            />
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-500">Utilisateurs</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats?.totalUsers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-gray-500">Revenus totaux</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{formatFCFA(stats?.totalRevenue ?? 0)}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={load}
              className="w-full text-xs text-primary font-medium hover:underline cursor-pointer text-center"
            >
              Actualiser les données
            </button>
          </div>
        </div>
      </div>

      {/* Widget SOS & Incidents */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 mt-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" strokeWidth={2.5} />
            <h3 className="font-semibold text-gray-900 text-sm">Centre SOS & Incidents</h3>
          </div>
          <span className="text-xs font-medium text-gray-400">En temps réel</span>
        </div>

        {incidents.length === 0 ? (
          <div className="flex items-center gap-3 py-4 px-4 bg-emerald-50 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-sm text-emerald-700 font-medium">Aucun incident actif — tout est normal.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((report) => {
              const isSos = report.type === 'sos' || report.category === 'sos';
              return (
                <div key={report.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isSos ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSos ? 'bg-red-500' : 'bg-amber-400'}`}>
                      {isSos
                        ? <ShieldAlert className="w-4 h-4 text-white" />
                        : <AlertTriangle className="w-4 h-4 text-white" />
                      }
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isSos ? 'text-red-700' : 'text-amber-800'}`}>
                        {isSos ? 'SOS déclenché' : 'Incident signalé'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {report.reporter?.name ?? report.reporterUser?.name ?? 'Utilisateur'} · {report.description?.slice(0, 50) ?? '—'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isSos ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                    {isSos ? 'Urgent' : 'En cours'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickStat({
  label,
  value,
  percentage,
  barColor,
}: {
  label: string;
  value: string;
  percentage: number;
  barColor: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}
