import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ROLE_HIERARCHY } from '../config/roles';
import { HttpStatus } from '../utils/httpStatus';
import { JWT_SECRET } from '../config/env';
import { isClerkEnabled, verifyClerkSessionToken } from '../config/clerk';
import { resolvePersonaFromClerk } from '../services/clerkAuth.service';
import { ESTADOS_CUENTA, respuestaCuentaNoActiva } from '../config/cuentas';

export interface JwtPayload {
  id: number;
  rol_id: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verifica que el usuario autenticado tenga al menos uno de los roles indicados,
 * respetando la jerarquía definida en ROLE_HIERARCHY.
 * Ejemplo: requireRole(ROLES.COORDINADOR_MINISTROS) permite acceso a Sacerdote y Admin también.
 */
export function requireRole(...allowedRoles: number[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRolId = req.user?.rol_id;
    if (userRolId === undefined) {
      res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Acceso denegado: permisos insuficientes' });
      return;
    }
    const effectiveRoles = ROLE_HIERARCHY[userRolId] ?? [userRolId];
    const hasAccess = allowedRoles.some(role => effectiveRoles.includes(role));
    if (!hasAccess) {
      res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Acceso denegado: permisos insuficientes' });
      return;
    }
    next();
  };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(HttpStatus.UNAUTHORIZED).json({ mensaje: 'Token no proporcionado' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
    return;
  } catch {
    // Si no es un JWT propio, puede ser un token de sesión de Clerk (migración).
  }

  if (!isClerkEnabled()) {
    res.status(HttpStatus.UNAUTHORIZED).json({ mensaje: 'Token inválido o expirado' });
    return;
  }

  void authenticateWithClerk(token, req, res, next);
}

async function authenticateWithClerk(token: string, req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const clerkUserId = await verifyClerkSessionToken(token);
    if (!clerkUserId) {
      res.status(HttpStatus.UNAUTHORIZED).json({ mensaje: 'Token inválido o expirado' });
      return;
    }

    const persona = await resolvePersonaFromClerk(clerkUserId);
    if (!persona) {
      console.warn(`Usuario de Clerk ${clerkUserId} sin persona vinculada`);
      res.status(HttpStatus.FORBIDDEN).json({
        mensaje: 'Tu cuenta no está registrada en el sistema parroquial. Contacta al administrador.',
      });
      return;
    }

    if (persona.estado_cuenta !== ESTADOS_CUENTA.ACTIVA) {
      res.status(HttpStatus.FORBIDDEN).json(respuestaCuentaNoActiva(persona.estado_cuenta));
      return;
    }

    req.user = { id: persona.id, rol_id: persona.rol_id };
    next();
  } catch (error) {
    console.error('Error al validar la sesión de Clerk:', error);
    res.status(HttpStatus.UNAUTHORIZED).json({ mensaje: 'Token inválido o expirado' });
  }
}