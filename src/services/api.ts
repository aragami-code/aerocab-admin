const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export type DocConfigItem = {
  type: string;
  label: string;
  description?: string;
  required: boolean;
  enabled: boolean;
  acceptedExtensions?: string[];
};

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
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('admin-session-expired'));
      }
      const err = new Error(data.message || 'Erreur serveur') as any;
      err.status = response.status;
      throw err;
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
  async getPalettes() {
    return this.request<{ id: string; name: string; primary: string; accent: string }[]>('/branding/palettes');
  }

  async getBranding() {
    return this.request<{
      primaryColor: string; accentColor: string; logoUrl: string | null;
      appNamePassenger: string; appNameDriver: string;
    }>('/admin/branding');
  }

  async updateBranding(dto: Record<string, unknown>) {
    return this.request<any>('/admin/branding', { method: 'PATCH', body: dto });
  }

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

  /** Upload d'un APK (passenger|driver). Renvoie une URL absolue prête pour apk_url. */
  async uploadApk(file: File, app: 'passenger' | 'driver', onProgress?: (pct: number) => void): Promise<{ url: string }> {
    const token = this.getToken();
    const res = await new Promise<{ url: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/uploads/apk?app=${app}`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('Réponse invalide')); }
        } else reject(new Error(`Échec upload APK (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error('Échec réseau upload APK'));
      const fd = new FormData();
      fd.append('file', file);
      xhr.send(fd);
    });
    // L'endpoint renvoie une URL relative (/api/apk/...) ; on la rend absolue avec l'origine API.
    const origin = this.baseUrl.replace(/\/api\/?$/, '');
    return { url: res.url.startsWith('http') ? res.url : `${origin}${res.url}` };
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

  async revokeSanctions(id: string, opts: { liftSuspension: boolean; restorePoints: boolean; restoreScore: boolean }) {
    return this.request<{ message: string; actions: string[] }>(`/reports/${id}/revoke-sanctions`, {
      method: 'PATCH',
      body: opts,
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

  async getAllCountries() {
    return this.request<{ code: string; name: string; currency: string; paymentMethods: any[]; isActive: boolean }[]>(
      '/admin/settings/countries',
    );
  }

  async createCountry(code: string, name: string, currency: string) {
    return this.request<{ code: string }>('/admin/settings/countries', {
      method: 'POST',
      body: { code, name, currency },
    });
  }

  async deleteCountry(countryCode: string) {
    return this.request<{ success: boolean }>(`/admin/settings/countries/${countryCode}`, {
      method: 'DELETE',
    });
  }

  async getCountryPaymentMethods(countryCode: string) {
    return this.request<{ countryCode: string; name: string; methods: { id: string; label: string; icon: string }[] }>(
      `/admin/settings/countries/${countryCode}/payment-methods`,
    );
  }

  async setCountryPaymentMethods(countryCode: string, methods: { id: string; label: string; icon: string }[]) {
    return this.request<{ success: boolean }>(`/admin/settings/countries/${countryCode}/payment-methods`, {
      method: 'PATCH',
      body: { methods },
    });
  }

  async getDriverDocumentConfig() {
    return this.request<{ documents: DocConfigItem[] }>('/admin/settings/driver-documents');
  }

  async setDriverDocumentConfig(documents: DocConfigItem[]) {
    return this.request<{ success: boolean; documents: DocConfigItem[] }>(
      '/admin/settings/driver-documents',
      { method: 'PATCH', body: { documents } },
    );
  }

  async getAllDocumentTypes() {
    return this.request<{ types: string[]; defaults: DocConfigItem[] }>('/admin/settings/driver-documents/all');
  }

  async getPointsPackages() {
    return this.request<{ packages: number[] }>('/admin/settings/points-packages');
  }

  async setPointsPackages(packages: number[]) {
    return this.request<{ success: boolean; packages: number[] }>('/admin/settings/points-packages', {
      method: 'PATCH',
      body: { packages },
    });
  }

  // Bot assistant
  async getBotSettings() {
    return this.request<{
      enabled:      boolean;
      provider:     string;
      model:        string;
      maxTokens:    number;
      systemPrompt: string;
      providers:    string[];
      claudeKey:    { configured: boolean; masked: string };
      openaiKey:    { configured: boolean; masked: string };
      zhipuKey:     { configured: boolean; masked: string };
      geminiKey:    { configured: boolean; masked: string };
    }>('/admin/settings/bot');
  }

  async setBotSettings(payload: {
    enabled?:      boolean;
    provider?:     string;
    model?:        string;
    maxTokens?:    number;
    systemPrompt?: string;
    claudeApiKey?: string;
    openaiApiKey?: string;
    zhipuApiKey?:  string;
    geminiApiKey?: string;
  }) {
    return this.request<{ success: boolean }>('/admin/settings/bot', {
      method: 'PATCH',
      body: payload,
    });
  }

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

  async getMapsEmbedUrl(origin?: string, destination?: string) {
    const params = new URLSearchParams();
    if (origin)      params.set('origin', origin);
    if (destination) params.set('destination', destination);
    return this.request<{ url: string | null; configured: boolean }>(
      `/admin/settings/maps-embed?${params.toString()}`
    );
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

  async setKey(key: string, value: string) {
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

  // Payment security settings
  async setPaymentSecurity(data: Record<string, string>) {
    return this.request<{ success: boolean; updated: string[] }>('/admin/settings/payment-security', {
      method: 'PATCH',
      body: data,
    });
  }

  // Payment providers
  async getPaymentProviders() {
    return this.request<{
      enabled: Record<string, boolean>;
      credentials: Record<string, { label: string; configured: boolean; maskedValue: string }>;
    }>('/admin/settings/payment-providers');
  }

  async setPaymentProviders(data: {
    enabled?: Record<string, boolean>;
    credentials?: Record<string, string>;
  }) {
    return this.request<{ updated: string[] }>('/admin/settings/payment-providers', {
      method: 'PUT',
      body: data,
    });
  }

  async testEdoctorConnection() {
    return this.request<{ ok: boolean; message: string; providers?: any[] }>(
      '/admin/settings/payment-providers/edoctor/test',
      { method: 'POST' },
    );
  }

  async testFlightRadar24() {
    return this.request<{ ok: boolean; message: string }>('/admin/settings/flights/fr24/test', { method: 'POST' });
  }

  async testAeroDataBox() {
    return this.request<{ ok: boolean; message: string }>('/admin/settings/flights/aerodatabox/test', { method: 'POST' });
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

  async createPromo(dto: { code: string; discount: number; maxUses: number; expiresAt?: string; usagePerUser?: boolean; countryCode?: string }) {
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
  async getAirportsAdmin(params: { page?: number; limit?: number; search?: string; country?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.page)    qs.set('page',    String(params.page));
    if (params.limit)   qs.set('limit',   String(params.limit));
    if (params.search)  qs.set('search',  params.search);
    if (params.country) qs.set('country', params.country);
    return this.request<AirportPage>(`/airports/admin${qs.toString() ? `?${qs}` : ''}`);
  }

  async createAirport(data: Partial<Airport>) {
    return this.request<Airport>('/airports', { method: 'POST', body: data });
  }

  async updateAirport(id: string, data: Partial<Airport>) {
    return this.request<Airport>(`/airports/${id}`, { method: 'PATCH', body: data });
  }

  // Toggle dédié au flag « opéré » (PATCH /airports/:id/operated)
  async setAirportOperated(id: string, isOperated: boolean) {
    return this.request<Airport>(`/airports/${id}/operated`, { method: 'PATCH', body: { isOperated } });
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

  async getPageStats(domain: string, params: { from: string; to: string; granularity: 'day' | 'month'; country?: string }) {
    const qs = new URLSearchParams();
    qs.set('from', params.from);
    qs.set('to', params.to);
    qs.set('granularity', params.granularity);
    if (params.country && params.country !== 'GLOBAL') qs.set('country', params.country);
    return this.request<AdminStats>(`/admin/stats/${domain}?${qs.toString()}`);
  }

  async getBookingDetail(bookingId: string) {
    return this.request<{
      financials: {
        isCash: boolean; paymentMethod: string; paymentStatus: string;
        gross: number; commissionRate: number | null; commissionAmount: number | null;
        providerFeeAmount: number; net: number | null; tip: number;
        payoutStatus: string | null; payoutCurrency: string; cashDebt: number | null;
        discountAmount: number; discountFromPoints: number; displayAmount: number | null;
        intent: { status: string; provider: string; amount: number; currency: string;
          authorizedAt: string | null; capturedAt: string | null;
          refundedAt: string | null; failedAt: string | null } | null;
        pointsTx: { type: string; points: number; label: string; createdAt: string }[];
      };
      track: {
        positions: { lat: number; lng: number; at: string }[];
        pointCount: number; realDistanceKm: number; estimatedDistanceKm: number | null;
      };
    }>(`/admin/bookings/${bookingId}/detail`);
  }

  async refundBooking(bookingId: string, reason?: string) {
    return this.request<{ success: boolean; amount: number }>(`/admin/bookings/${bookingId}/refund`, {
      method: 'POST',
      body: { reason },
    });
  }

  async updateDriverProfile(driverId: string, data: { driverType?: string }) {
    return this.request<any>(`/admin/drivers/${driverId}/profile`, { method: 'PATCH', body: data });
  }

  async suspendDriver(driverId: string, action: 'suspend' | 'reactivate') {
    return this.request<any>(`/admin/drivers/${driverId}/suspend`, { method: 'PATCH', body: { action } });
  }

  async listCountryChangeRequests(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return this.request<any[]>(`/admin/drivers/country-change-requests${qs}`);
  }

  async reviewCountryChangeRequest(id: string, status: 'approved' | 'rejected', adminNote?: string) {
    return this.request<{ success: boolean; status: string }>(
      `/admin/drivers/country-change-requests/${id}`,
      { method: 'PATCH', body: { status, adminNote } },
    );
  }

  // Operated countries
  async listOperatedCountries() { return this.request<any[]>('/admin/countries'); }
  async getCountryReadiness(code: string) { return this.request<{ ready: boolean; missing: string[] }>(`/admin/countries/${code}/readiness`); }
  async createOperatedCountry(data: any) { return this.request('/admin/countries', { method: 'POST', body: data }); }
  async activateCountry(code: string) { return this.request(`/admin/countries/${code}/activate`, { method: 'PATCH' }); }
  async suspendCountry(code: string) { return this.request(`/admin/countries/${code}/suspend`, { method: 'PATCH' }); }
  async setDefaultCountry(code: string) { return this.request(`/admin/countries/${code}/default`, { method: 'PATCH' }); }

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

  async downloadFile(endpoint: string, filename: string, mimeType: string) {
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`Erreur export (${response.status})`);
    const blob = await response.blob();
    const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async openHtmlInTab(endpoint: string) {
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`Erreur export PDF (${response.status})`);
    const html = await response.text();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
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

  async getFinancialReport(from: string, to: string) {
    return this.request<{
      from: string; to: string;
      totalBookings: number; totalRevenue: number;
      commission: number; driverPayouts: number;
      byType: Record<string, { count: number; revenue: number }>;
    }>(`/admin/financial-report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  }

  // Revenue
  async getRevenue(params: { from?: string; to?: string; granularity?: 'range' | 'monthly' }) {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.granularity) q.set('granularity', params.granularity);
    const qs = q.toString();
    return this.request<RevenueResponse>(`/admin/revenue${qs ? `?${qs}` : ''}`);
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

  // ── KYC ─────────────────────────────────────────────────────────────────────

  async getTelephonyConfig() {
    return this.request<{
      callsProvider: 'webrtc' | 'twilio_proxy';
      twilioAccountSid: string;
      twilioAuthToken: string;
      twilioProxyServiceSid: string;
      configured: boolean;
    }>('/admin/settings/telephony');
  }

  async saveTelephonyConfig(data: {
    callsProvider: 'webrtc' | 'twilio_proxy';
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioProxyServiceSid?: string;
  }) {
    return this.request<void>('/admin/settings/telephony', { method: 'PUT', body: data });
  }

  async getKycPending(page = 1) {
    return this.request<{
      data: {
        id: string; name: string | null; phone: string; email: string | null;
        kycStatus: string;
        kycDocuments: { id: string; type: string; status: string; fileUrl: string; rejectionReason: string | null; createdAt: string }[];
        createdAt: string;
      }[];
      total: number; page: number; limit: number;
    }>(`/kyc/admin/pending?page=${page}`);
  }

  async reviewKyc(userId: string, action: 'approve' | 'reject', reason?: string) {
    return this.request<{ success: boolean; action: string }>(
      `/kyc/admin/${userId}/review`,
      { method: 'POST', body: { action, reason } },
    );
  }

  // Admin Notifications
  async getNotifications(params: { page?: number; limit?: number; unread?: boolean } = {}) {
    const qs = new URLSearchParams();
    if (params.page)   qs.set('page',   String(params.page));
    if (params.limit)  qs.set('limit',  String(params.limit));
    if (params.unread) qs.set('unread', 'true');
    return this.request<{
      data: AdminNotification[];
      total: number; page: number; limit: number; totalPages: number;
    }>(`/admin/notifications${qs.toString() ? `?${qs}` : ''}`);
  }

  async getUnreadNotificationCount() {
    return this.request<{ count: number }>('/admin/notifications/unread-count');
  }

  async markNotificationRead(id: string) {
    return this.request<void>(`/admin/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request<{ success: boolean }>('/admin/notifications/read-all', { method: 'POST' });
  }
}

export interface RevenueResponse {
  period: { from: string; to: string; granularity: 'range' | 'monthly' };
  baseCurrency: string; // 'XAF'
  byCountry: {
    country: string;
    currency: string;
    platform: { registration: number; accessPass: number; total: number };
    rides: { commission: number; total: number };
    grandLocal: number;
    grandBase: number;
  }[];
  consolidated: { baseCurrency: string; platform: number; rides: number; total: number };
  timeseries: { month: string; platform: number; rides: number }[]; // base currency
  comparison: {
    platform: { current: number; previous: number; deltaPct: number | null };
    rides: { current: number; previous: number; deltaPct: number | null };
    total: { current: number; previous: number; deltaPct: number | null };
  };
  insights: { type: string; level: 'good' | 'info' | 'warn'; text: string }[];
}

// Forme générique des stats par page (bande analytique réutilisable).
export type AdminChart =
  | { kind: 'timeseries'; title: string; span?: 1 | 2; data: Record<string, number | string>[]; series: { key: string; label: string; color: string }[] }
  | { kind: 'pie'; title: string; data: { name: string; value: number }[] }
  | { kind: 'bar'; title: string; data: { name: string; value: number }[]; color?: string; money?: boolean };

export interface AdminStats {
  kpis: { label: string; value: number; tone?: string; suffix?: string; money?: boolean }[];
  charts: AdminChart[];
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
  countryCode: string | null;
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
  detectionRadius: number;
  exitDelayMinutes: number;
  isActive: boolean;
  isOperated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AirportPage {
  data: Airport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export const adminApi = new AdminApiClient(API_BASE_URL);
