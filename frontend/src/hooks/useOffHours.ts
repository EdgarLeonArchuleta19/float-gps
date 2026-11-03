import { useMemo } from 'react';
import { api } from '@/lib/api';
import { useApi } from './useApi';

export function useOffHours(startDate: string, endDate: string = startDate) {
  const { data } = useApi(() => api.reports.offHours(startDate, endDate), [startDate, endDate], { pollMs: 120000 });
  return useMemo(() => {
    const byUnit: Record<string, number> = {};
    const byName: Record<string, number> = {};
    (data || []).forEach((r) => {
      byUnit[r.unitId] = r.offHoursKm;
      byName[r.unitName] = (byName[r.unitName] || 0) + r.offHoursKm;
    });
    const total = (data || []).reduce((acc, r) => acc + r.offHoursKm, 0);
    return { byUnit, byName, total };
  }, [data]);
}
