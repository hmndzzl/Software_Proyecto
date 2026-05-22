import { Router } from 'express';
import {
  getNotificaciones,
  marcarLeida,
  createNotificacion,
  deleteNotificacion,
} from '../controllers/notificacion.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

router.use(authMiddleware);

// /:id/leida antes de /:id para que Express no confunda "leida" con un id numérico
router.get('/', getNotificaciones);
router.put('/:id/leida', marcarLeida);
router.post('/', requireRole(ROLES.SACERDOTE, ROLES.ADMIN), createNotificacion);
router.delete('/:id', requireRole(ROLES.SACERDOTE, ROLES.ADMIN), deleteNotificacion);

export default router;
