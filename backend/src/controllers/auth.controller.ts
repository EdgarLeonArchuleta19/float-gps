import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { getTenant } from '../middleware/auth';
import { getClientIp } from '../services/audit.service';

const authService = new AuthService();

function loginContext(req: Request) {
  return { ip: getClientIp(req), userAgent: req.headers['user-agent'] || null };
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  const result = await authService.login(email, password, loginContext(req));
  res.json(result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json(await authService.me(getTenant(req)));
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body || {};
  const result = await authService.forgotPassword(email, loginContext(req));
  res.json(result);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body || {};
  const result = await authService.resetPassword(email, code, newPassword);
  res.json(result);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body || {};
  const tenant = getTenant(req);
  if (tenant.support) throw new AppError('Cambia tu contraseña desde la consola de floaGPS.', 403);
  const result = await authService.changePassword(tenant.userId, currentPassword, newPassword);
  res.json(result);
});
