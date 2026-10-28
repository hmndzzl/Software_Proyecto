import { Router } from 'express';
import { getContenidoLanding, actualizarContenidoLanding, subirImagenLanding } from '../controllers/landing.controller';
import { recibirFotoEspacio as recibirImagen } from '../middlewares/espacioFoto.middleware';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();
router.use(authMiddleware, requireRole(ROLES.ADMIN, ROLES.SACERDOTE));
router.get('/', getContenidoLanding);
router.patch('/', actualizarContenidoLanding);
router.post('/imagenes', recibirImagen, subirImagenLanding);

export default router;
