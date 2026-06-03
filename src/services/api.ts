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
  async getStats(country?: string) {
    const qs = country ? `?country=${encodeURIComponent(country)}` : '';
    return this.request<{
      totalUsers: number;
      totalDrivers: number;
      pendingDrivers: number;
      approvedDrivers: number;
      activeAccessPasses: number;
      totalRevenue: number;
    }>(`/admin/stats${qs}`);
  }

  async getChartData(country?: string) {
    const qs = country ? `?country=${encodeURIComponent(country)}` : '';
    return this.request<{ day: string; courses: number; revenus: number }[]>(`/admin/chart-data${qs}`);
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

  async getReportById(id: string) {
    return this.request<any>(`/reports/${id}/admin`);
  }

  async addReportMessage(id: string, message: string, imageUrl?: string) {
    return this.request<any>(`/reports/${id}/messages`, {
      method: 'POST',
      body: { message, imageUrl },
    });
  }

  async uploadTicketImage(file: File): Promise<{ url: string }> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${this.baseUrl}/uploads/ticket-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Échec upload image');
    return res.json();
  }

  async reopenReport(id: string) {
    return this.request<any>(`/reports/${id}/reopen`, { method: 'PATCH' });
  }

  async resolveReport(id: string, action: 'resolved' | 'dismissed', resolution?: string) {
    return this.request<{ message: string }>(`/reports/${id}/resolve`, {
      method: 'PATCH',
      body: { status: action, resolution },
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

  // Operated countries
  async listOperatedCountries() { return this.request<any[]>('/admin/countries'); }
  async getCountryReadiness(code: string) { return this.request<{ ready: boolean; missing: string[] }>(`/admin/countries/${code}/readiness`); }
  async createOperatedCountry(data: any) { return this.request('/admin/countries', { method: 'POST', body: data }); }
  async activateCountry(code: string) { return this.request(`/admin/countries/${code}/activate`, { method: 'PATCH' }); }
  async suspendCountry(code: string) { return this.request(`/admin/countries/${code}/suspend`, { method: 'PATCH' }); }
  async setDefaultCountry(code: string) { return this.request(`/admin/countries/${code}/default`, { method: 'PATCH' }); }

  // AppSettings dynamiques
  async getAppSettings() {
    return this.request<Record<string, string>>('/admin/settings');
  }

  async setAppSetting(key: string, value: string) {
    return this.request<void>('/admin/settings/key', {
      method: 'PATCH',
      body: { key, value },
    });
  }

  // SMS Routing
  async getSmsRouting() {
    return this.request<{
      rules: { prefix: string; provider: string }[];
      defaultProvider: string;
      availableProviders: string[];
    }>('/admin/settings/sms-routing');
  }

  async setSmsRouting(payload: { rules: { prefix: string; provider: string }[]; defaultProvider: string }) {
    return this.request<void>('/admin/settings/sms-routing', {
      method: 'PUT',
      body: payload,
    });
  }

  // Credentials SMS/Email
  async getCredentials() {
    return this.request<{ status: Record<string, boolean> }>('/admin/settings/credentials');
  }

  async setCredentials(payload: Record<string, string>) {
    return this.request<{ success: boolean; updated: string[] }>('/admin/settings/credentials', {
      method: 'PUT',
      body: payload,
    });
  }

  // Maps Key
  async getMapsKey() {
    return this.request<{ configured: boolean; maskedKey: string }>('/admin/settings/maps-key');
  }

  async setMapsKey(key: string) {
    return this.request<{ success: boolean }>('/admin/settings/maps-key', {
      method: 'PUT',
      body: { key },
    });
  }

  async getUserDetail(userId: string) {
    return this.request<any>(`/admin/users/${userId}/detail`);
  }

  async getSettings() {
    return this.request<Record<string, string>>('/admin/settings');
  }

  async setSetting(key: string, value: string) {
    return this.request<{ key: string; value: string }>('/admin/settings/key', {
      method: 'PATCH',
      body: { key, value },
    });
  }

  // Annonces
  async listAnnouncements() {
    return this.request<any[]>('/admin/announcements');
  }

  async createAnnouncement(data: any) {
    return this.request('/admin/announcements', { method: 'POST', body: data });
  }

  async updateAnnouncement(id: string, data: any) {
    return this.request(`/admin/announcements/${id}`, { method: 'PATCH', body: data });
  }

  async deleteAnnouncement(id: string) {
    return this.request(`/admin/announcements/${id}`, { method: 'DELETE' });
  }

  async getAnnouncementStats(id: string) {
    return this.request<{ views: number }>(`/admin/announcements/${id}/stats`);
  }

  async getAppVersion() {
    return this.request<Record<string, string>>('/admin/app-version');
  }

  async setAppVersion(data: Record<string, string>) {
    return this.request('/admin/app-version', { method: 'PATCH', body: data });
  }

  // Test Mode
  async getTestMode() {
    return this.request<{
      testModeEnabled: boolean;
      testOtpValue: string;
      otpLogEnabled: boolean;
      otpChannel: string;
      smsDefaultProvider: string;
      emailProvider: string;
      availableSmsProviders: string[];
      availableEmailProviders: string[];
      availableOtpChannels: string[];
    }>('/admin/settings/test-mode');
  }

  async setTestMode(payload: {
    testModeEnabled: boolean;
    testOtpValue?: string;
    otpLogEnabled?: boolean;
    otpChannel?: string;
    smsDefaultProvider?: string;
    emailProvider?: string;
  }) {
    return this.request<{ success: boolean }>('/admin/settings/test-mode', {
      method: 'PUT',
      body: payload,
    });
  }

  // Email provider
  async getEmailProvider() {
    return this.request<{ provider: string; availableProviders: string[] }>('/admin/settings/email-provider');
  }

  async setEmailProvider(provider: string) {
    return this.request<void>('/admin/settings/email-provider', {
      method: 'PUT',
      body: { provider },
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

  async getBookingRatings(bookingId: string) {
    return this.request<{ ratings: any[] }>(`/admin/bookings/${bookingId}/ratings`);
  }

  async updateDriverProfile(driverId: string, data: { driverType?: string; consigneEnabled?: boolean }) {
    return this.request<any>(`/admin/drivers/${driverId}/profile`, { method: 'PATCH', body: data });
  }

  async suspendDriver(driverId: string, action: 'suspend' | 'reactivate') {
    return this.request<any>(`/admin/drivers/${driverId}/suspend`, { method: 'PATCH', body: { action } });
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended') {
    return this.request<any>(`/admin/users/${userId}/status`, { method: 'PATCH', body: { status } });
  }

  async adjustUserPoints(userId: string, amount: number, reason: string) {
    return this.request<{ balance: number }>(`/admin/users/${userId}/points`, {
      method: 'POST',
      body: { amount, reason },
    });
  }

  // Withdrawals
  async getWithdrawals(params: { status?: string; page?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.append('status', params.status);
    if (params.page)   qs.append('page',   String(params.page));
    return this.request<{
      data: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/withdrawals${qs.toString() ? `?${qs}` : ''}`);
  }

  async processWithdrawal(id: string, status: 'approved' | 'rejected' | 'paid', adminNote?: string) {
    return this.request<any>(`/admin/withdrawals/${id}`, {
      method: 'PATCH',
      body: { status, adminNote },
    });
  }

  async getWithdrawalStats() {
    return this.request<{
      total: number;
      byStatus: { pending: number; approved: number; paid: number; rejected: number };
      totalPaidAmount: number;
    }>('/admin/withdrawals/stats');
  }

  async downloadCsv(endpoint: string, filename: string) {
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Erreur export CSV');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Monitoring
  async getActiveBookings() {
    return this.request<any[]>('/admin/bookings/active');
  }

  async getOnlineDrivers() {
    return this.request<any[]>('/admin/drivers/online');
  }

  // Analytics
  async getRevenueMetrics(period: 'day' | 'week' | 'month' = 'day') {
    return this.request<{
      period: string;
      from: string;
      to: string;
      totalRides: number;
      totalRevenue: number;
      byType: Record<string, { count: number; revenue: number }>;
    }>(`/admin/metrics/revenue?period=${period}`);
  }

  // Tariff snapshots
  async getTariffSnapshots() {
    return this.request<{ id: string; countryCode: string | null; createdAt: string }[]>(
      '/admin/settings/tariffs/snapshots',
    );
  }

  async rollbackTariffs(snapshotId: string) {
    return this.request<any>(`/admin/settings/tariffs/rollback/${snapshotId}`, { method: 'POST' });
  }

  // RBAC — My permissions
  async getMyPermissions() {
    return this.request<string[]>('/admin/me/permissions');
  }

  // RBAC — Permissions list
  async getPermissions() {
    return this.request<{ id: string; key: string; group: string; description: string }[]>(
      '/admin/permissions',
    );
  }

  // RBAC — Admins
  async getAdmins(page = 1, limit = 20) {
    return this.request<{
      data: AdminUser[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/admins?page=${page}&limit=${limit}`);
  }

  async getAdminById(id: string) {
    return this.request<any>(`/admin/admins/${id}`);
  }

  async createAdmin(dto: { name: string; phone: string; email?: string; roleId?: string }) {
    return this.request<any>('/admin/admins', { method: 'POST', body: dto });
  }

  async updateAdmin(id: string, dto: { name?: string; email?: string; status?: string }) {
    return this.request<any>(`/admin/admins/${id}`, { method: 'PATCH', body: dto });
  }

  async deleteAdmin(id: string) {
    return this.request<any>(`/admin/admins/${id}`, { method: 'DELETE' });
  }

  async assignRole(userId: string, roleId: string) {
    return this.request<any>(`/admin/admins/${userId}/roles`, { method: 'POST', body: { roleId } });
  }

  async removeRole(userId: string, roleId: string) {
    return this.request<any>(`/admin/admins/${userId}/roles/${roleId}`, { method: 'DELETE' });
  }

  // RBAC — Roles
  async getRoles() {
    return this.request<AdminRole[]>('/admin/roles');
  }

  async createRole(dto: { name: string; label: string; description?: string; permissionKeys?: string[] }) {
    return this.request<AdminRole>('/admin/roles', { method: 'POST', body: dto });
  }

  async updateRole(id: string, dto: { label?: string; description?: string }) {
    return this.request<AdminRole>(`/admin/roles/${id}`, { method: 'PATCH', body: dto });
  }

  async deleteRole(id: string) {
    return this.request<any>(`/admin/roles/${id}`, { method: 'DELETE' });
  }

  async setRolePermissions(roleId: string, permissionKeys: string[]) {
    return this.request<any>(`/admin/roles/${roleId}/permissions`, {
      method: 'PATCH',
      body: { permissionKeys },
    });
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

export interface AdminUser {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  status: string;
  createdAt: string;
  adminRoles?: { role: { id: string; name: string; label: string } }[];
}

export interface AdminRole {
  id: string;
  name: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  rolePerms?: { permission: { id: string; key: string; group: string; description: string } }[];
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
