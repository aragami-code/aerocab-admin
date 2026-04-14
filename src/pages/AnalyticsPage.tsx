import { useState, useEffect } from 'react';
import { TrendingUp, Loader2, DollarSign, Car, Plane, Globe } from 'lucide-react';
import { adminApi } from '../services/api';

type Period = 'day' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  day: "Aujourd'hui",
  week: '7 derniers jours',
  month: '30 derniers jours',
};

const TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  ARRIVAL:       { label: 'Arrivées',       icon: Plane,   color: 'bg-blue-500' },
  DEPARTURE:     { label: 'Départs',        icon: Car,     color: 'bg-purple-500' },
  INTERNATIONAL: { label: 'International',  icon: Globe,   color: 'bg-amber-500' },
};

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('day');
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [period]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getRevenueMetrics(period);
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const byType: Record<string, { count: number; revenue: number }> = metrics?.byType ?? {};
  const types = Object.keys(byType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-800">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Revenus et activité de la plateforme</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 rounded-2xl p-6 text-sm">{error}</div>
      ) : metrics ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm text-slate-500 font-medium">Revenu total</p>
              </div>
              <p className="text-3xl font-bold text-slate-800">{formatFCFA(metrics.totalRevenue)}</p>
              <p className="text-xs text-slate-400 mt-1">{PERIOD_LABELS[period]}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-slate-500 font-medium">Courses complétées</p>
              </div>
              <p className="text-3xl font-bold text-slate-800">{metrics.totalRides}</p>
              <p className="text-xs text-slate-400 mt-1">
                {metrics.totalRides > 0
                  ? `Panier moyen : ${formatFCFA(metrics.totalRevenue / metrics.totalRides)}`
                  : 'Aucune course'}
              </p>
            </div>
          </div>

          {/* By type breakdown */}
          {types.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-800 mb-4">Répartition par type</h2>
              <div className="space-y-4">
                {types.map((type) => {
                  const item = byType[type];
                  const cfg = TYPE_LABELS[type] ?? { label: type, icon: TrendingUp, color: 'bg-slate-400' };
                  const Icon = cfg.icon;
                  const pct = metrics.totalRides > 0 ? Math.round((item.count / metrics.totalRides) * 100) : 0;

                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Icon className="w-4 h-4 text-slate-400" />
                          {cfg.label}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-500">{item.count} courses</span>
                          <span className="font-semibold text-slate-800">{formatFCFA(item.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${cfg.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{pct}% des courses</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {metrics.totalRides === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Aucune donnée pour cette période</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
