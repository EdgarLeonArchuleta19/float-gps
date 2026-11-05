import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export interface UnitSelection {
  vehicleIds: string[];
  machineIds: string[];
}

export function idList(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string' && !!v))] : [];
}

// Units picked in a form (for a person, a group or a geofence) must all belong
// to the caller's company; any foreign or deleted id rejects the whole list.
export async function companyUnits(data: { vehicleIds?: unknown; machineIds?: unknown }, companyId: string): Promise<UnitSelection> {
  const vehicleIds = idList(data.vehicleIds);
  const machineIds = idList(data.machineIds);
  const [vehicles, machines] = await Promise.all([
    vehicleIds.length ? prisma.vehicle.count({ where: { id: { in: vehicleIds }, companyId, deletedAt: null } }) : 0,
    machineIds.length ? prisma.machine.count({ where: { id: { in: machineIds }, companyId, deletedAt: null } }) : 0,
  ]);
  if (vehicles !== vehicleIds.length || machines !== machineIds.length) throw new AppError('Alguna unidad no pertenece a tu empresa', 400);
  return { vehicleIds, machineIds };
}

export function unitRows(selection: UnitSelection) {
  return [...selection.vehicleIds.map((vehicleId) => ({ vehicleId })), ...selection.machineIds.map((machineId) => ({ machineId }))];
}
