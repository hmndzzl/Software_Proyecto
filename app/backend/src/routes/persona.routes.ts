import { Router } from 'express';
import { getMinistros } from '../controllers/persona.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.get('/', getMinistros);

export default router;