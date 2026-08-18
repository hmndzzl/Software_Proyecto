import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, requireRole } from '../auth.middleware';
import { HttpStatus } from '../../utils/httpStatus';
import { ROLES } from '../../config/roles';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn()
  }
}));

describe('Auth Middleware - Pruebas Unitarias', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusMock: any;
  let jsonMock: any;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    req = {
      headers: {},
    };

    res = {
      status: statusMock,
      json: jsonMock,
    };

    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('debería retornar 401 si no se envía encabezado de autorización', () => {
      authMiddleware(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Token no proporcionado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('debería retornar 401 si el encabezado no empieza con Bearer', () => {
      req.headers!.authorization = 'Basic asdfasdf';

      authMiddleware(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Token no proporcionado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('debería retornar 401 si el token es inválido o expiró', () => {
      req.headers!.authorization = 'Bearer token_invalido';
      (jwt.verify as any).mockImplementation(() => { throw new Error('Invalid token'); });

      authMiddleware(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Token inválido o expirado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('debería llamar a next() y adjuntar el usuario si el token es válido', () => {
      req.headers!.authorization = 'Bearer token_valido';
      const mockPayload = { id: 1, rol_id: ROLES.ADMIN };
      (jwt.verify as any).mockReturnValue(mockPayload);

      authMiddleware(req as Request, res as Response, next);

      expect(jwt.verify).toHaveBeenCalledWith('token_valido', expect.any(String));
      expect(req.user).toEqual(mockPayload);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('debería retornar 403 si el usuario no tiene rol_id definido', () => {
      req.user = undefined; // No user or no rol_id
      const middleware = requireRole(ROLES.MINISTRO);

      middleware(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Acceso denegado: permisos insuficientes' });
      expect(next).not.toHaveBeenCalled();
    });

    it('debería retornar 403 si el rol del usuario no tiene los permisos suficientes (vía hierarchy)', () => {
      req.user = { id: 1, rol_id: ROLES.MINISTRO }; 
      const middleware = requireRole(ROLES.ADMIN); // Un Ministro no puede acceder a rutas de Admin

      middleware(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(next).not.toHaveBeenCalled();
    });

    it('debería llamar a next() si el rol del usuario tiene los permisos exactos', () => {
      req.user = { id: 1, rol_id: ROLES.ADMIN }; 
      const middleware = requireRole(ROLES.ADMIN); 

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería llamar a next() si el rol del usuario tiene los permisos heredados (hierarchy)', () => {
      req.user = { id: 1, rol_id: ROLES.ADMIN }; 
      const middleware = requireRole(ROLES.MINISTRO); // Admin también tiene permisos de Ministro

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería proteger contra rol inválido (no en jerarquía) pero evaluar como array vacío (fallback)', () => {
      req.user = { id: 1, rol_id: 999 }; // 999 doesn't exist in hierarchy
      const middleware = requireRole(ROLES.MINISTRO);

      middleware(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(next).not.toHaveBeenCalled();
    });
    
    it('debería llamar a next() si rol no en jerarquía pero está explícitamente en allowedRoles (fallback de [userRolId])', () => {
      req.user = { id: 1, rol_id: 999 }; 
      const middleware = requireRole(999); // Permitimos explícitamente 999

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
