import { Router } from 'express';
import { getUsers, createUser, updateUser, setUserActive, deleteUser } from '../controllers/user.controller';

const router = Router();
router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/active', setUserActive);
router.delete('/:id', deleteUser);

export default router;
