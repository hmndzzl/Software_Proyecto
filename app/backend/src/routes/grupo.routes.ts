import { Router } from 'express';
import {
  getGrupos,
  getGrupoById,
  createGrupo,
  updateGrupo,
  deleteGrupo,
} from '../controllers/grupo.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas de grupos requieren autenticación JWT
router.use(authMiddleware);

router.get('/', getGrupos);
router.get('/:id', getGrupoById);
router.post('/', createGrupo);
router.put('/:id', updateGrupo);
router.delete('/:id', deleteGrupo);

export default router;