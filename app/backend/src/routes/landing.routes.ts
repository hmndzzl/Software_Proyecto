import { Router } from 'express';
import { getContenidoLanding, actualizarContenidoLanding } from '../controllers/landing.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();
router.use(authMiddleware, requireRole(ROLES.ADMIN, ROLES.SACERDOTE));
router.get('/', getContenidoLanding);
router.patch('/', actualizarContenidoLanding);

export default router;
