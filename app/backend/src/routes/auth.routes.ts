import { Router } from 'express';
import { login, register } from '../controllers/auth.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', login);

// Solo Sacerdote (rol_id=1) puede registrar nuevos usuarios
router.post('/register', authMiddleware, requireRole(1), register);

export default router;
