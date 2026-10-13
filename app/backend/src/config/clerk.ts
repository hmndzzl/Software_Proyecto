import { createClerkClient, verifyToken, type ClerkClient } from '@clerk/express';
import { getAllowedOrigins } from './env';

// Clerk es opcional mientras dura la migración: si CLERK_SECRET_KEY no está
// definido, el backend sigue funcionando únicamente con los JWT propios.
export function isClerkEnabled(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

let client: ClerkClient | null = null;

export function getClerkClient(): ClerkClient {
  if (!client) {
    client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  }
  return client;
}

/**
 * Verifica un token de sesión de Clerk y devuelve el id del usuario de Clerk
 * (claim `sub`), o null si el token no es válido.
 */
export async function verifyClerkSessionToken(token: string): Promise<string | null> {
  // El verifyToken público de @clerk/express devuelve el payload y lanza si el
  // token no es válido (expirado, firma incorrecta, azp no permitido, etc.).
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      authorizedParties: getAllowedOrigins(),
    });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch (error) {
    console.warn('Token de Clerk rechazado:', error instanceof Error ? error.message : error);
    return null;
  }
}
