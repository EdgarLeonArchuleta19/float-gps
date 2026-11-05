import { getApiUrl } from './apiUrl';
import { localDayRange } from './format';
import type {
  DashboardStats,
  Figure,
  Geofence,
  GeofenceAlertOn,
  GpsPosition,
  Machine,
  Maintenance,
  MaintenanceKind,
  MaintenanceLog,
  NotificationSettings,
  PaginatedResponse,
  ReportRow,
  TrackingData,
  TrackingEvent,
  UnitGroup,
  UnitKind,
  User,
  Vehicle,
} from './types';

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 15000;

function dayBounds(startDay: string, endDay: string) {
  return { startDate: localDayRange(startDay).startDate, endDate: localDayRange(endDay).endDate };
}

let sessionToken: string | null = null;
let supportSessionId: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let supportEndedHandler: (() => void) | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

export function setSupportSessionId(id: string | null) {
  supportSessionId = id;
}

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function onSupportEnded(handler: (() => void) | null) {
  supportEndedHandler = handler;
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
  if (supportSessionId) headers['x-support-session'] = supportSessionId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${endpoint}`, { ...options, headers, signal: controller.signal });
  } catch {
    throw new ApiError(`No se pudo conectar con el servidor (${getApiUrl()}). Verifica que el backend esté encendido.`, 0);
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401 && sessionToken) {
    unauthorizedHandler?.();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (body?.code === 'support_ended' && supportSessionId) supportEndedHandler?.();
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

export interface SupportAccess {
  id: string;
  reason: string;
  startedAt: string;
  endedAt: string | null;
  expiresAt: string;
  staff: { name: string };
}

export interface DaySchedule {
  day: number;
  start: number;
  end: number;
}

export interface WorkSchedule {
  days: DaySchedule[];
}

export interface TemporaryAccess {
  emailSent: boolean;
  temporaryPassword: string | null;
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
  ownUnits: boolean;
  vehicleIds: string[];
  machineIds: string[];
}

export interface UnitIds {
  vehicleIds: string[];
  machineIds: string[];
}

export interface UserInput extends Partial<UnitIds> {
  name: string;
  roleId?: string;
  ownUnits?: boolean;
}

export interface GroupInput extends UnitIds {
  name: string;
  color: string;
}

export interface MaintenanceInput {
  kind: MaintenanceKind;
  title: string;
  intervalKm: number | null;
  intervalDays: number | null;
  lastDoneAt: string;
  notes: string;
}

export interface NotificationSettingsInput {
  pushEnabled: boolean;
  emailEnabled: boolean;
  types: string[];
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
  alertOn: GeofenceAlertOn;
  allUnits: boolean;
  vehicleIds: string[];
  machineIds: string[];
  groupIds: string[];
}

export interface VehicleInput {
  name: string;
  plate: string;
  type: string;
  brand?: string;
  vehicleModel?: string;
  year?: number;
  color?: string;
  figure?: Figure | null;
  iconColor?: string | null;
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
    setAppearance: (id: string, data: { name: string; figure: Figure | null; iconColor: string | null }) =>
      request<Vehicle>(`/vehicles/${id}/appearance`, { method: 'PATCH', body: JSON.stringify(data) }),
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
    tracking: (gpsId: string, range: { startDate: string; endDate: string }) =>
      request<TrackingData>(`/gps/${gpsId}/tracking${query(range)}`),
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
    hours: (startDate: string, endDate: string) => request<ReportRow[]>(`/reports/hours${query(dayBounds(startDate, endDate))}`),
    offHours: (startDate: string, endDate: string) => request<OffHoursRow[]>(`/reports/off-hours${query(dayBounds(startDate, endDate))}`),
    events: (startDate: string, endDate: string) => request<TrackingEvent[]>(`/reports/events${query(dayBounds(startDate, endDate))}`),
  },
  company: {
    profile: () => request<CompanyProfile>('/company/profile'),
    updateProfile: (data: CompanyProfile) => request<CompanyProfile>('/company/profile', { method: 'PUT', body: JSON.stringify(data) }),
    schedule: () => request<WorkSchedule>('/company/schedule'),
    updateSchedule: (data: WorkSchedule) => request<WorkSchedule>('/company/schedule', { method: 'PUT', body: JSON.stringify(data) }),
    supportAccess: () => request<SupportAccess[]>('/company/support-access'),
  },
  users: {
    list: () => request<CompanyUser[]>('/users'),
    create: (data: UserInput & { email: string }) =>
      request<TemporaryAccess & { user: CompanyUser }>('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UserInput) =>
      request<CompanyUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    resetPassword: (id: string) => request<TemporaryAccess>(`/users/${id}/reset-password`, { method: 'POST' }),
    setActive: (id: string, active: boolean) => setActive(`/users/${id}`, active),
    remove: (id: string) => request<unknown>(`/users/${id}`, { method: 'DELETE' }),
  },
  groups: {
    list: () => request<UnitGroup[]>('/groups'),
    create: (data: GroupInput) => request<UnitGroup>('/groups', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: GroupInput) => request<UnitGroup>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    setActive: (id: string, active: boolean) => setActive(`/groups/${id}`, active),
    remove: (id: string) => request<unknown>(`/groups/${id}`, { method: 'DELETE' }),
  },
  maintenance: {
    list: (params: { unitId?: string; state?: 'inactive' } = {}) => request<Maintenance[]>(`/maintenance${query(params)}`),
    create: (data: MaintenanceInput & { units: { kind: UnitKind; id: string }[] }) =>
      request<{ created: number }>('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: MaintenanceInput) => request<Maintenance>(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    complete: (id: string, data: { doneAt: string; cost: number | null; notes: string }) =>
      request<Maintenance>(`/maintenance/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),
    history: (id: string) => request<MaintenanceLog[]>(`/maintenance/${id}/history`),
    setActive: (id: string, active: boolean) => setActive(`/maintenance/${id}`, active),
    remove: (id: string) => request<unknown>(`/maintenance/${id}`, { method: 'DELETE' }),
  },
  notifications: {
    settings: () => request<NotificationSettings>('/notifications/settings'),
    save: (data: NotificationSettingsInput) => request<NotificationSettings>('/notifications/settings', { method: 'PUT', body: JSON.stringify(data) }),
    webPushKey: () => request<{ publicKey: string | null }>('/notifications/web-push-key'),
    registerDevice: (kind: 'expo' | 'web', token: unknown, label: string) =>
      request<unknown>('/notifications/devices', { method: 'POST', body: JSON.stringify({ kind, token, label }) }),
    removeDevice: (token: unknown) => request<unknown>('/notifications/devices/remove', { method: 'POST', body: JSON.stringify({ token }) }),
    test: () => request<{ message: string }>('/notifications/test', { method: 'POST' }),
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
