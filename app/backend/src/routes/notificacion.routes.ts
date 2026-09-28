import { Router } from 'express';
import {
  getNotificaciones,
  getNotificacionesEnviadas,
  getDestinatarios,
  marcarLeida,
  marcarNoLeida,
  confirmarAsistenciaNotificacion,
  confirmarAsistencia,
  excusarAsistencia,
  reportarInasistencia,
  createNotificacion,
  deleteNotificacion,
  moverAPapelera,
  restaurarNotificacion,
  getPapelera,
  vaciarPapelera,
} from '../controllers/notificacion.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

router.use(authMiddleware);

// /destinatarios, /enviadas y /papelera antes de /:id para que Express no las confunda con un id
router.get('/destinatarios', requireRole(ROLES.SACERDOTE, ROLES.ADMIN, ROLES.COORDINADOR_MINISTROS), getDestinatarios);
router.get('/enviadas', requireRole(ROLES.SACERDOTE, ROLES.ADMIN, ROLES.COORDINADOR_MINISTROS), getNotificacionesEnviadas);
router.get('/papelera', getPapelera);
router.delete('/papelera', vaciarPapelera);
router.get('/', getNotificaciones);
router.put('/:id/leida', marcarLeida);
router.put('/:id/no-leida', marcarNoLeida);
router.put('/:id/papelera', moverAPapelera);
router.put('/:id/restaurar', restaurarNotificacion);
router.put('/:id/confirmar', confirmarAsistenciaNotificacion);
router.put('/:id/asistencia', confirmarAsistencia);
router.put('/:id/excusar', excusarAsistencia);
router.put('/:id/no-asistir', reportarInasistencia);
router.post('/', requireRole(ROLES.SACERDOTE, ROLES.ADMIN, ROLES.COORDINADOR_MINISTROS), createNotificacion);
router.delete('/:id', requireRole(ROLES.SACERDOTE, ROLES.ADMIN), deleteNotificacion);

export default router;
