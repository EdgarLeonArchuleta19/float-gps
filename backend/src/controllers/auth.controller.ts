import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../middleware/errorHandler';

const authService = new AuthService();

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  const result = await authService.login(email, password);
  res.json(result);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body || {};
  const userId = (req as any).user?.userId;
  const result = await authService.changePassword(userId, currentPassword, newPassword);
  res.json(result);
});