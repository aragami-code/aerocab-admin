import { useState, useEffect } from 'react';
import { BarChart3, ExternalLink, Activity, Server } from 'lucide-react';
import { adminApi } from '../services/api';

// Dashboards Grafana prédéfinis (IDs à adapter après import)
const GRAFANA_DASHBOARDS = [
  { label: 'Système (CPU / RAM / Disque)', path: '/d/node-exporter/node-exporter-full' },
  { label: 'API NestJS (requêtes / erreurs)', path: '/d/nestjs/nestjs-overview' },
  { label: 'PostgreSQL', path: '/d/postgres/postgresql-database' },
  { label: 'Redis', path: '/d/redis/redis-dashboard' },
];

// Requêtes Prometheus utiles (liens directs)
const PROMETHEUS_QUERIES = [
  { label: 'CPU usage',          query: '100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)' },
  { label: 'RAM utilisée',       query: 'node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes' },
  { label: 'Requêtes API / min', query: 'rate(http_requests_total[1m]) * 60' },
  { label: 'Erreurs 5xx',        query: 'rate(http_requests_total{status=~"5.."}[5m])' },
];

type Tab = 'grafana' | 'prometheus';

export function MetricsPage() {
  const [tab, setTab]           = useState<Tab>('grafana');
  const [dashboardPath, setDashboardPath] = useState(GRAFANA_DASHBOARDS[0].path);
  const [grafanaUrl, setGrafanaUrl]       = useState('https://graphana.aerogo24.com');
  const [prometheusUrl, setPrometheusUrl] = useState('https://prometheus.aerogo24.com');

  useEffect(() => {
    adminApi.getSettings().then(s => {
      if (s['grafana_url'])    setGrafanaUrl(s['grafana_url']);
      if (s['prometheus_url']) setPrometheusUrl(s['prometheus_url']);
    }).catch(() => {});
  }, []);

  const iframeSrc = `${grafanaUrl}${dashboardPath}?kiosk=tv&theme=light`;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8">

      {/* Header */}
      <div className="px-8 pt-8 pb-4 shrink-0 bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold font-heading text-slate-800">Métriques Infra</h1>
            <p className="text-sm text-slate-500 mt-0.5">Grafana · Prometheus — monitoring système & API</p>
          </div>
          <div className="flex gap-2">
            <a
              href={grafanaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Grafana
            </a>
            <a
              href={prometheusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Prometheus
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {([
            { id: 'grafana',     label: 'Grafana',    icon: BarChart3 },
            { id: 'prometheus',  label: 'Prometheus',  icon: Activity  },
          ] as { id: Tab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grafana tab */}
      {tab === 'grafana' && (
        <div className="flex flex-1 min-h-0 gap-0">
          {/* Sélecteur dashboard */}
          <div className="w-56 shrink-0 bg-white border-r border-slate-100 flex flex-col px-3 py-4 gap-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold px-2 mb-2">
              Dashboards
            </p>
            {GRAFANA_DASHBOARDS.map((d) => (
              <button
                key={d.path}
                onClick={() => setDashboardPath(d.path)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  dashboardPath === d.path
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d.label}
              </button>
            ))}
            <div className="mt-auto pt-4 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 px-2 leading-relaxed">
                Si l'iframe est vide, connecte-toi d'abord sur{' '}
                <a href={grafanaUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  graphana.aerogo24.com
                </a>
              </p>
            </div>
          </div>

          {/* iframe Grafana */}
          <div className="flex-1 bg-slate-50">
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              className="w-full h-full border-0"
              title="Grafana Dashboard"
              allow="fullscreen"
            />
          </div>
        </div>
      )}

      {/* Prometheus tab */}
      {tab === 'prometheus' && (
        <div className="flex-1 px-8 py-6 overflow-auto">
          <div className="max-w-3xl space-y-6">

            {/* Info card */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
              <Server className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Accès protégé par mot de passe</p>
                <p className="text-sm text-amber-700 mt-1">
                  Prometheus est accessible sur{' '}
                  <a href={prometheusUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    prometheus.aerogo24.com
                  </a>{' '}
                  avec authentification HTTP basique. Les iframes ne fonctionnent pas avec basicauth.
                </p>
              </div>
            </div>

            {/* Requêtes rapides */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Requêtes rapides</h2>
                <p className="text-xs text-slate-400 mt-0.5">Cliquez pour ouvrir directement dans Prometheus</p>
              </div>
              <div className="divide-y divide-slate-50">
                {PROMETHEUS_QUERIES.map((q) => (
                  <a
                    key={q.label}
                    href={`${prometheusUrl}/graph?g0.expr=${encodeURIComponent(q.query)}&g0.tab=0`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{q.label}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-lg">{q.query}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors shrink-0 ml-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Lien Grafana Explore */}
            <a
              href={`${grafanaUrl}/explore`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <BarChart3 className="w-5 h-5 text-orange-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">Explore dans Grafana</p>
                <p className="text-xs text-slate-400 mt-0.5">Interface Prometheus intégrée dans Grafana — plus ergonomique</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
