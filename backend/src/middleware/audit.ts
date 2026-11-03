import { Request, Response, NextFunction } from 'express';
import { getClientIp, sanitizeDetails, writeAudit } from '../services/audit.service';

export function auditOwnerAction(action: string, targetType?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      const user = (req as any).user;
      writeAudit({
        actorId: user?.userId,
        actorEmail: user?.email || 'desconocido',
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
