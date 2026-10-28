import { Router } from 'express';
import {
  solicitarCambioTurno,
  getCambiosTurno,
  getDestinatariosCambioTurno,
  responderCambioTurno,
} from '../controllers/cambioTurno.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

// Todas las rutas de cambio de turno requieren autenticación JWT
router.use(authMiddleware);

router.get('/', getCambiosTurno);
router.get('/destinatarios', requireRole(ROLES.MINISTRO), getDestinatariosCambioTurno);
router.post('/', solicitarCambioTurno);
router.put('/:id/responder', responderCambioTurno);

export default router;
