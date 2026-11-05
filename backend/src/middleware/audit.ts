import { Request, Response, NextFunction } from 'express';
import { getClientIp, sanitizeDetails, writeAudit } from '../services/audit.service';
import type { StaffContext } from './staffAuth';

export function auditStaffAction(action: string, targetType?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      const staff = (req as any).staff as StaffContext | undefined;
      writeAudit({
        actorId: staff?.id,
        actorEmail: staff?.email || 'desconocido',
        actorRole: staff?.role,
        companyId: res.locals.auditCompanyId || (targetType === 'company' ? req.params.id || null : null),
        action,
        targetType: targetType || null,
        targetId: req.params.id || null,
        success: res.statusCode < 400,
        details: { status: res.statusCode, ...(sanitizeDetails(req.body) || {}) },
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || null,
      });
    });
    next();
  };
}
