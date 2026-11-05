import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import type { StaffContext } from '../middleware/staffAuth';
import { config } from '../config';
import { normalizePlan } from '../utils/plans';

const prisma = new PrismaClient();

const REASON_MIN = 5;
const REASON_MAX = 300;

export class SupportSessionService {
  // Opens Support Mode for one company: the team member must say why, and
  // the session closes by itself after SUPPORT_SESSION_MINUTES. Opening a new
  // one ends any other open session of the same member.
  async start(staff: StaffContext, companyId: string, rawReason: unknown, ip: string) {
    const reason = String(rawReason || '').trim();
    if (reason.length < REASON_MIN) throw new AppError('Escribe el motivo de la visita (por ejemplo: "cliente reporta GPS sin señal").', 400);
    if (reason.length > REASON_MAX) throw new AppError(`El motivo debe tener máximo ${REASON_MAX} caracteres.`, 400);
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, plan: true, deletedAt: true },
    });
    if (!company || company.deletedAt) throw new AppError('Empresa no encontrada', 404);

    const now = new Date();
    await prisma.supportSession.updateMany({ where: { staffId: staff.id, endedAt: null }, data: { endedAt: now } });
    const session = await prisma.supportSession.create({
      data: {
        staffId: staff.id,
        companyId,
        reason,
        ip,
        expiresAt: new Date(now.getTime() + config.supportSessionMinutes * 60000),
      },
    });
    return {
      id: session.id,
      reason: session.reason,
      expiresAt: session.expiresAt,
      company: { id: company.id, name: company.name, plan: normalizePlan(company.plan) },
    };
  }

  async end(staff: StaffContext, id: string) {
    const session = await prisma.supportSession.findUnique({ where: { id }, select: { staffId: true, endedAt: true } });
    if (!session || session.staffId !== staff.id) throw new AppError('Sesión de soporte no encontrada', 404);
    if (!session.endedAt) await prisma.supportSession.update({ where: { id }, data: { endedAt: new Date() } });
    return { message: 'Saliste del Modo Soporte' };
  }

  recent(limit = 100) {
    return prisma.supportSession.findMany({
      orderBy: { startedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 300),
      select: {
        id: true,
        reason: true,
        startedAt: true,
        expiresAt: true,
        endedAt: true,
        ip: true,
        staff: { select: { name: true, email: true, role: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }

  // What a company admin sees in Configuración: who from floaGPS entered
  // their account, when, and why.
  forCompany(companyId: string) {
    return prisma.supportSession.findMany({
      where: { companyId },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: { id: true, reason: true, startedAt: true, endedAt: true, expiresAt: true, staff: { select: { name: true } } },
    });
  }
}
