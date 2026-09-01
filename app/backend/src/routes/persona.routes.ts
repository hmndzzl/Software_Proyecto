import { Router } from 'express';
import {
  getMinistros,
  getCoordinadoresGrupo,
  getPersonaById,
  editarPerfil,
  actualizarDisponibilidad,
} from '../controllers/persona.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

router.use(authMiddleware);

// Rutas específicas ANTES de /:id para que Express no las confunda con parámetros
router.get('/coordinadores-grupo', getCoordinadoresGrupo);
router.get('/', getMinistros);

// Rutas con parámetro de id
router.get('/:id', getPersonaById);
router.put('/:id', editarPerfil);
// requireRole(COORDINADOR_MINISTROS) también permite Sacerdote/Admin por jerarquía (ver auth.middleware)
router.patch('/:id/disponibilidad', requireRole(ROLES.COORDINADOR_MINISTROS), actualizarDisponibilidad);

export default router;