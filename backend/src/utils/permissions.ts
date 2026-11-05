// Sections a custom role can be granted. The map, profile, settings and help
// are always available; administration (users, roles, company data, creating
// units or geofences) stays reserved to the company admin.
export const PERMISSIONS = ['dashboard', 'share', 'engine', 'alerts', 'fleet', 'geofences', 'reports'] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function sanitizePermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  return PERMISSIONS.filter((p) => value.includes(p));
}

// Company admins and the owner get every permission (null = unrestricted).
export function permissionsFor(role: string, customRole: { permissions: string[] } | null): string[] | null {
  if (role === 'admin' || role === 'superadmin') return null;
  return customRole ? sanitizePermissions(customRole.permissions) : [];
}
