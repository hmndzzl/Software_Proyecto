import { Router } from 'express';
import {
  getEventos,
  getEventoById,
  getReservasDisponibles,
  createEvento,
  updateEvento,
  deleteEvento,
} from '../controllers/evento.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

router.use(authMiddleware);

router.get('/', getEventos);
router.get('/reservas-disponibles', getReservasDisponibles);
router.get('/:id', getEventoById);

router.post('/', requireRole(ROLES.SACERDOTE, ROLES.ADMIN), createEvento);
router.put('/:id', requireRole(ROLES.SACERDOTE, ROLES.ADMIN), updateEvento);
router.delete('/:id', requireRole(ROLES.SACERDOTE, ROLES.ADMIN), deleteEvento);

export default router;
