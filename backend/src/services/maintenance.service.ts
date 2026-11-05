import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import type { TenantContext } from '../middleware/auth';
import { canAccessUnit, unitFilter } from './unitAccess';
import { dispatchAlert } from './notify.service';

const prisma = new PrismaClient();

export const MAINTENANCE_KINDS = ['OIL', 'TIRES', 'BRAKES', 'SERVICE', 'INSURANCE', 'TAX', 'VERIFICATION', 'OTHER'] as const;

const DAY_MS = 86400000;
const SOON_DAYS = 7;
const SOON_KM_MIN = 300;
const SOON_KM_SHARE = 0.1;
const REMIND_DUE_EVERY_MS = 3 * DAY_MS;
const WATCH_EVERY_MS = 60 * 60 * 1000;
const MAX_UNITS_PER_CREATE = 200;

const UNIT_SELECT = {
  vehicle: { select: { id: true, name: true, plate: true, figure: true, iconColor: true, status: true } },
  machine: { select: { id: true, name: true, serialNumber: true, status: true } },
} as const;

type Status = 'OK' | 'SOON' | 'DUE';

interface MaintenanceRow {
  id: string;
  vehicleId: string | null;
  machineId: string | null;
  intervalKm: number | null;
  intervalDays: number | null;
  lastDoneAt: Date;
}

function dayStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Kilometers since the last service come from the daily work sessions the
// GPS builds (no odometer needed): every km driven from that day on.
async function kmSince(row: MaintenanceRow) {
  const owner = row.vehicleId ? { vehicleId: row.vehicleId } : { machineId: row.machineId };
  const sum = await prisma.workSession.aggregate({ where: { ...owner, date: { gte: dayStart(row.lastDoneAt) } }, _sum: { kilometers: true } });
  return Math.round((sum._sum.kilometers || 0) * 10) / 10;
}

async function progress(row: MaintenanceRow) {
  const km = await kmSince(row);
  const dueAt = row.intervalDays ? new Date(row.lastDoneAt.getTime() + row.intervalDays * DAY_MS) : null;
  const kmLeft = row.intervalKm ? Math.round((row.intervalKm - km) * 10) / 10 : null;
  const daysLeft = dueAt ? Math.ceil((dueAt.getTime() - Date.now()) / DAY_MS) : null;
  let status: Status = 'OK';
  if ((kmLeft !== null && kmLeft <= 0) || (daysLeft !== null && daysLeft <= 0)) status = 'DUE';
  else if ((kmLeft !== null && kmLeft <= Math.max(SOON_KM_MIN, row.intervalKm! * SOON_KM_SHARE)) || (daysLeft !== null && daysLeft <= SOON_DAYS)) status = 'SOON';
  return { kmSince: km, kmLeft, dueAt, daysLeft, status };
}

function requireCompany(tenant: TenantContext) {
  if (!tenant.companyId) throw new AppError('Entra a una empresa para ver sus mantenimientos', 400);
  return tenant.companyId;
}

function parseDate(value: unknown, label: string) {
  if (value === undefined || value === null || value === '') return new Date();
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new AppError(`${label} no es válida`, 400);
  if (date.getTime() > Date.now() + DAY_MS) throw new AppError(`${label} no puede ser en el futuro`, 400);
  return date;
}

function positive(value: unknown, label: string, max: number, integer = false) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > max || (integer && !Number.isInteger(n))) throw new AppError(`${label} no es válido`, 400);
  return n;
}

function parseFields(data: any) {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (title.length < 2 || title.length > 80) throw new AppError('Escribe un nombre de 2 a 80 caracteres', 400);
  if (!MAINTENANCE_KINDS.includes(data.kind)) throw new AppError('Elige el tipo de mantenimiento', 400);
  const intervalKm = positive(data.intervalKm, 'El intervalo en km', 200000);
  const intervalDays = positive(data.intervalDays, 'El intervalo en días', 3650, true);
  if (!intervalKm && !intervalDays) throw new AppError('Indica cada cuántos km o cada cuántos días toca', 400);
  const notes = typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim().slice(0, 500) : null;
  return { title, kind: data.kind as string, intervalKm, intervalDays, notes, lastDoneAt: parseDate(data.lastDoneAt, 'La fecha del último servicio') };
}

async function findInTenant(id: string, tenant: TenantContext) {
  const companyId = requireCompany(tenant);
  const row = await prisma.maintenance.findUnique({ where: { id } });
  if (!row || row.companyId !== companyId || row.deletedAt) throw new AppError('Mantenimiento no encontrado', 404);
  const kind = row.vehicleId ? 'vehicle' : 'machine';
  if (!(await canAccessUnit(kind, (row.vehicleId || row.machineId)!, tenant))) throw new AppError('Mantenimiento no encontrado', 404);
  return row;
}

export class MaintenanceService {
  async list(tenant: TenantContext, query: { unitId?: unknown; state?: unknown }) {
    const companyId = requireCompany(tenant);
    const unit = unitFilter(tenant);
    const unitId = typeof query.unitId === 'string' && query.unitId ? query.unitId : null;
    const rows = await prisma.maintenance.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(query.state === 'inactive' ? { isActive: false } : { isActive: true }),
        AND: [{ OR: [{ vehicle: unit }, { machine: unit }] }, ...(unitId ? [{ OR: [{ vehicleId: unitId }, { machineId: unitId }] }] : [])],
      },
      include: { ...UNIT_SELECT, logs: { orderBy: { doneAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'asc' },
    });
    const withProgress = await Promise.all(rows.map(async (row) => ({ ...row, ...(await progress(row)) })));
    const rank = { DUE: 0, SOON: 1, OK: 2 };
    return withProgress.sort((a, b) => rank[a.status] - rank[b.status]);
  }

  // One reminder per chosen unit, all with the same settings, created
  // together so a bad unit leaves nothing half done.
  async create(data: any, tenant: TenantContext) {
    const companyId = requireCompany(tenant);
    const fields = parseFields(data);
    const raw: unknown[] = Array.isArray(data.units) ? data.units : [];
    if (!raw.length) throw new AppError('Elige al menos una unidad', 400);
    if (raw.length > MAX_UNITS_PER_CREATE) throw new AppError(`Puedes elegir hasta ${MAX_UNITS_PER_CREATE} unidades a la vez`, 400);
    const units = new Map<string, 'vehicle' | 'machine'>();
    for (const item of raw as { kind?: unknown; id?: unknown }[]) {
      const kind = item?.kind === 'machine' ? 'machine' : 'vehicle';
      const id = typeof item?.id === 'string' ? item.id : '';
      if (!id || !(await canAccessUnit(kind, id, tenant))) throw new AppError('Elige solo tus unidades', 400);
      units.set(id, kind);
    }
    const rows = await prisma.$transaction(
      [...units].map(([id, kind]) => prisma.maintenance.create({ data: { ...fields, companyId, ...(kind === 'vehicle' ? { vehicleId: id } : { machineId: id }) } }))
    );
    return { created: rows.length };
  }

  async update(id: string, data: any, tenant: TenantContext) {
    await findInTenant(id, tenant);
    const row = await prisma.maintenance.update({ where: { id }, data: { ...parseFields(data), notifiedStatus: null } });
    return { ...row, ...(await progress(row)) };
  }

  // Marks the service as done: it goes to the history with the km driven
  // since the previous one, and the countdown starts again from that date.
  async complete(id: string, data: any, tenant: TenantContext) {
    const row = await findInTenant(id, tenant);
    const doneAt = parseDate(data.doneAt, 'La fecha');
    const cost = positive(data.cost, 'El costo', 10000000);
    const notes = typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim().slice(0, 500) : null;
    const km = await kmSince(row);
    await prisma.$transaction([
      prisma.maintenanceLog.create({ data: { maintenanceId: id, doneAt, km, cost, notes, doneBy: tenant.name || tenant.email } }),
      prisma.maintenance.update({ where: { id }, data: { lastDoneAt: doneAt, notifiedStatus: null, notifiedAt: null } }),
    ]);
    const updated = await prisma.maintenance.findUniqueOrThrow({ where: { id } });
    return { ...updated, ...(await progress(updated)) };
  }

  async history(id: string, tenant: TenantContext) {
    await findInTenant(id, tenant);
    return prisma.maintenanceLog.findMany({ where: { maintenanceId: id }, orderBy: { doneAt: 'desc' }, take: 50 });
  }

  async setActive(id: string, active: unknown, tenant: TenantContext) {
    await findInTenant(id, tenant);
    if (typeof active !== 'boolean') throw new AppError('Indica si el mantenimiento queda activo', 400);
    return prisma.maintenance.update({ where: { id }, data: { isActive: active, notifiedStatus: null } });
  }

  async remove(id: string, tenant: TenantContext) {
    const row = await findInTenant(id, tenant);
    if (row.isActive) throw new AppError('Desactiva el mantenimiento antes de borrarlo', 409);
    await prisma.maintenance.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Mantenimiento borrado' };
  }
}

// Every hour: maintenance that is coming up or overdue sends one alert when
// it changes state, and overdue ones remind again every 3 days.
async function checkMaintenance() {
  const rows = await prisma.maintenance.findMany({ where: { isActive: true, deletedAt: null }, include: UNIT_SELECT });
  for (const row of rows) {
    const unit = row.vehicle || row.machine;
    if (!unit) continue;
    const { status, kmLeft, daysLeft } = await progress(row);
    if (status === 'OK') {
      if (row.notifiedStatus) await prisma.maintenance.update({ where: { id: row.id }, data: { notifiedStatus: null, notifiedAt: null } });
      continue;
    }
    const repeat = status === 'DUE' && row.notifiedAt && Date.now() - row.notifiedAt.getTime() > REMIND_DUE_EVERY_MS;
    if (row.notifiedStatus === status && !repeat) continue;
    const left = [kmLeft !== null ? `${Math.max(kmLeft, 0)} km` : null, daysLeft !== null ? `${Math.max(daysLeft, 0)} días` : null].filter(Boolean).join(' o ');
    await dispatchAlert({
      companyId: row.companyId,
      type: 'MAINTENANCE',
      title: status === 'DUE' ? `${unit.name}: ${row.title} vencido` : `${unit.name}: ${row.title} pronto`,
      body: status === 'DUE' ? `Ya toca ${row.title.toLowerCase()}. Márcalo como hecho cuando lo realices.` : `Faltan ${left} para ${row.title.toLowerCase()}.`,
      url: '/maintenance',
      unit: row.vehicleId ? { kind: 'vehicle', id: row.vehicleId } : { kind: 'machine', id: row.machineId! },
    });
    await prisma.maintenance.update({ where: { id: row.id }, data: { notifiedStatus: status, notifiedAt: new Date() } });
  }
}

export function startMaintenanceWatch() {
  const run = () => checkMaintenance().catch((err) => console.error('[MANTENIMIENTO]', err));
  setTimeout(run, 30 * 1000);
  setInterval(run, WATCH_EVERY_MS);
}
