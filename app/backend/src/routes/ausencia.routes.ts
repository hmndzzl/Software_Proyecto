import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { crearAusencia } from '../controllers/ausencia.controller';

const router = Router();
router.use(authMiddleware);
router.post('/', crearAusencia);
export default router;
