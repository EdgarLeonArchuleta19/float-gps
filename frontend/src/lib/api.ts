import { API_URL } from './apiUrl';
import type {
  DashboardStats,
  Geofence,
  GpsPosition,
  Machine,
  PaginatedResponse,
  ReportRow,
  TrackingData,
  TrackingEvent,
  User,
  Vehicle,
} from './types';

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 15000;

let sessionToken: string | null = null;
let supportCompanyId: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

export function setSupportCompanyId(id: string | null) {
  supportCompanyId = id;
}

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

function query(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter((entry): entry is [string, string] => !!entry[1]);
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  if (supportCompanyId) headers['x-support-company-id'] = supportCompanyId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, { ...options, headers, signal: controller.signal });
  } catch {
    throw new ApiError(`No se pudo conectar con el servidor (${API_URL}). Verifica que el backend esté encendido.`, 0);
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401 && sessionToken) {
    unauthorizedHandler?.();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message || 'Error en la solicitud', res.status);
  }
  return res.json();
}

interface OffHoursRow {
  unitId: string;
  unitType: string;
  unitName: string;
  offHoursKm: number;
}

export interface WorkSchedule {
  startHour: number;
  endHour: number;
  days: number[];
}

export interface CompanyProfile {
  name: string;
  legalName: string | null;
  taxId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
  logo: string | null;
}

export interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string | null;
  roleName: string;
  isActive: boolean;
  createdAt?: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  allUnits: boolean;
  isActive: boolean;
  systemKey: 'admin' | 'operator' | 'viewer' | null;
  vehicleIds: string[];
  machineIds: string[];
  userCount: number;
}

export type RoleInput = Pick<Role, 'name' | 'permissions' | 'allUnits' | 'vehicleIds' | 'machineIds'>;

export interface GeofenceInput {
  name: string;
  type: string;
  color: string;
  radius: number;
  centerLat: number;
  centerLng: number;
}

export interface VehicleInput {
  name: string;
  plate: string;
  type: string;
  brand?: string;
  vehicleModel?: string;
  year?: number;
  color?: string;
  gps?: { imei: string; simNumber?: string };
}

export type UnitState = 'active' | 'all';

const setActive = (path: string, active: boolean) => request<unknown>(`${path}/active`, { method: 'PATCH', body: JSON.stringify({ active }) });

function listOf<T>(response: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(response) ? response : response.data || [];
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    forgotPassword: (email: string) =>
      request<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (email: string, code: string, newPassword: string) =>
      request<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
      }),
    me: () => request<User>('/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ message: string; token: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },
  dashboard: {
    getStats: () => request<DashboardStats & Record<string, any>>('/dashboard'),
  },
  vehicles: {
    list: async (state: UnitState = 'active') =>
      listOf(await request<PaginatedResponse<Vehicle>>(`/vehicles${query({ limit: '500', state: state === 'all' ? 'all' : undefined })}`)),
    get: (id: string) => request<Vehicle & { recentEvents?: TrackingEvent[] }>(`/vehicles/${id}`),
    create: (data: VehicleInput) => request<Vehicle>('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: VehicleInput) => request<Vehicle>(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    setActive: (id: string, active: boolean) => setActive(`/vehicles/${id}`, active),
    remove: (id: string) => request<unknown>(`/vehicles/${id}`, { method: 'DELETE' }),
  },
  machines: {
    list: async (state: UnitState = 'active') =>
      listOf(await request<PaginatedResponse<Machine>>(`/machines${query({ limit: '500', state: state === 'all' ? 'all' : undefined })}`)),
    setActive: (id: string, active: boolean) => setActive(`/machines/${id}`, active),
    remove: (id: string) => request<unknown>(`/machines/${id}`, { method: 'DELETE' }),
    get: (id: string) => request<Machine & { recentEvents?: TrackingEvent[] }>(`/machines/${id}`),
  },
  gps: {
    positions: (gpsId: string, startDate: string, endDate: string) =>
      request<GpsPosition[]>(`/gps/${gpsId}/positions${query({ startDate, endDate })}`),
    tracking: (gpsId: string, params: { date: string; startTime?: string; endTime?: string }) =>
      request<TrackingData>(`/gps/${gpsId}/tracking${query(params)}`),
  },
  events: {
    list: async (params: { type?: string; unitId?: string; startDate?: string; endDate?: string; limit?: string }) =>
      request<PaginatedResponse<TrackingEvent>>(`/events${query(params)}`),
  },
  geofences: {
    list: async () => listOf(await request<Geofence[] | PaginatedResponse<Geofence>>('/geofences')),
    get: (id: string) => request<Geofence>(`/geofences/${id}`),
    create: (data: GeofenceInput) => request<Geofence>('/geofences', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: GeofenceInput) => request<Geofence>(`/geofences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    setActive: (id: string, active: boolean) => setActive(`/geofences/${id}`, active),
    remove: (id: string) => request<unknown>(`/geofences/${id}`, { method: 'DELETE' }),
  },
  reports: {
    daily: (date: string) => request<ReportRow[]>(`/reports/daily${query({ date })}`),
    hours: (startDate: string, endDate: string) =>
      request<ReportRow[]>(`/reports/hours${query({ startDate, endDate: `${endDate}T23:59:59` })}`),
    offHours: (startDate: string, endDate: string) =>
      request<OffHoursRow[]>(`/reports/off-hours${query({ startDate: `${startDate}T00:00:00`, endDate: `${endDate}T23:59:59` })}`),
    events: (startDate: string, endDate: string) =>
      request<TrackingEvent[]>(`/reports/events${query({ startDate, endDate: `${endDate}T23:59:59` })}`),
  },
  company: {
    profile: () => request<CompanyProfile>('/company/profile'),
    updateProfile: (data: CompanyProfile) => request<CompanyProfile>('/company/profile', { method: 'PUT', body: JSON.stringify(data) }),
    schedule: () => request<WorkSchedule>('/company/schedule'),
    updateSchedule: (data: WorkSchedule) => request<WorkSchedule>('/company/schedule', { method: 'PUT', body: JSON.stringify(data) }),
  },
  users: {
    list: () => request<CompanyUser[]>('/users'),
    create: (data: { name: string; email: string; password: string; roleId: string }) =>
      request<CompanyUser>('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name: string; roleId?: string }) =>
      request<CompanyUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    setActive: (id: string, active: boolean) => setActive(`/users/${id}`, active),
    remove: (id: string) => request<unknown>(`/users/${id}`, { method: 'DELETE' }),
  },
  roles: {
    list: () => request<Role[]>('/roles'),
    get: (id: string) => request<Role>(`/roles/${id}`),
    create: (data: RoleInput) => request<Role>('/roles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: RoleInput) => request<Role>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    setActive: (id: string, active: boolean) => setActive(`/roles/${id}`, active),
    remove: (id: string) => request<unknown>(`/roles/${id}`, { method: 'DELETE' }),
  },
  commands: {
    engine: (data: { unitId: string; unitType: 'vehicle' | 'machine'; action: 'stop' | 'resume'; password: string }) =>
      request<{ success: boolean; message: string }>('/commands/engine-stop', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
