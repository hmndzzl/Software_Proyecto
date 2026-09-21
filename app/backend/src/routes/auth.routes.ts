import { Router } from 'express';
import { login, register, refresh, logout } from '../controllers/auth.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { loginRateLimiter } from '../middlewares/login-rate-limit.middleware';
import { ROLES } from '../config/roles';

const router = Router();

router.post('/login', loginRateLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Solo Sacerdote y Admin pueden registrar nuevos usuarios
router.post('/register', authMiddleware, requireRole(ROLES.SACERDOTE, ROLES.ADMIN), register);

export default router;
