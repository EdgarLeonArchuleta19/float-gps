import type { UnitSummary } from './summary';

export type SortKey = 'km' | 'hours' | 'idle' | 'offHoursKm' | 'alerts';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'km', label: 'Km' },
  { value: 'hours', label: 'Motor' },
  { value: 'idle', label: 'Ralentí' },
  { value: 'offHoursKm', label: 'F. horario' },
  { value: 'alerts', label: 'Alertas' },
];

export function sortSummaries(items: UnitSummary[], key: SortKey): UnitSummary[] {
  return [...items].sort((a, b) => b[key] - a[key] || a.unitName.localeCompare(b.unitName));
}

export const NUMERIC = { fontVariant: ['tabular-nums' as const] };
