import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from '../middleware/auth';
import { DEFAULT_SCHEDULE, parseSchedule, WorkSchedule } from '../utils/workSchedule';

const prisma = new PrismaClient();

export class CompanyService {
  async getSchedule(tenant?: TenantContext): Promise<WorkSchedule> {
    if (!tenant?.companyId) return DEFAULT_SCHEDULE;
    const company = await prisma.company.findUnique({
      where: { id: tenant.companyId },
      select: { workStartHour: true, workEndHour: true, workDays: true },
    });
    return parseSchedule(company);
  }

  async updateSchedule(data: { startHour?: unknown; endHour?: unknown; days?: unknown }, tenant?: TenantContext): Promise<WorkSchedule> {
    if (!tenant?.companyId) throw new AppError('Tu cuenta no pertenece a una empresa', 400);
    const startHour = Number(data.startHour);
    const endHour = Number(data.endHour);
    const days = Array.isArray(data.days) ? [...new Set(data.days.map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [];
    if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 0 || endHour > 24 || startHour >= endHour) {
      throw new AppError('El horario no es válido: la hora de inicio debe ser menor a la de fin', 400);
    }
    if (!days.length) throw new AppError('Selecciona al menos un día laboral', 400);
    const company = await prisma.company.update({
      where: { id: tenant.companyId },
      data: { workStartHour: startHour, workEndHour: endHour, workDays: days.sort().join(',') },
      select: { workStartHour: true, workEndHour: true, workDays: true },
    });
    return parseSchedule(company);
  }
}
