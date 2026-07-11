import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const iconDriver = new L.DivIcon({
  className: '',
  html: `<div style="
    width:38px;height:38px;border-radius:50%;
    background:#2563EB;border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,.45);
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
  ">🚗</div>`,
  iconSize:   [38, 38],
  iconAnchor: [19, 19],
});

const iconPickup = new L.Icon({
  iconUrl:    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl:  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:   [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const iconDest = new L.Icon({
  iconUrl:    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl:  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:   [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// ── Types ─────────────────────────────────────────────────────────────────────
type TrackingData = {
  status:         string;
  destination:    string;
  currency:       string;
  etaMinutes:     number | null;
  driver:         { name: string; vehicle: string; plate: string } | null;
  driverPosition: { lat: number; lng: number; updatedAt: string } | null;
  pickupLat:      number | null;
  pickupLng:      number | null;
  destLat:        number | null;
  destLng:        number | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending:              "Recherche d'un chauffeur",
  confirmed:            'Chauffeur en route',
  arrived_at_airport:   'Chauffeur arrivé',
  in_progress:          'Course en cours',
  passenger_confirming: 'Confirmation d\'arrivée',
  completed:            'Course terminée',
  cancelled:            'Course annulée',
};

const STATUS_COLORS: Record<string, string> = {
  pending:              '#F59E0B',
  confirmed:            '#10B981',
  arrived_at_airport:   '#FBBF24',
  in_progress:          '#3B82F6',
  passenger_confirming: '#F59E0B',
  completed:            '#10B981',
  cancelled:            '#EF4444',
};

const DONE_STATUSES = new Set(['completed', 'cancelled']);
const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace('/api', '');

// ── Map helpers ───────────────────────────────────────────────────────────────
function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap();
  const prev = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!prev.current || prev.current[0] !== pos[0] || prev.current[1] !== pos[1]) {
      map.panTo(pos, { animate: true, duration: 1.2 });
      prev.current = pos;
    }
  }, [map, pos]);
  return null;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || positions.length === 0) return;
    if (positions.length === 1) { map.setView(positions[0], 14); done.current = true; return; }
    map.fitBounds(L.latLngBounds(positions), { padding: [50, 50] });
    done.current = true;
  }, [map, positions]);
  return null;
}

// ── Map component ─────────────────────────────────────────────────────────────
function TrackMap({ data }: { data: TrackingData }) {
  const driverPos: [number, number] | null =
    data.driverPosition ? [data.driverPosition.lat, data.driverPosition.lng] : null;
  const pickupPos: [number, number] | null =
    (data.pickupLat && data.pickupLng) ? [data.pickupLat, data.pickupLng] : null;
  const destPos: [number, number] | null =
    (data.destLat && data.destLng) ? [data.destLat, data.destLng] : null;

  const allPoints = [driverPos, pickupPos, destPos].filter(Boolean) as [number, number][];
  const center: [number, number] = driverPos ?? pickupPos ?? destPos ?? [4.0511, 9.7679];

  // Line: driver → target (pickup if confirmed, destination if in_progress)
  const lineTarget = data.status === 'in_progress' ? destPos : pickupPos;
  const routeLine: [number, number][] = driverPos && lineTarget ? [driverPos, lineTarget] : [];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds positions={allPoints} />
      {driverPos && <FlyTo pos={driverPos} />}

      {/* Driver marker */}
      {driverPos && (
        <Marker position={driverPos} icon={iconDriver}>
          <Popup>{data.driver?.name ?? 'Chauffeur'}<br />{data.driver?.plate}</Popup>
        </Marker>
      )}

      {/* Pickup marker */}
      {pickupPos && data.status !== 'in_progress' && (
        <Marker position={pickupPos} icon={iconPickup}>
          <Popup>Point de prise en charge</Popup>
        </Marker>
      )}

      {/* Destination marker */}
      {destPos && (
        <Marker position={destPos} icon={iconDest}>
          <Popup>Destination : {data.destination}</Popup>
        </Marker>
      )}

      {/* Route line */}
      {routeLine.length === 2 && (
        <Polyline positions={routeLine} color="#2563EB" weight={3} dashArray="8 6" opacity={0.8} />
      )}
    </MapContainer>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function PublicTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData]           = useState<TrackingData | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  const isDone = data ? DONE_STATUSES.has(data.status) : false;

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/track/${token}`);
      if (!res.ok) throw new Error('Lien de suivi invalide ou expiré');
      const json: TrackingData = await res.json();
      setData(json);
      setLastUpdate(new Date());
      setError(null);
      setTick(t => t + 1);
    } catch (e: any) {
      setError(e.message ?? 'Erreur de chargement');
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // OG / document meta
  useEffect(() => {
    if (!data) return;
    document.title = `Suivi AeroGo 24 — ${data.destination}`;
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('og:title',       `Suivi de course AeroGo 24 — ${data.destination}`);
    setMeta('og:description', `Chauffeur : ${data.driver?.name ?? '…'} · ETA ${data.etaMinutes ? `${data.etaMinutes} min` : '—'}`);
    setMeta('og:type',        'website');
  }, [data]);

  const mapsUrl = data?.driverPosition
    ? `https://maps.google.com/?q=${data.driverPosition.lat},${data.driverPosition.lng}`
    : null;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.6)} }
        .pulse-dot { animation: ping 1.4s ease-in-out infinite; }
      `}</style>

      {/* ── Header ── */}
      <div style={S.header}>
        <div style={S.logoRow}>
          <span style={{ fontSize: 26 }}>✈</span>
          <span style={S.logoText}>AeroGo 24</span>
        </div>
        <p style={S.headerSub}>Suivi de course en direct</p>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div style={S.errorCard}>
          <span style={{ fontSize: 40 }}>⚠️</span>
          <p style={S.errorTitle}>Lien invalide ou expiré</p>
          <p style={S.errorDesc}>{error}</p>
        </div>
      )}

      {/* ── Loading state ── */}
      {!error && !data && (
        <div style={S.centerCol}>
          <div style={S.spinner} />
          <p style={S.mutedText}>Chargement…</p>
        </div>
      )}

      {/* ── Main content ── */}
      {!error && data && (
        <div style={S.content}>

          {/* Status badge */}
          <div style={{ ...S.statusCard, borderColor: STATUS_COLORS[data.status] ?? '#ccc' }}>
            <span
              className={!isDone ? 'pulse-dot' : ''}
              style={{ ...S.statusDot, background: STATUS_COLORS[data.status] ?? '#ccc' }}
            />
            <div>
              <p style={{ ...S.statusLabel, color: STATUS_COLORS[data.status] ?? '#fff' }}>
                {STATUS_LABELS[data.status] ?? data.status}
              </p>
              {data.etaMinutes != null && !isDone && (
                <p style={S.etaText}>Arrivée estimée : <strong>{data.etaMinutes} min</strong></p>
              )}
            </div>
          </div>

          {/* Map */}
          <div style={S.mapWrap}>
            <TrackMap data={data} />
          </div>

          {/* Driver card */}
          {data.driver && (
            <div style={S.card}>
              <div style={S.cardIcon}>🧑‍✈️</div>
              <div>
                <p style={S.cardLabel}>Votre chauffeur</p>
                <p style={S.cardValue}>{data.driver.name}</p>
                <p style={S.cardSub}>{data.driver.vehicle} &middot; <strong>{data.driver.plate}</strong></p>
              </div>
            </div>
          )}

          {/* Destination card */}
          <div style={S.card}>
            <div style={S.cardIcon}>📍</div>
            <div>
              <p style={S.cardLabel}>Destination</p>
              <p style={S.cardValue}>{data.destination}</p>
            </div>
          </div>

          {/* Open in Maps */}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" style={S.mapsBtn}>
              🗺️ &nbsp;Voir la position du chauffeur dans Maps
            </a>
          )}

          {/* Last update */}
          {lastUpdate && (
            <p style={S.mutedText}>
              Actualisé à {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              &nbsp;· mise à jour auto toutes les 5 s
            </p>
          )}

        </div>
      )}

      <p style={S.footer}>Propulsé par AeroGo 24</p>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0F172A 0%, #1E3A5F 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0 16px 48px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Poppins, sans-serif',
    color: '#F8FAFC',
  },
  header: {
    width: '100%', maxWidth: 520, padding: '32px 0 20px', textAlign: 'center',
  },
  logoRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6,
  },
  logoText: { fontSize: 22, fontWeight: 700, color: '#F8FAFC' },
  headerSub: { fontSize: 14, color: '#94A3B8', margin: 0 },

  content: { width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 },

  statusCard: {
    background: '#1E293B', border: '2px solid',
    borderRadius: 18, padding: '16px 20px',
    display: 'flex', alignItems: 'center', gap: 14,
  },
  statusDot: { width: 14, height: 14, borderRadius: '50%', flexShrink: 0 },
  statusLabel: { fontSize: 16, fontWeight: 700, margin: 0 },
  etaText: { fontSize: 13, color: '#94A3B8', margin: '3px 0 0' },

  mapWrap: {
    width: '100%', height: 300, borderRadius: 18, overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,.4)',
  },

  card: {
    background: '#1E293B', borderRadius: 14, padding: '14px 18px',
    display: 'flex', alignItems: 'flex-start', gap: 14,
  },
  cardIcon: { fontSize: 22, flexShrink: 0, marginTop: 2 },
  cardLabel: { fontSize: 11, color: '#64748B', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' },
  cardValue: { fontSize: 15, fontWeight: 600, color: '#F8FAFC', margin: 0 },
  cardSub:   { fontSize: 13, color: '#94A3B8', margin: '2px 0 0' },

  mapsBtn: {
    display: 'block', textAlign: 'center',
    background: '#1D4ED8', color: '#fff', textDecoration: 'none',
    borderRadius: 12, padding: '13px 20px', fontWeight: 600, fontSize: 14,
    transition: 'background .2s',
  },

  mutedText: { fontSize: 12, color: '#475569', textAlign: 'center', margin: 0 },

  errorCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    background: '#1E293B', borderRadius: 18, padding: '48px 24px',
    maxWidth: 380, width: '100%',
  },
  errorTitle: { fontSize: 18, fontWeight: 700, margin: 0 },
  errorDesc:  { fontSize: 14, color: '#94A3B8', textAlign: 'center', margin: 0 },

  centerCol: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: 60,
  },
  spinner: {
    width: 40, height: 40, borderRadius: '50%',
    border: '3px solid #334155', borderTop: '3px solid #38BDF8',
    animation: 'spin 0.8s linear infinite',
  },

  footer: { fontSize: 12, color: '#334155', marginTop: 36 },
};
