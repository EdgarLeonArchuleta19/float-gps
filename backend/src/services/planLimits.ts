import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import type { TenantContext } from '../middleware/auth';
import { PERSONAL_LIMITS } from '../utils/plans';

const prisma = new PrismaClient();

// Deactivated records still count: they can be reactivated at any moment.
export async function assertUnitCapacity(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { maxUnits: true } });
  if (!company) throw new AppError('Empresa no encontrada', 404);
  const [vehicles, machines] = await Promise.all([
    prisma.vehicle.count({ where: { companyId, deletedAt: null } }),
    prisma.machine.count({ where: { companyId, deletedAt: null } }),
  ]);
  if (vehicles + machines >= company.maxUnits) {
    throw new AppError(`Tu plan permite hasta ${company.maxUnits} unidades. Contáctanos para agregar más.`, 403);
  }
}

export async function assertUserCapacity(tenant: TenantContext, companyId: string) {
  if (tenant.plan !== 'PERSONAL') return;
  const users = await prisma.user.count({ where: { companyId, deletedAt: null } });
  if (users >= PERSONAL_LIMITS.users) {
    throw new AppError('El plan Personal es de una sola cuenta. Cámbiate al plan Empresarial para agregar usuarios.', 403);
  }
}
