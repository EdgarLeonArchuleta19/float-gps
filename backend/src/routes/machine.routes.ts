import { Router } from 'express';
import { ownerTeamRequired, permissionRequired } from '../middleware/auth';
import { getMachines, getMachineById, setMachineActive, deleteMachine } from '../controllers/machine.controller';

const router = Router();
router.get('/', getMachines);
router.get('/:id', permissionRequired('fleet'), getMachineById);
router.patch('/:id/active', ownerTeamRequired, setMachineActive);
router.delete('/:id', ownerTeamRequired, deleteMachine);

export default router;
