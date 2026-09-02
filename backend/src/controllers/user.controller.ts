import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { asyncHandler } from '../middleware/errorHandler';

const userService = new UserService();

export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await userService.findAll();
  res.json(users);
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.create(req.body);
  res.status(201).json(user);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.remove(req.params.id);
  res.json(result);
});

export const getUserUnits = asyncHandler(async (req: Request, res: Response) => {
  const units = await userService.getUserUnits(req.params.id);
  res.json(units);
});

export const updateUserUnits = asyncHandler(async (req: Request, res: Response) => {
  const vehicleIds: string[] = Array.isArray(req.body?.vehicleIds) ? req.body.vehicleIds : [];
  const machineIds: string[] = Array.isArray(req.body?.machineIds) ? req.body.machineIds : [];
  const units = await userService.updateUnits(req.params.id, vehicleIds, machineIds);
  res.json(units);
});
