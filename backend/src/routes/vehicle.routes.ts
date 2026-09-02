import { Router } from 'express';
import { getVehicles, getVehicleById, updateVehicleStatus, createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicle.controller';

const router = Router();
router.get('/', getVehicles);
router.post('/', createVehicle);
router.get('/:id', getVehicleById);
router.put('/:id', updateVehicle);
router.patch('/:id/status', updateVehicleStatus);
router.delete('/:id', deleteVehicle);

export default router;
