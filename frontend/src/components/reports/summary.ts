import type { ReportRow, TrackingEvent } from '@/lib/types';

export interface UnitSummary {
  unitName: string;
  km: number;
  hours: number;
  idle: number;
  moving: number;
  days: number;
  alerts: number;
  offHoursKm: number;
}

export function summarize(rows: ReportRow[], events: TrackingEvent[], offHoursByName: Record<string, number> = {}): UnitSummary[] {
  const alerts: Record<string, number> = {};
  events.forEach((e) => {
    if (e.severity === 'CRITICAL' || e.severity === 'WARNING') {
      const name = e.unitName || 'Desconocido';
      alerts[name] = (alerts[name] || 0) + 1;
    }
  });
  const byUnit: Record<string, UnitSummary> = {};
  rows.forEach((r) => {
    const s = (byUnit[r.unitName] ||= { unitName: r.unitName, km: 0, hours: 0, idle: 0, moving: 0, days: 0, alerts: alerts[r.unitName] || 0, offHoursKm: offHoursByName[r.unitName] || 0 });
    s.km += r.kilometers ?? r.totalKm ?? 0;
    s.hours += r.totalHours ?? 0;
    s.idle += r.idleHours ?? r.totalIdle ?? 0;
    s.moving += r.movingHours ?? r.totalMoving ?? 0;
    s.days += r.days ?? 1;
  });
  return Object.values(byUnit).sort((a, b) => b.km - a.km);
}
