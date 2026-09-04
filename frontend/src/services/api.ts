const API_URL = import.meta.env.VITE_API_URL || '/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('gps_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem('gps_token');
    localStorage.removeItem('gps_user');
    if (!location.hash.includes('/login')) location.hash = '#/login';
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error' }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<any>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  },
  dashboard: {
    getStats: () => request<any>('/dashboard'),
  },
  vehicles: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/vehicles${qs}`);
    },
    get: (id: string) => request<any>(`/vehicles/${id}`),
    create: (data: any) => request<any>('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/vehicles/${id}`, { method: 'DELETE' }),
    updateStatus: (id: string, status: string) =>
      request<any>(`/vehicles/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  machines: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/machines${qs}`);
    },
    get: (id: string) => request<any>(`/machines/${id}`),
  },
  gps: {
    getPositions: (id: string, params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/gps/${id}/positions${qs}`);
    },
    getTracking: (id: string, params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/gps/${id}/tracking${qs}`);
    },
    listDevices: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/gps${qs}`);
    },
    linkDevice: (id: string, data: { vehicleId?: string; machineId?: string; force?: boolean }) =>
      request<any>(`/gps/${id}/link`, { method: 'POST', body: JSON.stringify(data) }),
    unlinkDevice: (id: string) =>
      request<any>(`/gps/${id}/unlink`, { method: 'POST' }),
    testConnection: (data: { imei?: string; gpsDeviceId?: string }) =>
      request<any>('/gps/test', { method: 'POST', body: JSON.stringify(data) }),
  },
  events: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/events${qs}`);
    },
  },
  geofences: {
    list: () => request<any[]>('/geofences'),
    get: (id: string) => request<any>(`/geofences/${id}`),
    create: (data: any) => request<any>('/geofences', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/geofences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/geofences/${id}`, { method: 'DELETE' }),
    getEvents: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/geofences/events${qs}`);
    },
  },
  reports: {
    getDaily: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/reports/daily${qs}`);
    },
    getWeekly: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/reports/weekly${qs}`);
    },
    getMonthly: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/reports/monthly${qs}`);
    },
    getHours: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/reports/hours${qs}`);
    },
    getEvents: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/reports/events${qs}`);
    },
  },
  commands: {
    engineStop: (unitId: string, unitType: string) =>
      request<any>('/commands/engine-stop', { method: 'POST', body: JSON.stringify({ unitId, unitType }) }),
  },
  users: {
    list: () => request<any[]>('/users'),
    create: (data: { email: string; password: string; name: string; role: string; vehicleIds?: string[]; machineIds?: string[] }) =>
      request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/users/${id}`, { method: 'DELETE' }),
    getUnits: (id: string) => request<any>(`/users/${id}/units`),
    updateUnits: (id: string, data: { vehicleIds: string[]; machineIds: string[] }) =>
      request<any>(`/users/${id}/units`, { method: 'PUT', body: JSON.stringify(data) }),
  },
};
