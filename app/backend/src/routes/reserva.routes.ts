import { Router } from 'express';
import {
  crearReserva,
  editarReserva,
  obtenerReservas,
  obtenerMisReservas,
  obtenerReservaPorId,
  cambiarEstadoReserva
} from '../controllers/reserva.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authMiddleware, crearReserva);
router.get('/', authMiddleware, obtenerReservas);
router.get('/mis-reservas', authMiddleware, obtenerMisReservas);
router.get('/:id', authMiddleware, obtenerReservaPorId);

router.put('/:id', authMiddleware, editarReserva);
// Endpoint para modificar el estado de la reserva: Admin/Sacerdote pueden aprobar/rechazar
// cualquier reserva; el solicitante puede cancelar (estado_id=3) su propia reserva
// Pendiente/Confirmada. Ownership y rol se validan dentro de cambiarEstadoReserva.
router.put('/:id/estado', authMiddleware, cambiarEstadoReserva);

export default router;