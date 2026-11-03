import type { LucideIcon } from 'lucide-react-native';
import { AlertTriangle, Clock, Gauge, MoonStar, PowerOff } from 'lucide-react-native';

export type MetricKey = 'km' | 'hours' | 'idle' | 'offHours' | 'alerts';

export const METRICS: Record<MetricKey, { label: string; icon: LucideIcon }> = {
  km: { label: 'Kilómetros', icon: Gauge },
  hours: { label: 'Horas motor', icon: Clock },
  idle: { label: 'Ralentí', icon: PowerOff },
  offHours: { label: 'Km fuera de horario', icon: MoonStar },
  alerts: { label: 'Alertas', icon: AlertTriangle },
};
