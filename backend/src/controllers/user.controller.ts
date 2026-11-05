import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { asyncHandler } from '../middleware/errorHandler';
import { getTenant } from '../middleware/auth';

const userService = new UserService();

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  res.json(await userService.findAll(getTenant(req)));
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await userService.create(req.body || {}, getTenant(req)));
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  res.json(await userService.update(req.params.id, req.body || {}, getTenant(req)));
});

export const setUserActive = asyncHandler(async (req: Request, res: Response) => {
  res.json(await userService.setActive(req.params.id, req.body?.active, getTenant(req)));
});

export const resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
  res.json(await userService.resetPassword(req.params.id, getTenant(req)));
});

export const deleteUser =asyncHandler(async (req: Request, res: Response) => {
  res.json(await userService.remove(req.params.id, getTenant(req)));
});
