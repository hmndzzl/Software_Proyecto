import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';
import { listarCoordinadores, listarMinistrosAsignados, asignarMinistro, quitarMinistro } from '../controllers/coordinadorMinistro.controller';

const router = Router();
router.use(authMiddleware, requireRole(ROLES.SACERDOTE, ROLES.ADMIN));
router.get('/', listarCoordinadores);
router.get('/:coordinadorId/ministros', listarMinistrosAsignados);
router.put('/:coordinadorId/ministros/:ministroId', asignarMinistro);
router.delete('/:coordinadorId/ministros/:ministroId', quitarMinistro);
export default router;
