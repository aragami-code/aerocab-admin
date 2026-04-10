const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class AdminApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  private async request<T>(endpoint: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const { method = 'GET', body } = options;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erreur serveur');
    }

    return data as T;
  }

  // Auth
  async login(phone: string, code: string) {
    return this.request<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; phone: string; name: string | null; role: string };
    }>('/auth/otp/verify', { method: 'POST', body: { phone, code } });
  }

  async sendOtp(phone: string) {
    return this.request<{ message: string }>('/auth/otp/send', { method: 'POST', body: { phone } });
  }

  // Stats
  async getStats() {
    return this.request<{
      totalUsers: number;
      totalDrivers: number;
      pendingDrivers: number;
      approvedDrivers: number;
      activeAccessPasses: number;
      totalRevenue: number;
    }>('/admin/stats');
  }

  // Drivers
  async getDrivers(params?: { status?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return this.request<{
      data: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/drivers${qs ? `?${qs}` : ''}`);
  }

  async getDriverDetail(id: string) {
    return this.request<any>(`/admin/drivers/${id}`);
  }

  async verifyDriver(id: string, action: 'approve' | 'reject', reason?: string) {
    return this.request<{ message: string; status: string }>(`/admin/drivers/${id}/verify`, {
      method: 'PATCH',
      body: { action, reason },
    });
  }

  async verifyDocument(id: string, action: 'approve' | 'reject', reason?: string) {
    return this.request<any>(`/admin/documents/${id}/verify`, {
      method: 'PATCH',
      body: { action, reason },
    });
  }

  // Users
  async getUsers(params?: { role?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.role) q.set('role', params.role);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return this.request<{
      data: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/users${qs ? `?${qs}` : ''}`);
  }

  // Access passes
  async getAccessPasses(params?: { status?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return this.request<{
      data: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/access-passes${qs ? `?${qs}` : ''}`);
  }

  // Reports
  async getReports(params?: { status?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return this.request<{
      data: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/reports${qs ? `?${qs}` : ''}`);
  }

  async resolveReport(id: string, action: 'resolved' | 'dismissed') {
    return this.request<{ message: string }>(`/reports/${id}/resolve`, {
      method: 'PATCH',
      body: { status: action },
    });
  }

  // Tariffs
  async getTariffs() {
    return this.request<{
      basePricePerKm: number;
      fcfaPerPoint: number;
      vehicles: Record<string, { basePricePerKm: number; minFare: number; coefficient: number }>;
    }>('/admin/settings/tariffs');
  }

  async setTariffs(config: {
    basePricePerKm: number;
    fcfaPerPoint: number;
    vehicles: Record<string, { basePricePerKm: number; minFare: number; coefficient: number }>;
  }) {
    return this.request<typeof config>('/admin/settings/tariffs', {
      method: 'PATCH',
      body: config,
    });
  }

  async getCountriesWithTariffs() {
    return this.request<string[]>('/admin/settings/tariffs/countries');
  }

  async getTariffsByCountry(countryCode: string) {
    return this.request<any>(`/admin/settings/tariffs/country/${countryCode}`);
  }

  async setTariffsByCountry(countryCode: string, config: any) {
    return this.request<any>(`/admin/settings/tariffs/country/${countryCode}`, {
      method: 'PATCH',
      body: config,
    });
  }

  async deleteTariffsByCountry(countryCode: string) {
    return this.request<any>(`/admin/settings/tariffs/country/${countryCode}/delete`, {
      method: 'PATCH',
    });
  }

  // Promos
  async getPromos(page = 1, limit = 20) {
    return this.request<{
      data: PromoCode[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/promos?page=${page}&limit=${limit}`);
  }

  async createPromo(dto: { code: string; discount: number; maxUses: number; expiresAt?: string; usagePerUser?: boolean }) {
    return this.request<PromoCode>('/promos', { method: 'POST', body: dto });
  }

  async togglePromo(id: string) {
    return this.request<PromoCode>(`/promos/${id}/toggle`, { method: 'PATCH' });
  }

  async deletePromo(id: string) {
    return this.request<void>(`/promos/${id}`, { method: 'DELETE' });
  }

  // Metrics
  async getMetrics() {
    return this.request<{
      timestamp: string;
      database: string;
      uptime: number;
      memory: { heapUsed: number; heapTotal: number; rss: number; unit: string };
      users: { total: number };
      drivers: { total: number; active: number };
      bookings: { pending: number; active: number; completedToday: number; cancelledToday: number; totalRevenuePts: number };
    }>('/metrics');
  }

  // Audit logs
  async getAuditLogs(params: { entity?: string; limit?: number; offset?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.entity) qs.append('entity', params.entity);
    if (params.limit)  qs.append('limit',  String(params.limit));
    if (params.offset) qs.append('offset', String(params.offset));
    return this.request<{ items: AuditLog[]; total: number }>(
      `/admin/audit-logs${qs.toString() ? `?${qs}` : ''}`,
    );
  }

  // Airports
  async getAirportsAdmin() {
    return this.request<Airport[]>('/airports/admin');
  }

  async createAirport(data: Partial<Airport>) {
    return this.request<Airport>('/airports', { method: 'POST', body: data });
  }

  async updateAirport(id: string, data: Partial<Airport>) {
    return this.request<Airport>(`/airports/${id}`, { method: 'PATCH', body: data });
  }

  async deleteAirport(id: string) {
    return this.request<void>(`/airports/${id}`, { method: 'DELETE' });
  }

  // Referrals
  async getReferrals(page = 1, limit = 20) {
    return this.request<{
      data: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/referrals?page=${page}&limit=${limit}`);
  }

  // Bookings
  async getBookings(params: { status?: string; page?: number; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.append('status', params.status);
    if (params.page)   qs.append('page',   String(params.page));
    if (params.limit)  qs.append('limit',  String(params.limit));
    return this.request<{
      data: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/bookings${qs.toString() ? `?${qs}` : ''}`);
  }

  async cancelBookingAdmin(bookingId: string) {
    return this.request<any>(`/admin/bookings/${bookingId}/cancel`, { method: 'PATCH' });
  }

  async updateDriverProfile(driverId: string, data: { driverType?: string; consigneEnabled?: boolean }) {
    return this.request<any>(`/admin/drivers/${driverId}/profile`, { method: 'PATCH', body: data });
  }
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userId: string | null;
  adminId: string | null;
  meta: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  usagePerUser: boolean;
  createdAt: string;
}

export interface Airport {
  id: string;
  iataCode: string;
  icaoCode: string | null;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const adminApi = new AdminApiClient(API_BASE_URL);
