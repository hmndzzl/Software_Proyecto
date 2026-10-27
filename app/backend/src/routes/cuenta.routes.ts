import { Router } from 'express';
import { listarCuentas, aprobarCuenta, rechazarCuenta, darDeBajaCuenta } from '../controllers/cuenta.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';
import { decisionesCuenta } from '../controllers/decisiones.controller';

const router = Router();

// Solo Sacerdote y Admin gestionan la aprobación de cuentas
router.use(authMiddleware, requireRole(ROLES.SACERDOTE, ROLES.ADMIN));

router.get('/', listarCuentas);
router.get('/:id/decisiones', decisionesCuenta);
router.patch('/:id/aprobar', aprobarCuenta);
router.patch('/:id/rechazar', rechazarCuenta);
router.patch('/:id/baja', darDeBajaCuenta);

export default router;
