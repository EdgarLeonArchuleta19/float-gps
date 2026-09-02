import { Router } from 'express';
import { getUsers, createUser, deleteUser, getUserUnits, updateUserUnits } from '../controllers/user.controller';

const router = Router();
router.get('/', getUsers);
router.post('/', createUser);
router.delete('/:id', deleteUser);
router.get('/:id/units', getUserUnits);
router.put('/:id/units', updateUserUnits);

export default router;
