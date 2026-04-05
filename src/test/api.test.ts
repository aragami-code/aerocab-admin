import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tests unitaires purs sur la logique de l'api client (sans fetch réel)
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
vi.stubGlobal('localStorage', {
  getItem: vi.fn().mockReturnValue('test-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});

// Réimporter après stub
const { adminApi } = await import('../services/api');

const jsonOk = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);

const jsonError = (msg: string, status = 400) =>
  Promise.resolve({ ok: false, status, json: () => Promise.resolve({ message: msg }) } as Response);

beforeEach(() => { vi.clearAllMocks(); });

describe('AdminApiClient', () => {
  describe('getPromos', () => {
    it('appelle GET /promos avec les bons paramètres', async () => {
      mockFetch.mockReturnValue(jsonOk({ data: [], pagination: {} }));
      await adminApi.getPromos(2, 10);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object),
      );
    });
  });

  describe('createPromo', () => {
    it('appelle POST /promos', async () => {
      mockFetch.mockReturnValue(jsonOk({ id: 'p-1', code: 'TEST' }));
      await adminApi.createPromo({ code: 'TEST', discount: 50, maxUses: 10 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/promos'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('togglePromo', () => {
    it('appelle PATCH /promos/:id/toggle', async () => {
      mockFetch.mockReturnValue(jsonOk({ id: 'p-1', isActive: false }));
      await adminApi.togglePromo('p-1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/promos/p-1/toggle'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  describe('deletePromo', () => {
    it('appelle DELETE /promos/:id', async () => {
      mockFetch.mockReturnValue(jsonOk({}));
      await adminApi.deletePromo('p-1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/promos/p-1'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('getAuditLogs', () => {
    it('appelle GET /admin/audit-logs', async () => {
      mockFetch.mockReturnValue(jsonOk({ items: [], total: 0 }));
      await adminApi.getAuditLogs({ entity: 'Booking', limit: 10 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/audit-logs'),
        expect.any(Object),
      );
    });
  });

  describe('gestion des erreurs', () => {
    it('throw avec le message du serveur si !response.ok', async () => {
      mockFetch.mockReturnValue(jsonError('Code invalide'));
      await expect(adminApi.createPromo({ code: 'X', discount: 1, maxUses: 1 }))
        .rejects.toThrow('Code invalide');
    });
  });
});
