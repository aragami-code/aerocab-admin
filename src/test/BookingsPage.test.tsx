import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BookingsPage } from '../pages/BookingsPage';

// Mock react-leaflet and leaflet — they require a real DOM/canvas
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: any) => <div>{children}</div>,
  Popup: ({ children }: any) => <div>{children}</div>,
  Polyline: () => null,
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn() }),
}));

vi.mock('leaflet', () => {
  class MockIcon {
    constructor(_options: any) {}
  }
  class MockLatLngBounds {
    constructor(_args?: any) {}
  }
  const L = {
    Icon: MockIcon,
    latLngBounds: vi.fn(() => new MockLatLngBounds()),
    icon: vi.fn(() => ({})),
  };
  // BookingsPage accesses L.Icon.Default and calls mergeOptions + delete _getIconUrl
  (L.Icon as any).Default = {
    prototype: { _getIconUrl: undefined },
    mergeOptions: vi.fn(),
  };
  return { default: L, ...L };
});

vi.mock('../services/api', () => ({
  adminApi: {
    getBookings: vi.fn(),
    cancelBookingAdmin: vi.fn(),
    getBookingRatings: vi.fn(),
    downloadCsv: vi.fn(),
  },
}));

// Mock the Can component — in tests, always render children
vi.mock('../components/Can', () => ({
  Can: ({ children }: any) => <>{children}</>,
  usePermission: () => true,
}));

import { adminApi } from '../services/api';

const makeBooking = (id: string, status: string, destination: string) => ({
  id,
  status,
  destination,
  passenger: { name: `Passager ${id}`, phone: `+237600000${id}` },
  driverProfile: null,
  departureAirport: 'NSI',
  vehicleType: 'sedan',
  estimatedPrice: 5000,
  distanceKm: null,
  durationMinutes: null,
  bookingType: 'ARRIVAL',
  createdAt: new Date().toISOString(),
  pickupLat: null,
  pickupLng: null,
  destLat: null,
  destLng: null,
});

const emptyResponse = { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };

const threeBookingsResponse = {
  data: [
    makeBooking('1', 'pending', 'Bonanjo'),
    makeBooking('2', 'completed', 'Akwa'),
    makeBooking('3', 'cancelled', 'Deido'),
  ],
  pagination: { total: 3, page: 1, limit: 20, totalPages: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BookingsPage', () => {
  it('se monte sans erreur et affiche le titre', async () => {
    vi.mocked(adminApi.getBookings).mockResolvedValue(emptyResponse);
    render(<BookingsPage />);
    expect(screen.getByText('Réservations')).toBeInTheDocument();
  });

  it('appelle getBookings au montage', async () => {
    vi.mocked(adminApi.getBookings).mockResolvedValue(emptyResponse);
    render(<BookingsPage />);
    await waitFor(() => expect(adminApi.getBookings).toHaveBeenCalled());
  });

  it('affiche "Aucune réservation trouvée" quand la liste est vide', async () => {
    vi.mocked(adminApi.getBookings).mockResolvedValue(emptyResponse);
    render(<BookingsPage />);
    await waitFor(() =>
      expect(screen.getByText('Aucune réservation trouvée')).toBeInTheDocument()
    );
  });

  it('affiche les 3 réservations dans le tableau', async () => {
    vi.mocked(adminApi.getBookings).mockResolvedValue(threeBookingsResponse);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Bonanjo')).toBeInTheDocument();
      expect(screen.getByText('Akwa')).toBeInTheDocument();
      expect(screen.getByText('Deido')).toBeInTheDocument();
    });
  });

  it('affiche les noms des passagers', async () => {
    vi.mocked(adminApi.getBookings).mockResolvedValue(threeBookingsResponse);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Passager 1')).toBeInTheDocument();
      expect(screen.getByText('Passager 2')).toBeInTheDocument();
      expect(screen.getByText('Passager 3')).toBeInTheDocument();
    });
  });

  it('affiche les statuts corrects pour chaque réservation', async () => {
    vi.mocked(adminApi.getBookings).mockResolvedValue(threeBookingsResponse);
    render(<BookingsPage />);
    await waitFor(() => {
      // "En attente" appears in the select option AND in the table row — use getAllByText
      expect(screen.getAllByText('En attente').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Terminée').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Annulée').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('le filtre de statut est présent et déclenche un rechargement', async () => {
    vi.mocked(adminApi.getBookings).mockResolvedValue(emptyResponse);
    render(<BookingsPage />);
    await waitFor(() => screen.getByText('Réservations'));
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'completed' } });
    await waitFor(() =>
      expect(adminApi.getBookings).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      )
    );
  });

  it('le filtre "Tous les statuts" recharge sans filtre de statut', async () => {
    vi.mocked(adminApi.getBookings).mockResolvedValue(emptyResponse);
    render(<BookingsPage />);
    await waitFor(() => screen.getByText('Réservations'));
    const select = screen.getByRole('combobox');
    // Set to completed first, then back to all
    fireEvent.change(select, { target: { value: 'completed' } });
    fireEvent.change(select, { target: { value: '' } });
    await waitFor(() =>
      expect(adminApi.getBookings).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined })
      )
    );
  });

  it('affiche une erreur si getBookings échoue', async () => {
    vi.mocked(adminApi.getBookings).mockRejectedValue(new Error('Erreur réseau'));
    render(<BookingsPage />);
    await waitFor(() => expect(screen.getByText('Erreur réseau')).toBeInTheDocument());
  });

  it('le champ de recherche est présent', async () => {
    vi.mocked(adminApi.getBookings).mockResolvedValue(emptyResponse);
    render(<BookingsPage />);
    expect(
      screen.getByPlaceholderText('Rechercher par passager ou destination...')
    ).toBeInTheDocument();
  });

  it('filtre localement les réservations par destination via la recherche', async () => {
    vi.mocked(adminApi.getBookings).mockResolvedValue(threeBookingsResponse);
    render(<BookingsPage />);
    await waitFor(() => screen.getByText('Bonanjo'));
    const searchInput = screen.getByPlaceholderText('Rechercher par passager ou destination...');
    fireEvent.change(searchInput, { target: { value: 'Bonanjo' } });
    expect(screen.getByText('Bonanjo')).toBeInTheDocument();
    expect(screen.queryByText('Akwa')).not.toBeInTheDocument();
  });
});
