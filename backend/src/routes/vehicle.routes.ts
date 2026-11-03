import { Router } from 'express';
import { adminRequired } from '../middleware/auth';
import { getVehicles, getVehicleById, updateVehicleStatus, createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicle.controller';

const router = Router();
router.get('/', getVehicles);
router.post('/', adminRequired, createVehicle);
router.get('/:id', getVehicleById);
router.put('/:id', adminRequired, updateVehicle);
router.patch('/:id/status', adminRequired, updateVehicleStatus);
router.delete('/:id', adminRequired, deleteVehicle);

export default router;
