import { Router } from 'express';
import { adminRequired, ownerTeamRequired, permissionRequired } from '../middleware/auth';
import { getVehicles, getVehicleById, updateVehicleStatus, createVehicle, updateVehicle, updateVehicleAppearance, setVehicleActive, deleteVehicle } from '../controllers/vehicle.controller';

const router = Router();
router.get('/', getVehicles);
router.post('/', ownerTeamRequired, createVehicle);
router.get('/:id', permissionRequired('fleet'), getVehicleById);
router.put('/:id', ownerTeamRequired, updateVehicle);
router.patch('/:id/appearance', adminRequired, updateVehicleAppearance);
router.patch('/:id/status', ownerTeamRequired, updateVehicleStatus);
router.patch('/:id/active', ownerTeamRequired, setVehicleActive);
router.delete('/:id', ownerTeamRequired, deleteVehicle);

export default router;
