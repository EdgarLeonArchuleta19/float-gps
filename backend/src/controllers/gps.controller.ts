import { Request, Response } from 'express';
import { GpsService } from '../services/gps.service';
import { asyncHandler } from '../middleware/errorHandler';

const gpsService = new GpsService();

export const getPositions = asyncHandler(async (req: Request, res: Response) => {
  const positions = await gpsService.getPositions(req.params.id, req.query as any);
  res.json(positions);
});

export const getTracking = asyncHandler(async (req: Request, res: Response) => {
  const tracking = await gpsService.getTracking(req.params.id, req.query as any);
  res.json(tracking);
});

export const getLatestPosition = asyncHandler(async (req: Request, res: Response) => {
  const position = await gpsService.getLatestPosition(req.params.id);
  res.json(position);
});

export const listDevices = asyncHandler(async (req: Request, res: Response) => {
  const devices = await gpsService.listDevices(req.query as any);
  res.json(devices);
});

export const linkDevice = asyncHandler(async (req: Request, res: Response) => {
  const device = await gpsService.linkDevice(req.params.id, req.body);
  res.json(device);
});

export const unlinkDevice = asyncHandler(async (req: Request, res: Response) => {
  const device = await gpsService.unlinkDevice(req.params.id);
  res.json(device);
});

export const testConnection = asyncHandler(async (req: Request, res: Response) => {
  const result = await gpsService.testConnection(req.body);
  res.json(result);
});
