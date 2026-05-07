import { Router } from 'express';
import {
  crearReserva,
  obtenerReservas,
  obtenerMisReservas,
  obtenerReservaPorId,
  cambiarEstadoReserva
} from '../controllers/reserva.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

router.post('/', authMiddleware, crearReserva);
router.get('/', authMiddleware, obtenerReservas);
router.get('/mis-reservas', authMiddleware, obtenerMisReservas);
router.get('/:id', authMiddleware, obtenerReservaPorId);

// Endpoint para modificar el estado de la reserva tras la decisión del administrador o sacerdote
router.put('/:id/estado', authMiddleware, requireRole(ROLES.ADMIN, ROLES.SACERDOTE), cambiarEstadoReserva);

export default router;