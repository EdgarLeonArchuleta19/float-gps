import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../middleware/auth';

const prisma = new PrismaClient();

export type UnitKind = 'vehicle' | 'machine';

interface OwnedUnit {
  companyId: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  roleUnits: { id: string }[];
  userUnits: { id: string }[];
}

// Admins (permissions === null) still reach deactivated units to manage them
// and keep their history; regular users only see active ones. Deleted units
// are invisible to every company user.
function seesInactive(tenant: TenantContext) {
  return tenant.permissions === null;
}

// Single access rule for anything tied to a unit: only units of the caller's
// company, and users whose role is limited to some units only those units.
// Callers without a company see nothing.
function tenantCanSee(unit: OwnedUnit | null, tenant: TenantContext): boolean {
  if (!unit || !tenant.companyId || unit.companyId !== tenant.companyId || unit.deletedAt) return false;
  if (!unit.isActive && !seesInactive(tenant)) return false;
  if (!tenant.restrictToUserUnits) return true;
  return tenant.unitsByUser ? unit.userUnits.length > 0 : unit.roleUnits.length > 0;
}

// A member sees the units of their role, unless the admin picked units for
// that person (User.ownUnits): then only those, whatever the role says.
function assignment(tenant: TenantContext) {
  return {
    roleUnits: { where: { roleId: tenant.roleId || '' }, select: { id: true } },
    userUnits: { where: { userId: tenant.userId }, select: { id: true } },
  };
}

function assignedFilter(tenant: TenantContext) {
  return tenant.unitsByUser ? { userUnits: { some: { userId: tenant.userId } } } : { roleUnits: { some: { roleId: tenant.roleId || '' } } };
}

// Prisma filter for Vehicle/Machine rows the tenant may see.
export function unitFilter(tenant: TenantContext) {
  return {
    companyId: tenant.companyId,
    deletedAt: null,
    ...(seesInactive(tenant) ? {} : { isActive: true }),
    ...(tenant.restrictToUserUnits ? assignedFilter(tenant) : {}),
  };
}

// Prisma filter for rows linked to a vehicle or machine (work sessions,
// GPS devices). null means no company scope, which never reaches these routes.
export function linkedUnitFilter(tenant?: TenantContext) {
  if (!tenant?.companyId) return null;
  const unit = unitFilter(tenant);
  return { OR: [{ vehicle: unit }, { machine: unit }] };
}

// Same as linkedUnitFilter for GPS devices, but admins also see events of
// their company's devices that are not linked to a unit yet.
export function gpsDeviceFilter(tenant?: TenantContext) {
  if (!tenant?.companyId) return null;
  const unit = unitFilter(tenant);
  const linked = [{ vehicle: unit }, { machine: unit }];
  if (tenant.restrictToUserUnits) return { deletedAt: null, OR: linked };
  return { deletedAt: null, OR: [{ companyId: tenant.companyId, vehicleId: null, machineId: null }, ...linked] };
}

// Status filter for unit lists: regular users always get active units; admins
// may ask for deactivated ones (?status=inactive|all) to manage them.
export function unitStatusFilter(status: string | undefined, tenant?: TenantContext) {
  if (tenant && tenant.permissions !== null) return { isActive: true };
  if (status === 'all') return {};
  return { isActive: status !== 'inactive' };
}

export async function canAccessUnit(kind: UnitKind, unitId: string, tenant: TenantContext): Promise<boolean> {
  const select = { companyId: true, isActive: true, deletedAt: true, ...assignment(tenant) };
  const unit =
    kind === 'vehicle'
      ? await prisma.vehicle.findUnique({ where: { id: unitId }, select })
      : await prisma.machine.findUnique({ where: { id: unitId }, select });
  return tenantCanSee(unit, tenant);
}

export async function canAccessGpsDevice(gpsDeviceId: string, tenant: TenantContext): Promise<boolean> {
  const unitSelect = { select: { companyId: true, isActive: true, deletedAt: true, ...assignment(tenant) } };
  const device = await prisma.gpsDevice.findUnique({
    where: { id: gpsDeviceId },
    select: { vehicle: unitSelect, machine: unitSelect },
  });
  return tenantCanSee(device?.vehicle || device?.machine || null, tenant);
}
