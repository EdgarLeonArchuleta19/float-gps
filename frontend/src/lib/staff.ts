import type { Plan } from './types';

export type StaffRole = 'owner' | 'support' | 'sales' | 'installer';

export type StaffPermission = 'companies' | 'billing' | 'support' | 'customers' | 'gps' | 'trash' | 'audit' | 'team';

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  permissions: StaffPermission[];
}

export interface SupportSession {
  id: string;
  reason: string;
  expiresAt: string;
  company: { id: string; name: string; plan: Plan };
}

export const STAFF_ROLES: { value: StaffRole; label: string; hint: string }[] = [
  { value: 'owner', label: 'Dueño', hint: 'Todo, incluido el equipo y eliminar empresas' },
  { value: 'support', label: 'Soporte', hint: 'Modo Soporte, usuarios de clientes, GPS y Eliminados' },
  { value: 'sales', label: 'Ventas y cobranza', hint: 'Empresas, planes y suscripciones' },
  { value: 'installer', label: 'Instalador', hint: 'Inventario GPS y alta de unidades en Modo Soporte' },
];

export function staffRoleLabel(role: string | null | undefined) {
  return STAFF_ROLES.find((r) => r.value === role)?.label || 'Equipo';
}
