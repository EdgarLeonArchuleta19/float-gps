import { Router } from 'express';
import { login, me, ownerLogin, forgotPassword, resetPassword, changePassword } from '../controllers/auth.controller';
import { authRequired } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/owner-login', ownerLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authRequired, changePassword);
router.get('/me', authRequired, me);

export default router;
