import { Router } from 'express';
import { getGeofences, getGeofenceById, createGeofence, updateGeofence, deleteGeofence, getGeofenceEvents } from '../controllers/geofence.controller';

const router = Router();
router.get('/', getGeofences);
router.get('/events', getGeofenceEvents);
router.get('/:id', getGeofenceById);
router.post('/', createGeofence);
router.put('/:id', updateGeofence);
router.delete('/:id', deleteGeofence);

export default router;
