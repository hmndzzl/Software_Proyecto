import { Router } from 'express';
import {
  obtenerEspacios,
  obtenerEspacioPorId,
  crearEspacio,
  actualizarEspacio,
  eliminarEspacio,
} from '../controllers/espacio.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

// Cualquier usuario autenticado puede ver los espacios (UML: "Visualizar salones y disponibilidad")
router.get('/', authMiddleware, obtenerEspacios);
router.get('/:id', authMiddleware, obtenerEspacioPorId);

// Solo Sacerdote y Admin gestionan los espacios
router.post('/', authMiddleware, requireRole(ROLES.SACERDOTE, ROLES.ADMIN), crearEspacio);
router.put('/:id', authMiddleware, requireRole(ROLES.SACERDOTE, ROLES.ADMIN), actualizarEspacio);
router.delete('/:id', authMiddleware, requireRole(ROLES.SACERDOTE, ROLES.ADMIN), eliminarEspacio);

export default router;