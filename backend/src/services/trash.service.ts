import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { nameKey } from '../utils/nameKey';

const prisma = new PrismaClient();

export const TRASH_TYPES = ['company', 'user', 'vehicle', 'machine', 'geofence', 'role', 'gps', 'group', 'maintenance'] as const;
export type TrashType = (typeof TRASH_TYPES)[number];

export interface TrashItem {
  type: TrashType;
  id: string;
  label: string;
  detail: string | null;
  companyName: string | null;
  deletedAt: Date;
}

const DELETED = { deletedAt: { not: null } };
const LIMIT = 300;
const company = { select: { name: true } };

// Everything deleted from the app stays in the database; this lists it for
// the owner console so support can bring it back.
export class TrashService {
  async list(): Promise<TrashItem[]> {
    const [companies, users, vehicles, machines, geofences, roles, gps, groups, maintenances] = await Promise.all([
      prisma.company.findMany({ where: DELETED, take: LIMIT, select: { id: true, name: true, slug: true, deletedAt: true } }),
      prisma.user.findMany({ where: { ...DELETED, companyId: { not: null } }, take: LIMIT, select: { id: true, name: true, email: true, deletedAt: true, company } }),
      prisma.vehicle.findMany({ where: DELETED, take: LIMIT, select: { id: true, name: true, plate: true, deletedAt: true, company } }),
      prisma.machine.findMany({ where: DELETED, take: LIMIT, select: { id: true, name: true, serialNumber: true, deletedAt: true, company } }),
      prisma.geofence.findMany({ where: DELETED, take: LIMIT, select: { id: true, name: true, type: true, deletedAt: true, company } }),
      prisma.role.findMany({ where: DELETED, take: LIMIT, select: { id: true, name: true, deletedAt: true, company } }),
      prisma.gpsDevice.findMany({ where: DELETED, take: LIMIT, select: { id: true, imei: true, model: true, deletedAt: true, company } }),
      prisma.unitGroup.findMany({ where: DELETED, take: LIMIT, select: { id: true, name: true, deletedAt: true, company } }),
      prisma.maintenance.findMany({ where: DELETED, take: LIMIT, select: { id: true, title: true, deletedAt: true, company, vehicle: { select: { name: true } }, machine: { select: { name: true } } } }),
    ]);
    const items: TrashItem[] = [
      ...companies.map((c) => ({ type: 'company' as const, id: c.id, label: c.name, detail: c.slug, companyName: null, deletedAt: c.deletedAt! })),
      ...users.map((u) => ({ type: 'user' as const, id: u.id, label: u.name, detail: u.email, companyName: u.company?.name || null, deletedAt: u.deletedAt! })),
      ...vehicles.map((v) => ({ type: 'vehicle' as const, id: v.id, label: v.name, detail: v.plate, companyName: v.company?.name || null, deletedAt: v.deletedAt! })),
      ...machines.map((m) => ({ type: 'machine' as const, id: m.id, label: m.name, detail: m.serialNumber, companyName: m.company?.name || null, deletedAt: m.deletedAt! })),
      ...geofences.map((g) => ({ type: 'geofence' as const, id: g.id, label: g.name, detail: g.type, companyName: g.company?.name || null, deletedAt: g.deletedAt! })),
      ...roles.map((r) => ({ type: 'role' as const, id: r.id, label: r.name, detail: null, companyName: r.company?.name || null, deletedAt: r.deletedAt! })),
      ...gps.map((d) => ({ type: 'gps' as const, id: d.id, label: d.imei, detail: d.model, companyName: d.company?.name || null, deletedAt: d.deletedAt! })),
      ...groups.map((g) => ({ type: 'group' as const, id: g.id, label: g.name, detail: null, companyName: g.company?.name || null, deletedAt: g.deletedAt! })),
      ...maintenances.map((m) => ({ type: 'maintenance' as const, id: m.id, label: m.title, detail: m.vehicle?.name || m.machine?.name || null, companyName: m.company?.name || null, deletedAt: m.deletedAt! })),
    ];
    return items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
  }

  // Restored records come back deactivated so the company admin decides when
  // they are used again (GPS devices return to the active inventory).
  async restore(type: string, id: string) {
    const notFound = new AppError('Registro no encontrado en Eliminados', 404);
    switch (type) {
      case 'company': {
        const row = await prisma.company.findUnique({ where: { id }, select: { deletedAt: true } });
        if (!row?.deletedAt) throw notFound;
        await prisma.company.update({ where: { id }, data: { deletedAt: null, isActive: false } });
        return { message: 'Empresa restaurada (queda suspendida hasta que la reactives)' };
      }
      case 'user': {
        const row = await prisma.user.findUnique({ where: { id }, select: { deletedAt: true, companyId: true, company: { select: { deletedAt: true } } } });
        if (!row?.deletedAt || !row.companyId) throw notFound;
        if (row.company?.deletedAt) throw new AppError('Restaura primero la empresa de este usuario', 409);
        await prisma.user.update({ where: { id }, data: { deletedAt: null, isActive: false } });
        return { message: 'Usuario restaurado (queda desactivado)' };
      }
      case 'vehicle': {
        const row = await prisma.vehicle.findUnique({ where: { id }, select: { deletedAt: true } });
        if (!row?.deletedAt) throw notFound;
        await prisma.vehicle.update({ where: { id }, data: { deletedAt: null, isActive: false } });
        return { message: 'Unidad restaurada (queda desactivada)' };
      }
      case 'machine': {
        const row = await prisma.machine.findUnique({ where: { id }, select: { deletedAt: true } });
        if (!row?.deletedAt) throw notFound;
        await prisma.machine.update({ where: { id }, data: { deletedAt: null, isActive: false } });
        return { message: 'Maquinaria restaurada (queda desactivada)' };
      }
      case 'geofence': {
        const row = await prisma.geofence.findUnique({ where: { id }, select: { deletedAt: true } });
        if (!row?.deletedAt) throw notFound;
        await prisma.geofence.update({ where: { id }, data: { deletedAt: null, isActive: false } });
        return { message: 'Geocerca restaurada (queda desactivada)' };
      }
      case 'role': {
        const row = await prisma.role.findUnique({ where: { id }, select: { deletedAt: true, name: true, companyId: true } });
        if (!row?.deletedAt) throw notFound;
        const key = nameKey(row.name);
        const clash = await prisma.role.findUnique({ where: { companyId_nameKey: { companyId: row.companyId, nameKey: key } }, select: { id: true } });
        if (clash) throw new AppError(`La empresa ya tiene otro rol llamado "${row.name}". Renómbralo antes de restaurar este.`, 409);
        await prisma.role.update({ where: { id }, data: { deletedAt: null, isActive: false, nameKey: key } });
        return { message: 'Rol restaurado (queda desactivado)' };
      }
      case 'gps': {
        const row = await prisma.gpsDevice.findUnique({ where: { id }, select: { deletedAt: true } });
        if (!row?.deletedAt) throw notFound;
        await prisma.gpsDevice.update({ where: { id }, data: { deletedAt: null, isActive: true } });
        return { message: 'GPS restaurado al inventario' };
      }
      case 'group': {
        const row = await prisma.unitGroup.findUnique({ where: { id }, select: { deletedAt: true, name: true, companyId: true } });
        if (!row?.deletedAt) throw notFound;
        const key = nameKey(row.name);
        const clash = await prisma.unitGroup.findUnique({ where: { companyId_nameKey: { companyId: row.companyId, nameKey: key } }, select: { id: true } });
        if (clash) throw new AppError(`La empresa ya tiene otro grupo llamado "${row.name}". Renómbralo antes de restaurar este.`, 409);
        await prisma.unitGroup.update({ where: { id }, data: { deletedAt: null, isActive: false, nameKey: key } });
        return { message: 'Grupo restaurado (queda desactivado y sin unidades)' };
      }
      case 'maintenance': {
        const row = await prisma.maintenance.findUnique({ where: { id }, select: { deletedAt: true } });
        if (!row?.deletedAt) throw notFound;
        await prisma.maintenance.update({ where: { id }, data: { deletedAt: null, isActive: false } });
        return { message: 'Mantenimiento restaurado (queda desactivado)' };
      }
      default:
        throw new AppError('Tipo de registro no válido', 400);
    }
  }
}
