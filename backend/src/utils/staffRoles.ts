// Roles of the floaGPS team (console users), separate from customer roles.
// Each grants a fixed set of console capabilities.
export const STAFF_ROLES = ['owner', 'support', 'sales', 'installer'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_PERMISSIONS = ['companies', 'billing', 'support', 'customers', 'gps', 'trash', 'audit', 'team'] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

const GRANTS: Record<StaffRole, StaffPermission[]> = {
  owner: [...STAFF_PERMISSIONS],
  support: ['companies', 'support', 'customers', 'gps', 'trash'],
  sales: ['companies', 'billing', 'customers'],
  installer: ['companies', 'support', 'gps'],
};

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value);
}

export function staffPermissions(role: string): StaffPermission[] {
  return isStaffRole(role) ? GRANTS[role] : [];
}

// In Support Mode, owners and support act as the company admin; installers
// only reach the fleet (register units and link GPS) and the map.
export function supportPermissions(role: string): string[] | null {
  return role === 'installer' ? ['fleet'] : null;
}
