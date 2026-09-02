import { Request, Response } from 'express';
import { VehicleService } from '../services/vehicle.service';
import { asyncHandler } from '../middleware/errorHandler';

const vehicleService = new VehicleService();

export const getVehicles = asyncHandler(async (req: Request, res: Response) => {
  const result = await vehicleService.findAll(req.query as any);
  res.json(result);
});

export const getVehicleById = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await vehicleService.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
  res.json(vehicle);
});

export const updateVehicleStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const vehicle = await vehicleService.updateStatus(req.params.id, status);
  res.json(vehicle);
});

export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await vehicleService.create(req.body);
  res.status(201).json(vehicle);
});

export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await vehicleService.update(req.params.id, req.body);
  res.json(vehicle);
});

export const deleteVehicle = asyncHandler(async (req: Request, res: Response) => {
  await vehicleService.delete(req.params.id);
  res.json({ message: 'Vehicle deleted' });
});
