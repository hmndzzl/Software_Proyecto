import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ROLE_HIERARCHY } from '../config/roles';
import { HttpStatus } from '../utils/httpStatus';
import { JWT_SECRET } from '../config/env';

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
  } catch {
    res.status(HttpStatus.UNAUTHORIZED).json({ mensaje: 'Token inválido o expirado' });
  }
}