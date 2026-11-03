import { Router } from 'express';
import { adminRequired } from '../middleware/auth';
import { getGeofences, getGeofenceById, createGeofence, updateGeofence, deleteGeofence, getGeofenceEvents } from '../controllers/geofence.controller';

const router = Router();
router.get('/', getGeofences);
router.get('/events', getGeofenceEvents);
router.get('/:id', getGeofenceById);
router.post('/', adminRequired, createGeofence);
router.put('/:id', adminRequired, updateGeofence);
router.delete('/:id', adminRequired, deleteGeofence);

export default router;
