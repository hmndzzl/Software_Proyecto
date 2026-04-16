import { Router } from 'express';
import {
  crearReserva,
  obtenerReservas,
  obtenerReservaPorId,
  cambiarEstadoReserva
} from '../controllers/reserva.controller';

const router = Router();

router.post('/', crearReserva);
router.get('/', obtenerReservas);
router.get('/:id', obtenerReservaPorId);
router.put('/:id/estado', cambiarEstadoReserva);

export default router;