import { Router } from 'express';
import { crearContacto } from '../controllers/contacto.controller';
import { contactoRateLimiter } from '../middlewares/contacto-rate-limit.middleware';

const router = Router();

// Público (HU-32): la landing page no requiere sesión para enviar el formulario de contacto.
router.post('/', contactoRateLimiter, crearContacto);

export default router;
