import { Request, Response } from 'express';
import { MachineService } from '../services/machine.service';
import { asyncHandler } from '../middleware/errorHandler';

const machineService = new MachineService();

export const getMachines = asyncHandler(async (req: Request, res: Response) => {
  const result = await machineService.findAll(req.query as any);
  res.json(result);
});

export const getMachineById = asyncHandler(async (req: Request, res: Response) => {
  const machine = await machineService.findById(req.params.id);
  if (!machine) return res.status(404).json({ message: 'Machine not found' });
  res.json(machine);
});
