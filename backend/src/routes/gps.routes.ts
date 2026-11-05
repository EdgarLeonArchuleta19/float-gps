import { Router } from 'express';
import { getPositions, getTracking, getLatestPosition } from '../controllers/gps.controller';

const router = Router();
router.get('/:id/positions', getPositions);
router.get('/:id/tracking', getTracking);
router.get('/:id/latest', getLatestPosition);

export default router;
