import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../middleware/auth';

const prisma = new PrismaClient();

export type UnitKind = 'vehicle' | 'machine';

interface OwnedUnit {
  companyId: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  roleUnits: { id: string }[];
}

// Admins (permissions === null) still reach deactivated units to manage them
// and keep their history; regular users only see active ones. Deleted units
// are invisible to every company user.
function seesInactive(tenant: TenantContext) {
  return tenant.permissions === null;
}

// Single access rule for anything tied to a unit: the owner console sees all,
// everyone else only units of their own company, and users whose role is
// limited to some units only those units. Users without a company see nothing.
function tenantCanSee(unit: OwnedUnit | null, tenant: TenantContext): boolean {
  if (tenant.isSuperAdmin) return true;
  if (!unit || !tenant.companyId || unit.companyId !== tenant.companyId || unit.deletedAt) return false;
  if (!unit.isActive && !seesInactive(tenant)) return false;
  return !tenant.restrictToUserUnits || unit.roleUnits.length > 0;
}

function assignedTo(tenant: TenantContext) {
  return { where: { roleId: tenant.roleId || '' }, select: { id: true } };
}

// Prisma filter for Vehicle/Machine rows the tenant may see.
export function unitFilter(tenant: TenantContext) {
  return {
    companyId: tenant.companyId,
    deletedAt: null,
    ...(seesInactive(tenant) ? {} : { isActive: true }),
    ...(tenant.restrictToUserUnits ? { roleUnits: { some: { roleId: tenant.roleId || '' } } } : {}),
  };
}

// Prisma filter for rows linked to a vehicle or machine (work sessions,
// GPS devices). null means no restriction: the owner console outside support.
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
  const select = { companyId: true, isActive: true, deletedAt: true, roleUnits: assignedTo(tenant) };
  const unit =
    kind === 'vehicle'
      ? await prisma.vehicle.findUnique({ where: { id: unitId }, select })
      : await prisma.machine.findUnique({ where: { id: unitId }, select });
  return tenantCanSee(unit, tenant);
}

export async function canAccessGpsDevice(gpsDeviceId: string, tenant: TenantContext): Promise<boolean> {
  if (tenant.isSuperAdmin) return true;
  const unitSelect = { select: { companyId: true, isActive: true, deletedAt: true, roleUnits: assignedTo(tenant) } };
  const device = await prisma.gpsDevice.findUnique({
    where: { id: gpsDeviceId },
    select: { vehicle: unitSelect, machine: unitSelect },
  });
  return tenantCanSee(device?.vehicle || device?.machine || null, tenant);
}
