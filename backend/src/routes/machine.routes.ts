import { Router } from 'express';
import { adminRequired, permissionRequired } from '../middleware/auth';
import { getMachines, getMachineById, setMachineActive, deleteMachine } from '../controllers/machine.controller';

const router = Router();
router.get('/', getMachines);
router.get('/:id', permissionRequired('fleet'), getMachineById);
router.patch('/:id/active', adminRequired, setMachineActive);
router.delete('/:id', adminRequired, deleteMachine);

export default router;
