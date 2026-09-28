// Lectura centralizada de las variables de entorno críticas del backend (DT-07/DT-08).
// Elimina los valores de respaldo hardcodeados de los secretos JWT y valida que
// las variables obligatorias existan antes de arrancar el servidor.
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
] as const;

// Se omite en pruebas (NODE_ENV=test, valor por defecto de Vitest): los
// controllers/middlewares se importan de forma aislada ahí, sin pasar por
// app.ts, y sus dependencias externas (jsonwebtoken, pool) siempre están mockeadas.
export function validateEnv(): void {
  if (process.env.NODE_ENV === 'test') return;

  const faltantes = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. Copia app/.env.example a app/.env y complétalo.`
    );
  }
}

// Fuera de pruebas, validateEnv() ya detuvo el arranque si esta variable falta,
// así que este fallback nunca se alcanza en dev/producción: solo existe para que
// las pruebas (NODE_ENV=test) que firman/verifican JWT reales sin mockear
// jsonwebtoken tengan un secreto consistente entre sí, sin depender de un .env.
function resolveSecret(envVar: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[envVar];
  if (value) return value;
  if (process.env.NODE_ENV === 'test') return `secreto-de-prueba-${envVar.toLowerCase()}`;
  return value as unknown as string;
}

export const JWT_SECRET = resolveSecret('JWT_SECRET');
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
export const JWT_REFRESH_SECRET = resolveSecret('JWT_REFRESH_SECRET');
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '15d';
