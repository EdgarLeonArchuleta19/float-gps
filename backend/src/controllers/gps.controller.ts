import { Request, Response } from 'express';
import { GpsService } from '../services/gps.service';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { getTenant } from '../middleware/auth';
import { canAccessGpsDevice } from '../services/unitAccess';

const gpsService = new GpsService();

// Foreign and missing devices answer the same 404 so ids can't be probed.
async function assertDeviceAccess(req: Request) {
  if (!(await canAccessGpsDevice(req.params.id, getTenant(req)))) {
    throw new AppError('Dispositivo GPS no encontrado', 404);
  }
}

export const getPositions = asyncHandler(async (req: Request, res: Response) => {
  await assertDeviceAccess(req);
  res.json(await gpsService.getPositions(req.params.id, req.query as any));
});

export const getTracking = asyncHandler(async (req: Request, res: Response) => {
  await assertDeviceAccess(req);
  res.json(await gpsService.getTracking(req.params.id, req.query as any));
});

export const getLatestPosition = asyncHandler(async (req: Request, res: Response) => {
  await assertDeviceAccess(req);
  res.json(await gpsService.getLatestPosition(req.params.id));
});
