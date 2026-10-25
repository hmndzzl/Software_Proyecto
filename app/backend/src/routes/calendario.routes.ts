import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getCalendario } from '../controllers/calendario.controller';

const router = Router();
router.use(authMiddleware);
router.get('/', getCalendario);
export default router;
