import type { LucideIcon } from 'lucide-react-native';
import { BadgeCheck, CircleDashed, Disc3, Droplet, FileText, Landmark, ShieldCheck, Wrench } from 'lucide-react-native';
import type { MaintenanceKind, MaintenanceStatus } from '@/lib/types';

export const MAINTENANCE_KINDS: { value: MaintenanceKind; label: string; icon: LucideIcon; km: number | null; days: number | null }[] = [
  { value: 'OIL', label: 'Cambio de aceite', icon: Droplet, km: 5000, days: 180 },
  { value: 'SERVICE', label: 'Servicio general', icon: Wrench, km: 10000, days: 365 },
  { value: 'TIRES', label: 'Llantas', icon: CircleDashed, km: 40000, days: null },
  { value: 'BRAKES', label: 'Frenos', icon: Disc3, km: 30000, days: null },
  { value: 'INSURANCE', label: 'Seguro', icon: ShieldCheck, km: null, days: 365 },
  { value: 'TAX', label: 'Tenencia / refrendo', icon: Landmark, km: null, days: 365 },
  { value: 'VERIFICATION', label: 'Verificación', icon: BadgeCheck, km: null, days: 180 },
  { value: 'OTHER', label: 'Otro', icon: FileText, km: null, days: null },
];

export function maintenanceKind(kind: MaintenanceKind) {
  return MAINTENANCE_KINDS.find((k) => k.value === kind) || MAINTENANCE_KINDS[MAINTENANCE_KINDS.length - 1];
}

export const MAINTENANCE_STATUS: Record<MaintenanceStatus, { label: string; color: string }> = {
  DUE: { label: 'Vencido', color: '#dc2626' },
  SOON: { label: 'Pronto', color: '#d97706' },
  OK: { label: 'Al día', color: '#16a34a' },
};
