import { useMemo } from 'react';
import { api } from '@/lib/api';
import { machineToUnit, vehicleToUnit } from '@/lib/units';
import type { FleetUnit } from '@/lib/types';
import { useApi } from './useApi';

export function useFleet(pollMs?: number) {
  const result = useApi(
    async () => {
      const [vehicles, machines] = await Promise.all([api.vehicles.list(), api.machines.list()]);
      return [...vehicles.map(vehicleToUnit), ...machines.map(machineToUnit)];
    },
    [],
    { pollMs }
  );
  const units: FleetUnit[] = useMemo(() => result.data || [], [result.data]);
  return { ...result, units };
}
