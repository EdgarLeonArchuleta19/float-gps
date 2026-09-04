import { Router } from 'express';
import { login, changePassword } from '../controllers/auth.controller';
import { authRequired } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/change-password', authRequired, changePassword);

export default router;