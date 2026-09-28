import { rateLimit } from 'express-rate-limit';

const LOGIN_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const loginRateLimiter = rateLimit({
  windowMs: LOGIN_LIMIT_WINDOW_MS,
  limit: 10,
  // Solo el stack aislado de rendimiento puede omitir el límite por IP.
  // Producción conserva siempre la protección, incluso si se define el flag.
  skip: () => process.env.NODE_ENV === 'performance'
    && process.env.K6_DISABLE_LOGIN_RATE_LIMIT === 'true',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    mensaje: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en 15 minutos.',
  },
});
