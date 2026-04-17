import { Router } from 'express';
import { login, register } from '../controllers/auth.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

router.post('/login', login);

// Solo Sacerdote y Admin pueden registrar nuevos usuarios
router.post('/register', authMiddleware, requireRole(ROLES.SACERDOTE, ROLES.ADMIN), register);

export default router;
