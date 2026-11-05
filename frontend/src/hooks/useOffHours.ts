import { useMemo } from 'react';
import { api } from '@/lib/api';
import { useApi } from './useApi';
import { usePlan } from './usePlan';

export function useOffHours(startDate: string, endDate: string = startDate) {
  const { isPersonal } = usePlan();
  const enabled = !isPersonal;
  const { data } = useApi(() => (enabled ? api.reports.offHours(startDate, endDate) : Promise.resolve([])), [startDate, endDate, enabled], { pollMs: 120000 });
  return useMemo(() => {
    const byUnit: Record<string, number> = {};
    const byName: Record<string, number> = {};
    (data || []).forEach((r) => {
      byUnit[r.unitId] = r.offHoursKm;
      byName[r.unitName] = (byName[r.unitName] || 0) + r.offHoursKm;
    });
    const total = (data || []).reduce((acc, r) => acc + r.offHoursKm, 0);
    return { enabled, byUnit, byName, total };
  }, [data, enabled]);
}
