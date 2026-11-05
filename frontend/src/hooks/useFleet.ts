import { useMemo } from 'react';
import { api, type UnitState } from '@/lib/api';
import { machineToUnit, vehicleToUnit } from '@/lib/units';
import type { FleetUnit } from '@/lib/types';
import { useApi } from './useApi';

export function useFleet(pollMs?: number, state: UnitState = 'active') {
  const result = useApi(
    async () => {
      const [vehicles, machines] = await Promise.all([api.vehicles.list(state), api.machines.list(state)]);
      return [...vehicles.map(vehicleToUnit), ...machines.map(machineToUnit)];
    },
    [state],
    { pollMs }
  );
  const units: FleetUnit[] = useMemo(() => result.data || [], [result.data]);
  return { ...result, units };
}
