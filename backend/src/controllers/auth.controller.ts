import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../middleware/errorHandler';
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

export const ownerLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, masterKey } = req.body || {};
  const result = await authService.ownerLogin(email, password, masterKey, loginContext(req));
  res.json(result);
});

export const ownerLogoutAll = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await authService.ownerLogoutAll(user.userId, user.email, loginContext(req));
  res.json(result);
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
  const userId = (req as any).user?.userId;
  const result = await authService.changePassword(userId, currentPassword, newPassword);
  res.json(result);
});
