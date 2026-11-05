import { request } from '@/lib/api';
import type { Plan } from '@/lib/types';
import type { StaffMember, StaffRole, SupportSession } from '@/lib/staff';

export interface ConsoleCompany {
  id: string;
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  plan?: string | null;
  maxUnits?: number | null;
  isActive: boolean;
  _count?: { vehicles?: number; machines?: number; gpsDevices?: number; users?: number; geofences?: number };
}

export interface ConsoleMetrics {
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

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  company?: { id: string; name: string } | null;
  customRole?: { name: string } | null;
}

export interface ConsoleGps {
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
  actorRole?: string | null;
  ip?: string | null;
  success: boolean;
  createdAt: string;
  details?: Record<string, unknown> | null;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
export type BillingCycle = 'MONTHLY' | 'YEARLY';

export interface Subscription {
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  pricePerUnit: number;
  currency: string;
  startedAt: string;
  nextBillingAt: string | null;
  notes: string | null;
}

export interface SubscriptionRow {
  company: { id: string; name: string; plan: Plan; maxUnits: number; isActive: boolean };
  units: number;
  subscription: Subscription | null;
  monthlyAmount: number;
}

export interface SubscriptionMetrics {
  monthlyRevenue: number;
  active: number;
  trial: number;
  pastDue: number;
  dueSoon: number;
  withoutSubscription: number;
}

export interface SubscriptionInput {
  maxUnits: number;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  pricePerUnit: number;
  nextBillingAt: string | null;
  notes: string;
}

export interface NewCompany {
  plan: Plan;
  name: string;
  legalName: string;
  taxId: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;
  maxUnits: number;
  notes: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface CustomerDetail {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  plan: Plan;
  maxUnits: number;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerInput {
  name: string;
  legalName: string;
  taxId: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;
  notes: string;
}

export interface CustomerUnit {
  kind: 'vehicle' | 'machine';
  id: string;
  name: string;
  detail: string | null;
  isActive: boolean;
  gps: { id: string; imei: string } | null;
}

export interface NewVehicleForGps {
  name: string;
  plate: string;
  type: string;
  brand: string;
  vehicleModel: string;
}

export type TrashType = 'company' | 'user' | 'vehicle' | 'machine' | 'geofence' | 'role' | 'gps' | 'group' | 'maintenance';

export interface TrashItem {
  type: TrashType;
  id: string;
  label: string;
  detail: string | null;
  companyName: string | null;
  deletedAt: string;
}

export interface NewCustomerUser {
  name: string;
  email: string;
  password: string;
  companyId: string;
}

interface NewGps {
  imei: string;
  model: string;
  simNumber: string;
  companyId: string | null;
}

const post = (body?: unknown): RequestInit => ({ method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const consoleApi = {
  login: (email: string, password: string) => request<{ token: string; staff: StaffMember }>('/staff/auth/login', post({ email, password })),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string; token: string }>('/staff/me/password', post({ currentPassword, newPassword })),
  logoutAll: (confirmPassword: string) => request<{ message: string }>('/staff/me/logout-all', post({ confirmPassword })),

  overview: () => request<{ companies: ConsoleCompany[]; metrics: ConsoleMetrics }>('/staff/overview'),
  createCompany: (data: NewCompany) => request<ConsoleCompany>('/staff/companies', post(data)),
  company: (id: string) => request<CustomerDetail>(`/staff/companies/${id}`),
  updateCompany: (id: string, data: CustomerInput) => request<CustomerDetail>(`/staff/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  changePlan: (id: string, data: { plan: Plan; maxUnits: number; reason: string }, confirmPassword: string) =>
    request<CustomerDetail>(`/staff/companies/${id}/plan`, post({ ...data, confirmPassword })),
  companyHistory: (id: string) => request<AuditLog[]>(`/staff/companies/${id}/history`),
  companyUnits: (id: string) => request<CustomerUnit[]>(`/staff/companies/${id}/units`),
  toggleCompanyStatus: (id: string, confirmPassword: string) => request<ConsoleCompany>(`/staff/companies/${id}/toggle-status`, post({ confirmPassword })),
  deleteCompany: (id: string, confirmPassword: string) => request<unknown>(`/staff/companies/${id}`, { method: 'DELETE', body: JSON.stringify({ confirmPassword }) }),

  startSupport: (companyId: string, reason: string) => request<SupportSession>(`/staff/companies/${companyId}/support-sessions`, post({ reason })),
  endSupport: (id: string) => request<unknown>(`/staff/support-sessions/${id}/end`, post()),

  subscriptions: () => request<{ rows: SubscriptionRow[]; metrics: SubscriptionMetrics }>('/staff/subscriptions'),
  saveSubscription: (companyId: string, data: SubscriptionInput, confirmPassword: string) =>
    request<Subscription>(`/staff/subscriptions/${companyId}`, { method: 'PUT', body: JSON.stringify({ ...data, confirmPassword }) }),

  listUsers: () => request<CustomerUser[]>('/staff/users'),
  createUser: (data: NewCustomerUser) => request<CustomerUser>('/staff/users', post(data)),
  resetUserPassword: (id: string, confirmPassword: string, newPassword?: string) =>
    request<{ temporaryPassword: string }>(`/staff/users/${id}/reset-password`, post({ newPassword, confirmPassword })),
  deleteUser: (id: string, confirmPassword: string) => request<unknown>(`/staff/users/${id}`, { method: 'DELETE', body: JSON.stringify({ confirmPassword }) }),

  listGps: () => request<ConsoleGps[]>('/staff/gps'),
  createGps: (data: NewGps) => request<ConsoleGps>('/staff/gps', post(data)),
  updateGps: (id: string, data: { companyId: string | null }, confirmPassword: string) =>
    request<ConsoleGps>(`/staff/gps/${id}`, { method: 'PATCH', body: JSON.stringify({ ...data, confirmPassword }) }),
  linkGps: (id: string, target: { unitKind: 'vehicle' | 'machine'; unitId: string } | { newVehicle: NewVehicleForGps }, confirmPassword: string) =>
    request<{ companyId: string; unitId: string }>(`/staff/gps/${id}/link`, post({ ...target, confirmPassword })),
  unlinkGps: (id: string, confirmPassword: string) => request<unknown>(`/staff/gps/${id}/unlink`, post({ confirmPassword })),
  deleteGps: (id: string, confirmPassword: string) => request<unknown>(`/staff/gps/${id}`, { method: 'DELETE', body: JSON.stringify({ confirmPassword }) }),

  trash: () => request<TrashItem[]>('/staff/trash'),
  restore: (item: TrashItem) => request<{ message: string }>(`/staff/trash/${item.type}/${item.id}/restore`, post()),

  auditLogs: (limit = 200) => request<AuditLog[]>(`/staff/audit-logs?limit=${limit}`),

  team: () => request<TeamMember[]>('/staff/team'),
  createMember: (data: { name: string; email: string; role: StaffRole }, confirmPassword: string) =>
    request<{ member: TeamMember; temporaryPassword: string | null }>('/staff/team', post({ ...data, confirmPassword })),
  updateMember: (id: string, data: { name?: string; role?: StaffRole }, confirmPassword: string) =>
    request<TeamMember>(`/staff/team/${id}`, { method: 'PATCH', body: JSON.stringify({ ...data, confirmPassword }) }),
  setMemberActive: (id: string, active: boolean, confirmPassword: string) =>
    request<TeamMember>(`/staff/team/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active, confirmPassword }) }),
  resetMemberPassword: (id: string, confirmPassword: string) =>
    request<{ temporaryPassword: string }>(`/staff/team/${id}/reset-password`, post({ confirmPassword })),
};
