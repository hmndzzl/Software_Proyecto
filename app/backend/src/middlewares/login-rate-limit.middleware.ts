import { rateLimit } from 'express-rate-limit';

const LOGIN_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const loginRateLimiter = rateLimit({
  windowMs: LOGIN_LIMIT_WINDOW_MS,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    mensaje: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en 15 minutos.',
  },
});
