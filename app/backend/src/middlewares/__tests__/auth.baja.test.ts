import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../auth.middleware';
import { JWT_SECRET } from '../../config/env';
import { obtenerPersonaSesion } from '../../services/sesion.service';

vi.mock('../../services/sesion.service', () => ({ obtenerPersonaSesion: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

async function autenticar(payload: object = { id: 7, rol_id: 5 }) {
  const req = { headers: { authorization: `Bearer ${jwt.sign(payload, JWT_SECRET)}` } } as Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  authMiddleware(req, res, next);
  await vi.waitFor(() => expect(next.mock.calls.length + vi.mocked(res.json).mock.calls.length).toBe(1));
  return { req, res, next };
}

describe('revocación de acceso con JWT ya emitido', () => {
  it.each(['baja', 'rechazada', 'pendiente'] as const)('deniega una cuenta %s', async estado_cuenta => {
    vi.mocked(obtenerPersonaSesion).mockResolvedValue({ id: 7, rol_id: 4, estado_cuenta });
    const { req, res, next } = await autenticar();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ codigo: `CUENTA_${estado_cuenta.toUpperCase()}` }));
    expect(req.user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });
  it('consulta el rol actual, aunque el JWT tenga permisos anteriores', async () => {
    vi.mocked(obtenerPersonaSesion).mockResolvedValue({ id: 7, rol_id: 4, estado_cuenta: 'activa' });
    const { req, next } = await autenticar();
    expect(req.user).toEqual({ id: 7, rol_id: 4 });
    expect(next).toHaveBeenCalled();
  });
  it('deniega una persona inexistente', async () => {
    vi.mocked(obtenerPersonaSesion).mockResolvedValue(null);
    const { res } = await autenticar();
    expect(res.status).toHaveBeenCalledWith(401);
  });
  it.each([{}, { id: -1 }, { id: '7' }, { id: 1.5 }])('rechaza un payload inválido %j', async payload => {
    const { res } = await autenticar(payload);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(obtenerPersonaSesion).not.toHaveBeenCalled();
  });
  it('no concede acceso si falla la consulta', async () => {
    vi.mocked(obtenerPersonaSesion).mockRejectedValue(new Error('Sin BD'));
    const { res, next } = await autenticar();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});
