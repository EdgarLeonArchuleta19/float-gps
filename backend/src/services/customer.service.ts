import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import type { StaffContext } from '../middleware/staffAuth';
import type { TenantContext } from '../middleware/auth';
import { writeAudit } from './audit.service';
import { VehicleService } from './vehicle.service';
import { DEFAULT_MAX_UNITS, PLAN_LABELS, normalizePlan, type Plan } from '../utils/plans';

const prisma = new PrismaClient();
const vehicles = new VehicleService();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const REASON_MIN = 5;

const DETAIL_SELECT = {
  id: true,
  name: true,
  legalName: true,
  taxId: true,
  contactEmail: true,
  contactPhone: true,
  address: true,
  website: true,
  notes: true,
  plan: true,
  maxUnits: true,
  isActive: true,
  createdAt: true,
} as const;

interface ActorContext {
  staff: StaffContext;
  ip: string;
  userAgent: string | null;
}

async function findCompany(id: string) {
  const company = await prisma.company.findUnique({ where: { id }, select: { ...DETAIL_SELECT, deletedAt: true } });
  if (!company || company.deletedAt) throw new AppError('Cliente no encontrado', 404);
  return company;
}

function text(data: Record<string, unknown>, key: string, label: string, max: number, required: boolean) {
  const value = typeof data[key] === 'string' ? (data[key] as string).trim() : '';
  if (required && !value) throw new AppError(`${label} es obligatorio`, 400);
  if (value.length > max) throw new AppError(`${label} es demasiado largo`, 400);
  return value || null;
}

// Customer data as the floaGPS team manages it from the console: business
// details, plan changes (always with a reason) and the GPS of each unit.
export class CustomerService {
  async get(id: string) {
    const company = await findCompany(id);
    const { deletedAt, ...rest } = company;
    return { ...rest, plan: normalizePlan(company.plan) };
  }

  async update(id: string, data: Record<string, unknown>) {
    const company = await findCompany(id);
    const business = normalizePlan(company.plan) === 'EMPRESA';
    const contactEmail = text(data, 'contactEmail', 'El correo', 120, true)!.toLowerCase();
    if (!EMAIL_PATTERN.test(contactEmail)) throw new AppError('El correo no es válido', 400);
    const contactPhone = text(data, 'contactPhone', 'El teléfono', 30, true)!;
    if (contactPhone.replace(/\D/g, '').length < 10) throw new AppError('El teléfono debe tener al menos 10 dígitos', 400);
    const taxId = text(data, 'taxId', 'El RFC', 13, business);
    if (taxId && !RFC_PATTERN.test(taxId.toUpperCase())) throw new AppError('El RFC no tiene un formato válido (12 o 13 caracteres)', 400);
    await prisma.company.update({
      where: { id },
      data: {
        name: text(data, 'name', business ? 'El nombre comercial' : 'El nombre', 80, true)!,
        legalName: text(data, 'legalName', 'La razón social', 120, business),
        taxId: taxId ? taxId.toUpperCase() : null,
        contactEmail,
        contactPhone,
        address: text(data, 'address', 'La dirección', 250, business),
        website: text(data, 'website', 'El sitio web', 120, false),
        notes: text(data, 'notes', 'Las notas', 500, false),
      },
    });
    return this.get(id);
  }

  // Changing the plan always needs a reason; the audit log keeps the plan and
  // unit limit before and after.
  async changePlan(id: string, data: Record<string, unknown>, actor: ActorContext) {
    const company = await findCompany(id);
    const from = normalizePlan(company.plan);
    const to: Plan | null = data.plan === 'PERSONAL' || data.plan === 'EMPRESA' ? data.plan : null;
    if (!to) throw new AppError('Elige el plan nuevo', 400);
    if (to === from) throw new AppError(`El cliente ya tiene el plan ${PLAN_LABELS[to]}`, 400);
    const reason = typeof data.reason === 'string' ? data.reason.trim() : '';
    if (reason.length < REASON_MIN) throw new AppError('Escribe el motivo del cambio de plan', 400);
    if (reason.length > 300) throw new AppError('El motivo debe tener máximo 300 caracteres', 400);
    const requested = Number(data.maxUnits);
    const maxUnits = Number.isInteger(requested) && requested > 0 && requested <= 10000 ? requested : DEFAULT_MAX_UNITS[to];

    await prisma.company.update({ where: { id }, data: { plan: to, maxUnits } });
    await writeAudit({
      actorId: actor.staff.id,
      actorEmail: actor.staff.email,
      actorRole: actor.staff.role,
      companyId: id,
      action: 'COMPANY_PLAN_CHANGE',
      targetType: 'company',
      targetId: id,
      details: { from, to, maxUnitsFrom: company.maxUnits, maxUnitsTo: maxUnits, reason },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    return this.get(id);
  }

  history(id: string) {
    return prisma.staffAuditLog.findMany({ where: { companyId: id }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async units(id: string) {
    await findCompany(id);
    const gps = { select: { id: true, imei: true } };
    const [vehicleRows, machineRows] = await Promise.all([
      prisma.vehicle.findMany({ where: { companyId: id, deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, plate: true, isActive: true, gpsDevice: gps } }),
      prisma.machine.findMany({ where: { companyId: id, deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, serialNumber: true, isActive: true, gpsDevice: gps } }),
    ]);
    return [
      ...vehicleRows.map((v) => ({ kind: 'vehicle' as const, id: v.id, name: v.name, detail: v.plate, isActive: v.isActive, gps: v.gpsDevice })),
      ...machineRows.map((m) => ({ kind: 'machine' as const, id: m.id, name: m.name, detail: m.serialNumber, isActive: m.isActive, gps: m.gpsDevice })),
    ];
  }

  // Links a GPS of the inventory to a unit of its company, or registers a new
  // vehicle with it. Returns the company so the audit log can file it there.
  async linkGps(gpsId: string, data: Record<string, unknown>) {
    const device = await prisma.gpsDevice.findUnique({ where: { id: gpsId } });
    if (!device || device.deletedAt) throw new AppError('GPS no encontrado', 404);
    if (device.vehicleId || device.machineId) throw new AppError('Este GPS ya está en una unidad. Desvincúlalo primero.', 409);
    if (!device.companyId) throw new AppError('Asigna primero el GPS a un cliente', 400);
    const companyId = device.companyId;

    if (data.newVehicle && typeof data.newVehicle === 'object') {
      const created = await vehicles.create({ ...(data.newVehicle as object), gps: { imei: device.imei } }, { companyId } as TenantContext);
      return { companyId, unitId: created.id };
    }

    const kind = data.unitKind === 'machine' ? 'machine' : 'vehicle';
    const unitId = typeof data.unitId === 'string' ? data.unitId : '';
    const unit =
      kind === 'vehicle'
        ? await prisma.vehicle.findUnique({ where: { id: unitId }, select: { companyId: true, deletedAt: true, gpsDevice: { select: { id: true } } } })
        : await prisma.machine.findUnique({ where: { id: unitId }, select: { companyId: true, deletedAt: true, gpsDevice: { select: { id: true } } } });
    if (!unit || unit.deletedAt || unit.companyId !== companyId) throw new AppError('Elige una unidad de este cliente', 400);
    if (unit.gpsDevice) throw new AppError('Esa unidad ya tiene un GPS. Desvincúlalo primero.', 409);
    await prisma.gpsDevice.update({ where: { id: gpsId }, data: kind === 'vehicle' ? { vehicleId: unitId } : { machineId: unitId } });
    return { companyId, unitId };
  }

  async unlinkGps(gpsId: string) {
    const device = await prisma.gpsDevice.findUnique({ where: { id: gpsId } });
    if (!device || device.deletedAt) throw new AppError('GPS no encontrado', 404);
    if (!device.vehicleId && !device.machineId) throw new AppError('Este GPS no está en ninguna unidad', 400);
    await prisma.gpsDevice.update({ where: { id: gpsId }, data: { vehicleId: null, machineId: null } });
    return { companyId: device.companyId };
  }
}
