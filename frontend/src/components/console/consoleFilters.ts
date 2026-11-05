import { PLAN_LABELS, normalizePlan } from '@/lib/plans';
import { STAFF_ROLES } from '@/lib/staff';
import { SUBSCRIPTION_STATUS } from './SubscriptionsTab';
import type { AuditLog, ConsoleCompany, ConsoleGps, CustomerUser, SubscriptionRow, SubscriptionStatus, TeamMember, TrashItem, TrashType } from './consoleApi';

export interface ListFilter<T> {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  match: (item: T, value: string) => boolean;
}

const PLAN_OPTIONS = [
  { value: 'PERSONAL', label: PLAN_LABELS.PERSONAL },
  { value: 'EMPRESA', label: PLAN_LABELS.EMPRESA },
];

function distinct(values: (string | null | undefined)[]) {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }));
}

export function companyFilters(): ListFilter<ConsoleCompany>[] {
  return [
    { name: 'plan', label: 'Plan', options: PLAN_OPTIONS, match: (c, v) => normalizePlan(c.plan) === v },
    {
      name: 'status',
      label: 'Estado',
      options: [
        { value: 'active', label: 'Activos' },
        { value: 'suspended', label: 'Suspendidos' },
      ],
      match: (c, v) => (v === 'active' ? c.isActive : !c.isActive),
    },
  ];
}

export function subscriptionFilters(): ListFilter<SubscriptionRow>[] {
  return [
    {
      name: 'status',
      label: 'Estado',
      options: [...(Object.keys(SUBSCRIPTION_STATUS) as SubscriptionStatus[]).map((s) => ({ value: s, label: SUBSCRIPTION_STATUS[s].label })), { value: 'none', label: 'Sin suscripción' }],
      match: (r, v) => (v === 'none' ? !r.subscription : r.subscription?.status === v),
    },
    { name: 'plan', label: 'Plan', options: PLAN_OPTIONS, match: (r, v) => r.company.plan === v },
    {
      name: 'billing',
      label: 'Cobro',
      options: [
        { value: 'overdue', label: 'Fecha de cobro pasada' },
        { value: 'week', label: 'Cobro en 7 días' },
      ],
      match: (r, v) => {
        const next = r.subscription?.nextBillingAt ? new Date(r.subscription.nextBillingAt).getTime() : null;
        if (next === null) return false;
        return v === 'overdue' ? next < Date.now() : next >= Date.now() && next - Date.now() <= 7 * 86400000;
      },
    },
  ];
}

export function userFilters(users: CustomerUser[]): ListFilter<CustomerUser>[] {
  return [
    { name: 'client', label: 'Cliente', options: distinct(users.map((u) => u.company?.name)), match: (u, v) => u.company?.name === v },
    {
      name: 'role',
      label: 'Rol',
      options: [
        { value: 'admin', label: 'Administradores' },
        { value: 'member', label: 'Otros roles' },
      ],
      match: (u, v) => (v === 'admin' ? u.role === 'admin' : u.role !== 'admin'),
    },
  ];
}

export function gpsFilters(devices: ConsoleGps[]): ListFilter<ConsoleGps>[] {
  return [
    {
      name: 'link',
      label: 'Estado',
      options: [
        { value: 'linked', label: 'En una unidad' },
        { value: 'free', label: 'Con cliente, sin unidad' },
        { value: 'stock', label: 'Stock libre' },
      ],
      match: (g, v) => {
        const linked = !!(g.vehicle || g.machine);
        if (v === 'linked') return linked;
        if (v === 'free') return !linked && !!g.companyId;
        return !g.companyId;
      },
    },
    { name: 'client', label: 'Cliente', options: distinct(devices.map((g) => g.company?.name)), match: (g, v) => g.company?.name === v },
    { name: 'model', label: 'Modelo', options: distinct(devices.map((g) => g.model)), match: (g, v) => g.model === v },
  ];
}

export function teamFilters(): ListFilter<TeamMember>[] {
  return [
    { name: 'role', label: 'Rol', options: STAFF_ROLES.map((r) => ({ value: r.value, label: r.label })), match: (m, v) => m.role === v },
    {
      name: 'status',
      label: 'Estado',
      options: [
        { value: 'active', label: 'Activos' },
        { value: 'inactive', label: 'Desactivados' },
      ],
      match: (m, v) => (v === 'active' ? m.isActive : !m.isActive),
    },
  ];
}

const TRASH_LABELS: Record<TrashType, string> = {
  company: 'Clientes',
  user: 'Usuarios',
  vehicle: 'Vehículos',
  machine: 'Maquinaria',
  geofence: 'Geocercas',
  role: 'Roles',
  gps: 'GPS',
  group: 'Grupos',
  maintenance: 'Mantenimientos',
};

export function trashFilters(items: TrashItem[]): ListFilter<TrashItem>[] {
  return [
    { name: 'type', label: 'Tipo', options: (Object.keys(TRASH_LABELS) as TrashType[]).map((k) => ({ value: k, label: TRASH_LABELS[k] })), match: (r, v) => r.type === v },
    { name: 'client', label: 'Cliente', options: distinct(items.map((r) => r.companyName)), match: (r, v) => r.companyName === v },
  ];
}

const AUDIT_AREAS: { value: string; label: string; prefixes: string[] }[] = [
  { value: 'access', label: 'Accesos a la consola', prefixes: ['STAFF_'] },
  { value: 'clients', label: 'Clientes y planes', prefixes: ['COMPANY_', 'SUBSCRIPTION_'] },
  { value: 'support', label: 'Modo Soporte', prefixes: ['SUPPORT_'] },
  { value: 'users', label: 'Usuarios de clientes', prefixes: ['USER_'] },
  { value: 'gps', label: 'GPS', prefixes: ['GPS_'] },
  { value: 'team', label: 'Equipo', prefixes: ['TEAM_'] },
  { value: 'trash', label: 'Eliminados', prefixes: ['RECORD_'] },
];

export function auditFilters(): ListFilter<AuditLog>[] {
  return [
    {
      name: 'area',
      label: 'Área',
      options: AUDIT_AREAS.map((a) => ({ value: a.value, label: a.label })),
      match: (l, v) => !!AUDIT_AREAS.find((a) => a.value === v)?.prefixes.some((p) => l.action.startsWith(p)),
    },
    {
      name: 'result',
      label: 'Resultado',
      options: [
        { value: 'ok', label: 'Correctos' },
        { value: 'fail', label: 'Rechazados o fallidos' },
      ],
      match: (l, v) => (v === 'ok' ? l.success : !l.success),
    },
    { name: 'role', label: 'Rol', options: STAFF_ROLES.map((r) => ({ value: r.value, label: r.label })), match: (l, v) => l.actorRole === v },
  ];
}
