import { Request, Response } from 'express';
import { GeofenceService } from '../services/geofence.service';
import { asyncHandler } from '../middleware/errorHandler';
import { getTenant } from '../middleware/auth';

const geofenceService = new GeofenceService();

export const getGeofences = asyncHandler(async (req: Request, res: Response) => {
  const geofences = await geofenceService.findAll(getTenant(req));
  res.json(geofences);
});

export const getGeofenceById = asyncHandler(async (req: Request, res: Response) => {
  const geofence = await geofenceService.findById(req.params.id, getTenant(req));
  if (!geofence) return res.status(404).json({ message: 'Geofence not found' });
  res.json(geofence);
});

export const createGeofence = asyncHandler(async (req: Request, res: Response) => {
  const geofence = await geofenceService.create(req.body, getTenant(req));
  res.status(201).json(geofence);
});

export const updateGeofence = asyncHandler(async (req: Request, res: Response) => {
  const geofence = await geofenceService.update(req.params.id, req.body, getTenant(req));
  res.json(geofence);
});

export const setGeofenceActive = asyncHandler(async (req: Request, res: Response) => {
  res.json(await geofenceService.setActive(req.params.id, req.body?.active, getTenant(req)));
});

export const deleteGeofence = asyncHandler(async (req: Request, res: Response) => {
  await geofenceService.delete(req.params.id, getTenant(req));
  res.json({ message: 'Geocerca borrada' });
});

export const getGeofenceEvents = asyncHandler(async (req: Request, res: Response) => {
  const result = await geofenceService.getGeofenceEvents(req.query as any, getTenant(req));
  res.json(result);
});
