import { rateLimit } from 'express-rate-limit';

const CONTACTO_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// El endpoint es público (sin autenticación), así que se limita por IP para
// evitar abuso/spam del formulario de contacto de la landing page (HU-32).
export const contactoRateLimiter = rateLimit({
  windowMs: CONTACTO_LIMIT_WINDOW_MS,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    mensaje: 'Demasiados mensajes enviados. Inténtalo de nuevo en 15 minutos.',
  },
});
