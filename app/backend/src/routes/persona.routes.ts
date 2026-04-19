import { Router } from 'express';
import { getMinistros, getCoordinadoresGrupo } from '../controllers/persona.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.get('/', getMinistros);
router.get('/coordinadores-grupo', getCoordinadoresGrupo);

export default router;