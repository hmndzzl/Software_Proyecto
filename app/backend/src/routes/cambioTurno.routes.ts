import { Router } from 'express';
import {
  solicitarCambioTurno,
  getCambiosTurno,
  responderCambioTurno,
} from '../controllers/cambioTurno.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas de cambio de turno requieren autenticación JWT
router.use(authMiddleware);

router.get('/', getCambiosTurno);
router.post('/', solicitarCambioTurno);
router.put('/:id/responder', responderCambioTurno);

export default router;
