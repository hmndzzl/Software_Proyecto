import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import db from '../../config/db';
import { decisionesCuenta, decisionesReserva } from '../decisiones.controller';

vi.mock('../../config/db', () => ({ default: { query: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

describe.each([['cuenta', decisionesCuenta], ['reserva', decisionesReserva]] as const)('historial de %s', (_tipo, controller) => {
  function respuesta() {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    return { json, status, res: { json, status } as unknown as Response };
  }
  it.each(['0', '-1', 'abc', '1.5'])('rechaza identificador %s', async id => {
    const { res, status } = respuesta();
    await controller({ params: { id } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  it('distingue un registro inexistente de uno sin decisiones', async () => {
    const { res, status, json } = respuesta();
    vi.mocked(db.query).mockResolvedValueOnce([[]] as never);
    await controller({ params: { id: '1' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(404);
    vi.mocked(db.query).mockResolvedValueOnce([[{ id: 1 }]] as never).mockResolvedValueOnce([[]] as never);
    await controller({ params: { id: '1' } } as unknown as Request, res);
    expect(json).toHaveBeenLastCalledWith([]);
  });
  it('devuelve el historial y maneja fallos de BD', async () => {
    const { res, status, json } = respuesta();
    const datos = [{ id: 2, actor_nombre: 'Ana', resultado: 'aprobada', fecha: '2026-10-25T14:00:00Z' }];
    vi.mocked(db.query).mockResolvedValueOnce([[{ id: 1 }]] as never).mockResolvedValueOnce([datos] as never);
    await controller({ params: { id: '1' } } as unknown as Request, res);
    expect(json).toHaveBeenCalledWith(datos);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(db.query).mockRejectedValueOnce(new Error('sin conexión'));
    await controller({ params: { id: '1' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(500);
  });
});
