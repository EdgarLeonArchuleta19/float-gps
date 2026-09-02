import { Router } from 'express';
import { getMachines, getMachineById } from '../controllers/machine.controller';

const router = Router();
router.get('/', getMachines);
router.get('/:id', getMachineById);

export default router;
