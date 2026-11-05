import { Router } from 'express';
import { adminRequired, permissionRequired } from '../middleware/auth';
import { getVehicles, getVehicleById, updateVehicleStatus, createVehicle, updateVehicle, setVehicleActive, deleteVehicle } from '../controllers/vehicle.controller';

const router = Router();
router.get('/', getVehicles);
router.post('/', adminRequired, createVehicle);
router.get('/:id', permissionRequired('fleet'), getVehicleById);
router.put('/:id', adminRequired, updateVehicle);
router.patch('/:id/status', adminRequired, updateVehicleStatus);
router.patch('/:id/active', adminRequired, setVehicleActive);
router.delete('/:id', adminRequired, deleteVehicle);

export default router;
