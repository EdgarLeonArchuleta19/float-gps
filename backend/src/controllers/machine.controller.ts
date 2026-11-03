import { Request, Response } from 'express';
import { MachineService } from '../services/machine.service';
import { asyncHandler } from '../middleware/errorHandler';
import { getTenant } from '../middleware/auth';

const machineService = new MachineService();

export const getMachines = asyncHandler(async (req: Request, res: Response) => {
  const result = await machineService.findAll(req.query as any, getTenant(req));
  res.json(result);
});

export const getMachineById = asyncHandler(async (req: Request, res: Response) => {
  const machine = await machineService.findById(req.params.id, getTenant(req));
  if (!machine) return res.status(404).json({ message: 'Machine not found' });
  res.json(machine);
});
