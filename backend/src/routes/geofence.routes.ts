import { Router } from 'express';
import { adminRequired, permissionRequired, planRequired } from '../middleware/auth';
import { getGeofences, getGeofenceById, createGeofence, updateGeofence, setGeofenceActive, deleteGeofence, getGeofenceEvents } from '../controllers/geofence.controller';

const router = Router();
router.use(permissionRequired('geofences'));
router.get('/', getGeofences);
router.get('/events', getGeofenceEvents);
router.get('/:id', getGeofenceById);
router.post('/', adminRequired, planRequired('EMPRESA'), createGeofence);
router.put('/:id', adminRequired, planRequired('EMPRESA'), updateGeofence);
router.patch('/:id/active', adminRequired, planRequired('EMPRESA'), setGeofenceActive);
router.delete('/:id', adminRequired, planRequired('EMPRESA'), deleteGeofence);

export default router;
