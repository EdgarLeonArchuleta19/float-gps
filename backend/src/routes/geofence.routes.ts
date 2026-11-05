import { Router } from 'express';
import { adminRequired, permissionRequired } from '../middleware/auth';
import { getGeofences, getGeofenceById, createGeofence, updateGeofence, setGeofenceActive, deleteGeofence, getGeofenceEvents } from '../controllers/geofence.controller';

const router = Router();
router.use(permissionRequired('geofences'));
router.get('/', getGeofences);
router.get('/events', getGeofenceEvents);
router.get('/:id', getGeofenceById);
router.post('/', adminRequired, createGeofence);
router.put('/:id', adminRequired, updateGeofence);
router.patch('/:id/active', adminRequired, setGeofenceActive);
router.delete('/:id', adminRequired, deleteGeofence);

export default router;
