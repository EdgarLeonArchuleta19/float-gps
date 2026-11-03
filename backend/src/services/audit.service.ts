import { Prisma, PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export interface AuditEntry {
  actorId?: string | null;
  actorEmail: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  success?: boolean;
  details?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

const SENSITIVE_KEYS = ['password', 'newPassword', 'currentPassword', 'masterKey', 'token'];

export function sanitizeDetails(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    clean[key] = SENSITIVE_KEYS.includes(key) ? '[oculto]' : value;
  }
  return clean;
}

export function getClientIp(req: Request): string {
  return (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
}

export async function writeAudit(entry: AuditEntry) {
  try {
    await prisma.ownerAuditLog.create({
      data: {
        actorId: entry.actorId || null,
        actorEmail: entry.actorEmail,
        action: entry.action,
        targetType: entry.targetType || null,
        targetId: entry.targetId || null,
        success: entry.success ?? true,
        details: (entry.details as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ip: entry.ip || null,
        userAgent: entry.userAgent ? entry.userAgent.slice(0, 300) : null,
      },
    });
  } catch (err) {
    console.error('[AUDIT] No se pudo registrar la acción:', err);
  }
}

export async function listAudit(limit = 100, action?: string) {
  const take = Math.min(Math.max(limit, 1), 500);
  return prisma.ownerAuditLog.findMany({
    where: action ? { action } : undefined,
    orderBy: { createdAt: 'desc' },
    take,
  });
}
