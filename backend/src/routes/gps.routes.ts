import { Router } from 'express';
import { getPositions, getTracking, getLatestPosition, listDevices, linkDevice, unlinkDevice, testConnection } from '../controllers/gps.controller';

const router = Router();
router.get('/', listDevices);
router.post('/test', testConnection);
router.post('/:id/link', linkDevice);
router.post('/:id/unlink', unlinkDevice);
router.get('/:id/positions', getPositions);
router.get('/:id/tracking', getTracking);
router.get('/:id/latest', getLatestPosition);

export default router;
