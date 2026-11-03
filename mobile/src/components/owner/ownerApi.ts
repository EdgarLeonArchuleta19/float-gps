import { request } from '@/lib/api';
import type { User } from '@/lib/types';

export interface OwnerCompany {
  id: string;
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  plan?: string | null;
  maxUnits?: number | null;
  isActive: boolean;
  _count?: { vehicles?: number; machines?: number; gpsDevices?: number; users?: number; geofences?: number };
}

export interface OwnerMetrics {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalUnits: number;
  totalVehicles: number;
  totalMachines: number;
  totalGpsDevices: number;
  linkedGpsDevices: number;
  availableGpsDevices: number;
  totalUsers: number;
}

export interface OwnerUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  company?: { id: string; name: string } | null;
}

export interface OwnerGps {
  id: string;
  imei: string;
  model: string;
  simNumber?: string | null;
  companyId?: string | null;
  company?: { name: string } | null;
  vehicle?: { name: string; plate?: string } | null;
  machine?: { name: string } | null;
}

export interface AuditLog {
  id: string;
  action: string;
  actorEmail?: string | null;
  ip?: string | null;
  success: boolean;
  createdAt: string;
  detail?: unknown;
}

export interface NewCompany {
  name: string;
  contactEmail: string;
  contactPhone: string;
  plan: string;
  maxUnits: number;
  notes: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface NewOwnerUser {
  name: string;
  email: string;
  password: string;
  role: string;
  companyId: string;
}

interface NewGps {
  imei: string;
  model: string;
  simNumber: string;
  companyId: string | null;
}

const masterKeyHeader = (masterKey: string) => ({ 'x-owner-master-key': masterKey });

export const ownerApi = {
  login: (email: string, password: string, masterKey: string) =>
    request<{ token: string; user: User }>('/auth/owner-login', {
      method: 'POST',
      body: JSON.stringify({ email, password, masterKey }),
    }),
  overview: () => request<{ companies: OwnerCompany[]; metrics: OwnerMetrics }>('/owner/overview'),
  auditLogs: (limit = 200) => request<AuditLog[]>(`/owner/audit-logs?limit=${limit}`),
  revokeAllSessions: () => request<unknown>('/owner/sessions/revoke-all', { method: 'POST' }),
  startSupportSession: (id: string) =>
    request<{ id: string; name: string; isActive: boolean }>(`/owner/companies/${id}/support-session`, { method: 'POST' }),
  createCompany: (data: NewCompany) => request<OwnerCompany>('/owner/companies', { method: 'POST', body: JSON.stringify(data) }),
  toggleCompanyStatus: (id: string) => request<OwnerCompany>(`/owner/companies/${id}/toggle-status`, { method: 'POST' }),
  deleteCompany: (id: string, masterKey: string) =>
    request<unknown>(`/owner/companies/${id}`, { method: 'DELETE', headers: masterKeyHeader(masterKey) }),
  listUsers: () => request<OwnerUser[]>('/owner/users'),
  createUser: (data: NewOwnerUser) => request<OwnerUser>('/owner/users', { method: 'POST', body: JSON.stringify(data) }),
  resetUserPassword: (id: string, masterKey: string, newPassword?: string) =>
    request<{ temporaryPassword: string }>(`/owner/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
      headers: masterKeyHeader(masterKey),
    }),
  deleteUser: (id: string, masterKey: string) =>
    request<unknown>(`/owner/users/${id}`, { method: 'DELETE', headers: masterKeyHeader(masterKey) }),
  listGps: () => request<OwnerGps[]>('/owner/gps'),
  createGps: (data: NewGps) => request<OwnerGps>('/owner/gps', { method: 'POST', body: JSON.stringify(data) }),
  updateGps: (id: string, data: { companyId: string | null }) =>
    request<OwnerGps>(`/owner/gps/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteGps: (id: string, masterKey: string) =>
    request<unknown>(`/owner/gps/${id}`, { method: 'DELETE', headers: masterKeyHeader(masterKey) }),
};
