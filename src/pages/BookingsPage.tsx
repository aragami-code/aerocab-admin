import { useState, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import {
  Search, CheckCircle, Clock, Car, Loader2,
  AlertCircle, ChevronLeft, ChevronRight, Ban, ArrowLeft,
  MapPin, Phone, Navigation, Download, Star,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { adminApi } from '../services/api';
import { Can } from '../components/Can';

class MapErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message + '\n' + e.stack }; }
  componentDidCatch(e: Error, info: ErrorInfo) { console.error('MapErrorBoundary:', e, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 whitespace-pre-wrap overflow-auto max-h-[340px]">
          <strong>Erreur carte :</strong>{'\n'}{this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

// Fix icônes Leaflet avec Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const iconGreen = new L.Icon({
  iconUrl:       'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
  shadowSize:    [41, 41],
});

const iconRed = new L.Icon({
  iconUrl:       'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
  shadowSize:    [41, 41],
});

// Ajuste la vue selon les markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 14);
    }
  }, [map, positions]);
  return null;
}

// ── Carte interactive Leaflet ─────────────────────────────────────────────────
function BookingMap({ booking }: { booking: any }) {
  const hasPickup = booking.pickupLat && booking.pickupLng;
  const hasDest   = booking.destLat && booking.destLng;
  const [route, setRoute] = useState<[number, number][]>([]);

  const pickupPos: [number, number] | null = hasPickup
    ? [Number(booking.pickupLat), Number(booking.pickupLng)] : null;
  const destPos: [number, number] | null = hasDest
    ? [Number(booking.destLat), Number(booking.destLng)] : null;

  const positions = [pickupPos, destPos].filter(Boolean) as [number, number][];
  const center: [number, number] = positions[0] ?? [4.0511, 9.7679];

  // Tracé d'itinéraire via OSRM (routing gratuit)
  useEffect(() => {
    if (!pickupPos || !destPos) return;
    const url = `https://router.project-osrm.org/route/v1/driving/` +
      `${pickupPos[1]},${pickupPos[0]};${destPos[1]},${destPos[0]}` +
      `?overview=full&geometries=geojson`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const coords = data.routes?.[0]?.geometry?.coordinates;
        if (coords) setRoute(coords.map(([lng, lat]: [number, number]) => [lat, lng]));
      })
      .catch(() => {
        // fallback : ligne droite
        if (pickupPos && destPos) setRoute([pickupPos, destPos]);
      });
  }, [booking.pickupLat, booking.pickupLng, booking.destLat, booking.destLng]);

  if (!hasPickup && !hasDest) {
    return (
      <div className="flex flex-col items-center justify-center h-[340px] gap-2 text-gray-400 bg-gray-50">
        <Navigation className="w-8 h-8" />
        <p className="text-sm">Coordonnées GPS non disponibles</p>
        {booking.destination && <p className="text-xs text-gray-500">{booking.destination}</p>}
      </div>
    );
  }

  return (
    <div className="relative" style={{ height: 340 }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />
        {pickupPos && (
          <Marker position={pickupPos} icon={iconGreen}>
            <Popup>Prise en charge<br /><small>{booking.departureAirport ?? ''}</small></Popup>
          </Marker>
        )}
        {destPos && (
          <Marker position={destPos} icon={iconRed}>
            <Popup>Destination<br /><small>{booking.destination ?? ''}</small></Popup>
          </Marker>
        )}
        {route.length > 1 && (
          <Polyline positions={route} color="#1a56db" weight={5} opacity={0.8} />
        )}
      </MapContainer>
      {pickupPos && destPos && (
        <a
          href={`https://www.google.com/maps/dir/${pickupPos[0]},${pickupPos[1]}/${destPos[0]},${destPos[1]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary/90 hover:bg-primary rounded-xl shadow-sm transition-colors"
        >
          <Navigation className="w-3 h-3" />
          Ouvrir dans Maps
        </a>
      )}
    </div>
  );
}

// ── Détail réservation ─────────────────────────────────────────────────────────
function StarRating({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= score ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  );
}

function BookingDetail({ booking, onBack, onCancel }: {
  booking: any;
  onBack: () => void;
  onCancel: () => void;
}) {
  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const [ratings, setRatings] = useState<any[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  useEffect(() => {
    if (booking.status !== 'completed') return;
    setRatingsLoading(true);
    adminApi.getBookingRatings(booking.id)
      .then(r => { setRatings(r.ratings ?? []); setRatingsLoading(false); })
      .catch(() => setRatingsLoading(false));
  }, [booking.id, booking.status]);

  const timeline = [
    { label: 'Course acceptée',  done: true },
    { label: 'Chauffeur en route', done: ['arrived_at_airport','in_progress','completed'].includes(booking.status) },
    { label: 'Chauffeur arrivé', done: ['in_progress','completed'].includes(booking.status) },
    { label: 'Course en cours',  done: ['in_progress','completed'].includes(booking.status), active: booking.status === 'in_progress' },
    { label: 'Course terminée',  done: booking.status === 'completed' },
  ];

  const canCancel = !['completed','cancelled'].includes(booking.status);

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="flex gap-2">
          {booking.passenger?.phone && (
            <a
              href={`tel:${booking.passenger.phone}`}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Passager
            </a>
          )}
          {booking.driverProfile?.user?.phone && (
            <a
              href={`tel:${booking.driverProfile.user.phone}`}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Car className="w-3.5 h-3.5" /> Chauffeur
            </a>
          )}
          {canCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" /> Annuler
            </button>
          )}
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Statut',   value: cfg.label, color: cfg.classes },
          { label: 'Montant',  value: `${(booking.estimatedPrice ?? 0).toLocaleString()} FCFA` },
          { label: 'Distance', value: booking.distanceKm ? `${booking.distanceKm} km` : '—' },
          { label: 'Durée',    value: booking.durationMinutes ? `${booking.durationMinutes} min` : '—' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-base font-bold ${color ?? 'text-gray-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Carte interactive */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <MapErrorBoundary><BookingMap booking={booking} /></MapErrorBoundary>
        </div>

        {/* Infos + Timeline */}
        <div className="space-y-4">
          {/* Infos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Informations</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Trajet',    value: `${booking.departureAirport ?? '?'} → ${booking.destination ?? '?'}` },
                { label: 'Chauffeur', value: booking.driverProfile?.user?.name ?? 'Non assigné' },
                { label: 'Passager',  value: booking.passenger?.name ?? '—' },
                { label: 'Type',      value: booking.bookingType ?? booking.vehicleType ?? '—' },
                { label: 'Date',      value: new Date(booking.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
                  <span className="text-xs font-semibold text-gray-900 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Timeline</h3>
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-3">
                {timeline.map(({ label, done, active }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                      done && !active  ? 'bg-emerald-100' :
                      active           ? 'bg-amber-100'   : 'bg-gray-100'
                    }`}>
                      {done && !active
                        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        : active
                          ? <Clock className="w-3.5 h-3.5 text-amber-600" />
                          : <div className="w-2 h-2 rounded-full bg-gray-300" />
                      }
                    </div>
                    <p className={`text-xs font-medium ${
                      done && !active ? 'text-gray-700' :
                      active          ? 'text-amber-700 font-semibold' : 'text-gray-400'
                    }`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.status === 'completed' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Notes</h3>
              {ratingsLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…
                </div>
              ) : ratings.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune note pour cette course.</p>
              ) : (
                <div className="space-y-3">
                  {ratings.map((r: any) => {
                    const isPassenger = r.fromUser?.role === 'passenger';
                    return (
                      <div key={r.id} className="rounded-xl border border-gray-100 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPassenger ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {isPassenger ? 'Passager → Chauffeur' : 'Chauffeur → Passager'}
                          </span>
                          <StarRating score={r.score} />
                        </div>
                        <p className="text-xs text-gray-500">
                          De <span className="font-medium text-gray-800">{r.fromUser?.name ?? '—'}</span>
                          {' '}à <span className="font-medium text-gray-800">{r.toUser?.name ?? '—'}</span>
                        </p>
                        {r.comment && (
                          <p className="text-xs text-gray-600 italic">"{r.comment}"</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending:            { label: 'En attente',   classes: 'text-amber-600 bg-amber-50' },
  confirmed:          { label: 'Confirmée',     classes: 'text-blue-600 bg-blue-50' },
  arrived_at_airport: { label: 'Chauffeur arrivé', classes: 'text-indigo-600 bg-indigo-50' },
  in_progress:        { label: 'En cours',      classes: 'text-purple-600 bg-purple-50' },
  completed:          { label: 'Terminée',      classes: 'text-emerald-600 bg-emerald-50' },
  cancelled:          { label: 'Annulée',       classes: 'text-red-500 bg-red-50' },
};

export function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 20 });
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      await adminApi.downloadCsv('/admin/export/bookings', 'bookings.csv');
    } catch { /* ignore */ } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, [statusFilter, page]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.getBookings({ status: statusFilter || undefined, page, limit: 20 });
      setBookings(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string, destination: string) => {
    if (!window.confirm(`Annuler la réservation vers "${destination}" ?`)) return;
    try {
      setCancellingId(id);
      await adminApi.cancelBookingAdmin(id);
      await loadBookings();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'annulation');
    } finally {
      setCancellingId(null);
    }
  };

  // Vue détail
  if (selectedBooking) {
    return (
      <BookingDetail
        booking={selectedBooking}
        onBack={() => setSelectedBooking(null)}
        onCancel={async () => {
          await handleCancel(selectedBooking.id, selectedBooking.destination);
          setSelectedBooking(null);
        }}
      />
    );
  }

  const filtered = search
    ? bookings.filter((b) =>
        (b.destination || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.passenger?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.passenger?.phone || '').includes(search)
      )
    : bookings;

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-primary font-heading">Réservations</h2>
          <p className="text-sm text-gray-400 mt-1">Suivi et gestion de toutes les courses</p>
        </div>
        <div className="flex items-center gap-2">
          <Can permission="view_stats">
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Exporter CSV
            </button>
          </Can>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="confirmed">Confirmées</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminées</option>
          <option value="cancelled">Annulées</option>
          </select>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par passager ou destination..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-gray-500">{error}</p>
          <button onClick={loadBookings} className="text-sm text-primary font-medium hover:underline cursor-pointer">Réessayer</button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Passager</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Destination</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Chauffeur</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Statut</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Prix</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Date</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                      Aucune réservation trouvée
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => {
                    const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
                    const canCancel = !['completed', 'cancelled'].includes(b.status);
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-900">{b.passenger?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{b.passenger?.phone || ''}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-700 max-w-[160px] truncate">{b.destination || '—'}</p>
                          <p className="text-xs text-gray-400">{b.departureAirport || ''} · {b.vehicleType?.toUpperCase() || ''}</p>
                        </td>
                        <td className="px-5 py-4">
                          {b.driverProfile ? (
                            <div>
                              <p className="text-sm text-gray-700">{b.driverProfile.user?.name || '—'}</p>
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${b.driverProfile.driverType === 'internal' ? 'text-primary bg-primary/10' : 'text-emerald-700 bg-emerald-50'}`}>
                                {b.driverProfile.driverType === 'internal' ? 'Flotte AeroGo' : 'Partenaire'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Non assigné</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg ${cfg.classes}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {(b.estimatedPrice ?? 0).toLocaleString()} pts
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs text-gray-500">{formatDate(b.createdAt)}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedBooking(b)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer hover:bg-primary/10"
                            >
                              <MapPin className="w-3 h-3" />
                              Voir
                            </button>
                            {canCancel && (
                              <button
                                onClick={() => handleCancel(b.id, b.destination)}
                                disabled={cancellingId === b.id}
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {cancellingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                                Annuler
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-gray-400">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} réservations)
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(page + 1)} disabled={page >= pagination.totalPages} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
