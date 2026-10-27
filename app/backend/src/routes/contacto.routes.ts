import { Router } from 'express';
import { crearContacto, listarContactos } from '../controllers/contacto.controller';
import { contactoRateLimiter } from '../middlewares/contacto-rate-limit.middleware';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

// Público (HU-32): la landing page no requiere sesión para enviar el formulario de contacto.
router.post('/', contactoRateLimiter, crearContacto);

// Solo Sacerdote y Admin consultan los mensajes recibidos.
router.get('/', authMiddleware, requireRole(ROLES.SACERDOTE, ROLES.ADMIN), listarContactos);

export default router;
