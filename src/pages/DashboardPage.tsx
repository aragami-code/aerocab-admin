import { useState, useEffect } from 'react';
import {
  Car,
  Users,
  Ticket,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../services/api';

interface Stats {
  totalUsers: number;
  totalDrivers: number;
  pendingDrivers: number;
  approvedDrivers: number;
  activeAccessPasses: number;
  totalRevenue: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

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
          onClick={loadStats}
          className="text-sm text-primary font-medium hover:underline cursor-pointer"
        >
          Reessayer
        </button>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Chauffeurs approuves',
      value: String(stats?.approvedDrivers ?? 0),
      subValue: `${stats?.pendingDrivers ?? 0} en attente`,
      icon: Car,
      color: 'bg-emerald-50 text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Voyageurs inscrits',
      value: String(stats?.totalUsers ?? 0),
      subValue: `${stats?.totalDrivers ?? 0} chauffeurs`,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Acces actifs (48h)',
      value: String(stats?.activeAccessPasses ?? 0),
      subValue: 'Pass en cours',
      icon: Ticket,
      color: 'bg-amber-50 text-amber-600',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Revenus totaux',
      value: formatFCFA(stats?.totalRevenue ?? 0),
      subValue: 'Depuis le lancement',
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100',
    },
  ];

  const totalDrivers = stats?.totalDrivers ?? 0;
  const approvedDrivers = stats?.approvedDrivers ?? 0;
  const pendingDrivers = stats?.pendingDrivers ?? 0;
  const rejectedDrivers = totalDrivers - approvedDrivers - pendingDrivers;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary font-heading">
          Dashboard
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Vue d'ensemble de la plateforme AeroCab Connect
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md hover:border-gray-200/80 transition-all duration-200 cursor-default"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.iconBg}`}
                >
                  <Icon
                    className={`w-5 h-5 ${stat.color.split(' ')[1]}`}
                    strokeWidth={2}
                  />
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-400 px-2 py-1">
                  {stat.subValue}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs text-gray-400 mt-1 font-medium">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Stats Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-primary" strokeWidth={2.5} />
            <h3 className="font-semibold text-gray-900 text-sm">
              Repartition chauffeurs
            </h3>
          </div>
          <div className="space-y-4">
            <QuickStat
              label="Chauffeurs approuves"
              value={String(approvedDrivers)}
              percentage={totalDrivers > 0 ? (approvedDrivers / totalDrivers) * 100 : 0}
              barColor="bg-emerald-400"
            />
            <QuickStat
              label="Chauffeurs en attente"
              value={String(pendingDrivers)}
              percentage={totalDrivers > 0 ? (pendingDrivers / totalDrivers) * 100 : 0}
              barColor="bg-amber-400"
            />
            <QuickStat
              label="Chauffeurs rejetes"
              value={String(rejectedDrivers > 0 ? rejectedDrivers : 0)}
              percentage={totalDrivers > 0 ? (Math.max(0, rejectedDrivers) / totalDrivers) * 100 : 0}
              barColor="bg-red-400"
            />
          </div>
        </div>

        {/* Platform overview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
          <h3 className="font-semibold text-gray-900 text-sm mb-5">
            Apercu plateforme
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-600">Total utilisateurs</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats?.totalUsers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-gray-600">Total chauffeurs</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats?.totalDrivers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-gray-600">Pass actifs</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats?.activeAccessPasses ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-gray-600">Revenus</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{formatFCFA(stats?.totalRevenue ?? 0)}</span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <button
              onClick={loadStats}
              className="w-full text-xs text-primary font-medium hover:underline cursor-pointer text-center"
            >
              Actualiser les donnees
            </button>
          </div>
        </div>
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
