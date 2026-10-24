import { Router } from 'express';
import {
  crearReserva,
  editarReserva,
  obtenerReservas,
  obtenerMisReservas,
  obtenerReservaPorId,
  cambiarEstadoReserva
} from '../controllers/reserva.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();
const puedeGestionarReservas = requireRole(ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS);

router.post('/', authMiddleware, puedeGestionarReservas, crearReserva);
router.get('/', authMiddleware, puedeGestionarReservas, obtenerReservas);
router.get('/mis-reservas', authMiddleware, puedeGestionarReservas, obtenerMisReservas);
router.get('/:id', authMiddleware, puedeGestionarReservas, obtenerReservaPorId);

router.put('/:id', authMiddleware, puedeGestionarReservas, editarReserva);
// Endpoint para modificar el estado de la reserva: Admin/Sacerdote pueden aprobar/rechazar
// cualquier reserva; un solicitante autorizado puede cancelar (estado_id=3) su propia
// reserva Pendiente/Confirmada. Ownership y rol se validan dentro de cambiarEstadoReserva.
router.put('/:id/estado', authMiddleware, puedeGestionarReservas, cambiarEstadoReserva);

export default router;
