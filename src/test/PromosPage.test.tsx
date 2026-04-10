import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PromosPage } from '../pages/PromosPage';

// Mock adminApi
vi.mock('../services/api', () => ({
  adminApi: {
    getPromos: vi.fn(),
    createPromo: vi.fn(),
    togglePromo: vi.fn(),
    deletePromo: vi.fn(),
  },
}));

import { adminApi } from '../services/api';

const mockPromo = {
  id: 'p-1',
  code: 'TEST50',
  discount: 50,
  maxUses: 100,
  usedCount: 10,
  isActive: true,
  usagePerUser: false,
  expiresAt: null,
  createdAt: new Date().toISOString(),
};

const emptyResponse = { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
const onePromoResponse = { data: [mockPromo], pagination: { total: 1, page: 1, limit: 20, totalPages: 1 } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PromosPage', () => {
  it('affiche "Aucun code promo" quand la liste est vide', async () => {
    vi.mocked(adminApi.getPromos).mockResolvedValue(emptyResponse);
    render(<PromosPage />);
    await waitFor(() => expect(screen.getByText('Aucun code promo')).toBeInTheDocument());
  });

  it('affiche le code promo dans le tableau', async () => {
    vi.mocked(adminApi.getPromos).mockResolvedValue(onePromoResponse);
    render(<PromosPage />);
    await waitFor(() => expect(screen.getByText('TEST50')).toBeInTheDocument());
    expect(screen.getByText('50 pts')).toBeInTheDocument();
  });

  it('affiche le statut "Actif" pour un promo actif', async () => {
    vi.mocked(adminApi.getPromos).mockResolvedValue(onePromoResponse);
    render(<PromosPage />);
    await waitFor(() => expect(screen.getByText('Actif')).toBeInTheDocument());
  });

  it('affiche le statut "Inactif" pour un promo désactivé', async () => {
    vi.mocked(adminApi.getPromos).mockResolvedValue({
      data: [{ ...mockPromo, isActive: false }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    render(<PromosPage />);
    await waitFor(() => expect(screen.getByText('Inactif')).toBeInTheDocument());
  });

  it('affiche le statut "Épuisé" quand usedCount >= maxUses', async () => {
    vi.mocked(adminApi.getPromos).mockResolvedValue({
      data: [{ ...mockPromo, usedCount: 100, maxUses: 100 }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    render(<PromosPage />);
    await waitFor(() => expect(screen.getByText('Épuisé')).toBeInTheDocument());
  });

  it('ouvre le formulaire de création au clic sur "Nouveau code"', async () => {
    vi.mocked(adminApi.getPromos).mockResolvedValue(emptyResponse);
    render(<PromosPage />);
    await waitFor(() => screen.getByText('Nouveau code'));
    fireEvent.click(screen.getByText('Nouveau code'));
    expect(screen.getByText('Créer un code promo')).toBeInTheDocument();
  });

  it('crée un promo et recharge la liste', async () => {
    vi.mocked(adminApi.getPromos).mockResolvedValue(emptyResponse);
    vi.mocked(adminApi.createPromo).mockResolvedValue(mockPromo);
    render(<PromosPage />);
    await waitFor(() => screen.getByText('Nouveau code'));
    fireEvent.click(screen.getByText('Nouveau code'));

    fireEvent.change(screen.getByPlaceholderText('EX: PROMO50'), { target: { value: 'TEST50' } });
    fireEvent.submit(screen.getByText('Créer').closest('form')!);

    await waitFor(() => expect(adminApi.createPromo).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TEST50' })
    ));
  });

  it('appelle togglePromo au clic sur le bouton toggle', async () => {
    vi.mocked(adminApi.getPromos).mockResolvedValue(onePromoResponse);
    vi.mocked(adminApi.togglePromo).mockResolvedValue({ ...mockPromo, isActive: false });
    render(<PromosPage />);
    await waitFor(() => screen.getByTitle('Désactiver'));
    fireEvent.click(screen.getByTitle('Désactiver'));
    await waitFor(() => expect(adminApi.togglePromo).toHaveBeenCalledWith('p-1'));
  });
});
