import { Router } from 'express';
import {
  getNotificaciones,
  getDestinatarios,
  marcarLeida,
  confirmarAsistenciaNotificacion,
  confirmarAsistencia,
  excusarAsistencia,
  reportarInasistencia,
  createNotificacion,
  deleteNotificacion,
} from '../controllers/notificacion.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

router.use(authMiddleware);

// /destinatarios antes de /:id para que Express no confunda "destinatarios" con un id
router.get('/destinatarios', requireRole(ROLES.SACERDOTE, ROLES.ADMIN, ROLES.COORDINADOR_MINISTROS), getDestinatarios);
router.get('/', getNotificaciones);
router.put('/:id/leida', marcarLeida);
router.put('/:id/confirmar', confirmarAsistenciaNotificacion);
router.put('/:id/asistencia', confirmarAsistencia);
router.put('/:id/excusar', excusarAsistencia);
router.put('/:id/no-asistir', reportarInasistencia);
router.post('/', requireRole(ROLES.SACERDOTE, ROLES.ADMIN, ROLES.COORDINADOR_MINISTROS), createNotificacion);
router.delete('/:id', requireRole(ROLES.SACERDOTE, ROLES.ADMIN), deleteNotificacion);

export default router;
