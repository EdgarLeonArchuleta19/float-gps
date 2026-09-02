import { Request, Response } from 'express';
import { GeofenceService } from '../services/geofence.service';
import { asyncHandler } from '../middleware/errorHandler';

const geofenceService = new GeofenceService();

export const getGeofences = asyncHandler(async (req: Request, res: Response) => {
  const geofences = await geofenceService.findAll();
  res.json(geofences);
});

export const getGeofenceById = asyncHandler(async (req: Request, res: Response) => {
  const geofence = await geofenceService.findById(req.params.id);
  if (!geofence) return res.status(404).json({ message: 'Geofence not found' });
  res.json(geofence);
});

export const createGeofence = asyncHandler(async (req: Request, res: Response) => {
  const geofence = await geofenceService.create(req.body);
  res.status(201).json(geofence);
});

export const updateGeofence = asyncHandler(async (req: Request, res: Response) => {
  const geofence = await geofenceService.update(req.params.id, req.body);
  res.json(geofence);
});

export const deleteGeofence = asyncHandler(async (req: Request, res: Response) => {
  await geofenceService.delete(req.params.id);
  res.json({ message: 'Geofence deleted' });
});

export const getGeofenceEvents = asyncHandler(async (req: Request, res: Response) => {
  const result = await geofenceService.getGeofenceEvents(req.query as any);
  res.json(result);
});
