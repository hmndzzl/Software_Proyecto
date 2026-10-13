import { Router } from 'express';
import { listarCuentas, aprobarCuenta, rechazarCuenta } from '../controllers/cuenta.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

// Solo Sacerdote y Admin gestionan la aprobación de cuentas
router.use(authMiddleware, requireRole(ROLES.SACERDOTE, ROLES.ADMIN));

router.get('/', listarCuentas);
router.patch('/:id/aprobar', aprobarCuenta);
router.patch('/:id/rechazar', rechazarCuenta);

export default router;
