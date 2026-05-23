import { Router } from 'express';
import {
  getMinistros,
  getCoordinadoresGrupo,
  getPersonaById,
  editarPerfil,
} from '../controllers/persona.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Rutas específicas ANTES de /:id para que Express no las confunda con parámetros
router.get('/coordinadores-grupo', getCoordinadoresGrupo);
router.get('/', getMinistros);

// Rutas con parámetro de id
router.get('/:id', getPersonaById);
router.put('/:id', editarPerfil);

export default router;