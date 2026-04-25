import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AnalyticsPage } from '../pages/AnalyticsPage';

vi.mock('../services/api', () => ({
  adminApi: {
    getRevenueMetrics: vi.fn(),
    getFinancialReport: vi.fn(),
  },
}));

import { adminApi } from '../services/api';

const mockMetrics = {
  totalRevenue: 50000,
  totalRides: 10,
  byType: {
    ARRIVAL: { count: 6, revenue: 30000 },
    DEPARTURE: { count: 4, revenue: 20000 },
  },
};

const emptyMetrics = {
  totalRevenue: 0,
  totalRides: 0,
  byType: {},
};

const mockReport = {
  totalBookings: 10,
  totalRevenue: 50000,
  commission: 7500,
  driverPayouts: 42500,
  byType: {
    ARRIVAL: { count: 6, revenue: 30000 },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AnalyticsPage', () => {
  it('se monte sans erreur', async () => {
    vi.mocked(adminApi.getRevenueMetrics).mockResolvedValue(emptyMetrics);
    render(<AnalyticsPage />);
    // Le titre doit être présent
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('affiche les KPI revenus et courses après chargement', async () => {
    vi.mocked(adminApi.getRevenueMetrics).mockResolvedValue(mockMetrics);
    render(<AnalyticsPage />);
    await waitFor(() => expect(screen.getByText(/50\s*000\s*FCFA/i)).toBeInTheDocument());
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('affiche "Aucune donnée" quand totalRides = 0', async () => {
    vi.mocked(adminApi.getRevenueMetrics).mockResolvedValue(emptyMetrics);
    render(<AnalyticsPage />);
    await waitFor(() =>
      expect(screen.getByText('Aucune donnée pour cette période')).toBeInTheDocument()
    );
  });

  it('affiche les types de courses (Arrivées, Départs)', async () => {
    vi.mocked(adminApi.getRevenueMetrics).mockResolvedValue(mockMetrics);
    render(<AnalyticsPage />);
    await waitFor(() => expect(screen.getByText('Arrivées')).toBeInTheDocument());
    expect(screen.getByText('Départs')).toBeInTheDocument();
  });

  it('les sélecteurs de période sont présents', async () => {
    vi.mocked(adminApi.getRevenueMetrics).mockResolvedValue(emptyMetrics);
    render(<AnalyticsPage />);
    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
    expect(screen.getByText('7 derniers jours')).toBeInTheDocument();
    expect(screen.getByText('30 derniers jours')).toBeInTheDocument();
  });

  it('recharge les métriques quand on change de période', async () => {
    vi.mocked(adminApi.getRevenueMetrics).mockResolvedValue(emptyMetrics);
    render(<AnalyticsPage />);
    await waitFor(() => expect(adminApi.getRevenueMetrics).toHaveBeenCalledWith('day'));
    fireEvent.click(screen.getByText('7 derniers jours'));
    await waitFor(() => expect(adminApi.getRevenueMetrics).toHaveBeenCalledWith('week'));
  });

  it('les inputs de date du rapport financier sont présents', async () => {
    vi.mocked(adminApi.getRevenueMetrics).mockResolvedValue(emptyMetrics);
    render(<AnalyticsPage />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('appelle getFinancialReport au clic sur Générer et affiche les données', async () => {
    vi.mocked(adminApi.getRevenueMetrics).mockResolvedValue(emptyMetrics);
    vi.mocked(adminApi.getFinancialReport).mockResolvedValue(mockReport);
    render(<AnalyticsPage />);
    await waitFor(() => screen.getByText('Générer'));
    fireEvent.click(screen.getByText('Générer'));
    await waitFor(() => expect(adminApi.getFinancialReport).toHaveBeenCalled());
    // Commission plateforme
    await waitFor(() => expect(screen.getByText(/7\s*500\s*FCFA/i)).toBeInTheDocument());
  });

  it("affiche une erreur si getRevenueMetrics échoue", async () => {
    vi.mocked(adminApi.getRevenueMetrics).mockRejectedValue(new Error('Erreur réseau'));
    render(<AnalyticsPage />);
    await waitFor(() => expect(screen.getByText('Erreur réseau')).toBeInTheDocument());
  });
});
