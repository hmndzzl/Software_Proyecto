import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../auth.middleware';
import { HttpStatus } from '../../utils/httpStatus';
import { ROLES } from '../../config/roles';
import { isClerkEnabled, verifyClerkSessionToken } from '../../config/clerk';
import { resolvePersonaFromClerk } from '../../services/clerkAuth.service';

vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn() },
}));

vi.mock('../../config/clerk', () => ({
  isClerkEnabled: vi.fn(),
  verifyClerkSessionToken: vi.fn(),
}));

vi.mock('../../services/clerkAuth.service', () => ({
  resolvePersonaFromClerk: vi.fn(),
}));

describe('Auth Middleware - Sesiones de Clerk', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusMock: any;
  let jsonMock: any;

  // La validación con Clerk es asíncrona: se espera a que responda o llame a next().
  const ejecutar = async () => {
    authMiddleware(req as Request, res as Response, next);
    await vi.waitFor(() => {
      expect(statusMock.mock.calls.length + (next as any).mock.calls.length).toBeGreaterThan(0);
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    req = { headers: { authorization: 'Bearer token_de_clerk' } };
    res = { status: statusMock, json: jsonMock };
    next = vi.fn();
    (jwt.verify as any).mockImplementation(() => { throw new Error('No es un JWT propio'); });
  });

  it('mantiene el 401 si el JWT propio es inválido y Clerk no está configurado', async () => {
    (isClerkEnabled as any).mockReturnValue(false);

    await ejecutar();

    expect(verifyClerkSessionToken).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Token inválido o expirado' });
  });

  it('sigue aceptando el JWT propio aunque Clerk esté configurado', () => {
    (isClerkEnabled as any).mockReturnValue(true);
    (jwt.verify as any).mockReturnValue({ id: 3, rol_id: ROLES.MINISTRO });

    authMiddleware(req as Request, res as Response, next);

    expect(verifyClerkSessionToken).not.toHaveBeenCalled();
    expect(req.user).toEqual({ id: 3, rol_id: ROLES.MINISTRO });
    expect(next).toHaveBeenCalled();
  });

  it('adjunta la persona y su rol de la BD cuando el token de Clerk es válido', async () => {
    (isClerkEnabled as any).mockReturnValue(true);
    (verifyClerkSessionToken as any).mockResolvedValue('user_123');
    (resolvePersonaFromClerk as any).mockResolvedValue({ id: 7, rol_id: ROLES.COORDINADOR_GRUPOS, estado_cuenta: 'activa' });

    await ejecutar();

    expect(verifyClerkSessionToken).toHaveBeenCalledWith('token_de_clerk');
    expect(resolvePersonaFromClerk).toHaveBeenCalledWith('user_123');
    expect(req.user).toEqual({ id: 7, rol_id: ROLES.COORDINADOR_GRUPOS });
    expect(next).toHaveBeenCalled();
  });

  it('retorna 401 si el token de Clerk no es válido', async () => {
    (isClerkEnabled as any).mockReturnValue(true);
    (verifyClerkSessionToken as any).mockResolvedValue(null);

    await ejecutar();

    expect(resolvePersonaFromClerk).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 si el usuario de Clerk no corresponde a ninguna persona', async () => {
    (isClerkEnabled as any).mockReturnValue(true);
    (verifyClerkSessionToken as any).mockResolvedValue('user_desconocido');
    (resolvePersonaFromClerk as any).mockResolvedValue(null);

    await ejecutar();

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['pendiente', 'CUENTA_PENDIENTE'],
    ['rechazada', 'CUENTA_RECHAZADA'],
  ])('retorna 403 y no adjunta usuario si la cuenta está %s', async (estado, codigo) => {
    (isClerkEnabled as any).mockReturnValue(true);
    (verifyClerkSessionToken as any).mockResolvedValue('user_123');
    (resolvePersonaFromClerk as any).mockResolvedValue({ id: 9, rol_id: ROLES.MINISTRO, estado_cuenta: estado });

    await ejecutar();

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ codigo }));
    expect(req.user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 si falla la verificación con Clerk', async () => {
    (isClerkEnabled as any).mockReturnValue(true);
    (verifyClerkSessionToken as any).mockRejectedValue(new Error('Clerk no disponible'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await ejecutar();

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(next).not.toHaveBeenCalled();
  });
});
