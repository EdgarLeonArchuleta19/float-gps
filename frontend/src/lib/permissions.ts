import type { LucideIcon } from 'lucide-react-native';
import { Bell, CircleDot, FileBarChart, Home, Share2, Truck, Zap } from 'lucide-react-native';

export type Permission = 'dashboard' | 'share' | 'engine' | 'alerts' | 'fleet' | 'geofences' | 'reports';

export const PERMISSION_OPTIONS: { key: Permission; label: string; hint: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Inicio', hint: 'Resumen del día de la flota', icon: Home },
  { key: 'share', label: 'Compartir', hint: 'Enviar la ubicación de las unidades', icon: Share2 },
  { key: 'engine', label: 'Apagar motor', hint: 'Paro y reanudación de motor', icon: Zap },
  { key: 'alerts', label: 'Alertas', hint: 'Eventos y modo alarma', icon: Bell },
  { key: 'fleet', label: 'Flota', hint: 'Listado y detalle de unidades', icon: Truck },
  { key: 'geofences', label: 'Geocercas', hint: 'Ver zonas en el mapa', icon: CircleDot },
  { key: 'reports', label: 'Reportes', hint: 'Kilómetros, horas y bitácora', icon: FileBarChart },
];

export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/dashboard': 'dashboard',
  '/share': 'share',
  '/engine': 'engine',
  '/notifications': 'alerts',
  '/fleet': 'fleet',
  '/units': 'fleet',
  '/geofences': 'geofences',
  '/reports': 'reports',
};

export function permissionSummary(permissions: string[]) {
  const labels = PERMISSION_OPTIONS.filter((p) => permissions.includes(p.key)).map((p) => p.label);
  if (!labels.length) return 'Solo mapa';
  if (labels.length === PERMISSION_OPTIONS.length) return 'Todas las opciones';
  return `Mapa, ${labels.join(', ')}`;
}

export function routePermission(pathname: string): Permission | null {
  const match = Object.keys(ROUTE_PERMISSIONS).find((route) => pathname === route || pathname.startsWith(`${route}/`));
  return match ? ROUTE_PERMISSIONS[match] : null;
}
