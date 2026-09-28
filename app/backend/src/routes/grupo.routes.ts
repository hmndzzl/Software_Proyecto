import { Router } from 'express';
import {
  getGrupos,
  getGrupoById,
  createGrupo,
  updateGrupo,
  deleteGrupo,
} from '../controllers/grupo.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

// Todas las rutas de grupos requieren autenticación JWT
router.use(authMiddleware);

router.get('/', getGrupos);
router.get('/:id', getGrupoById);

// Solo Sacerdote, Coordinador de Grupos y Admin gestionan grupos (DT-05)
router.post('/', requireRole(ROLES.COORDINADOR_GRUPOS), createGrupo);
router.put('/:id', requireRole(ROLES.COORDINADOR_GRUPOS), updateGrupo);
router.delete('/:id', requireRole(ROLES.COORDINADOR_GRUPOS), deleteGrupo);

export default router;