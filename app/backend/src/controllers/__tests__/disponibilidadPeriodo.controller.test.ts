import { beforeEach, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import pool from '../../config/db';
import { gestionarPeriodo } from '../disponibilidadPeriodo.controller';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn() } }));
const execute = vi.mocked(pool.execute);
let res: Response;
const req = (method = 'POST', body: unknown = { desde: '2026-12-10T10:00', hasta: '2026-12-15T18:00' }, params = { id: '9' }) => ({ method, params, body, user: { id: 1, rol_id: 5 } }) as unknown as Request;
beforeEach(() => {
  vi.resetAllMocks();
  res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() } as unknown as Response;
});

it.each([
  {}, { desde: true, hasta: false }, { desde: '2026-02-30T10:00', hasta: '2026-03-01T10:00' },
  { desde: '2026-12-10T25:00', hasta: '2026-12-11T10:00' },
  { desde: '2026-12-10T10:00Z', hasta: '2026-12-15T10:00Z' },
  { desde: '2026-12-10T10:00', hasta: '2026-12-10T10:00' },
  { desde: '2026-12-10T10:00', hasta: '2026-12-09T10:00' },
])('rechaza rangos inválidos sin escribir: %j', async body => {
  await gestionarPeriodo(req('POST', body), res);
  expect(res.status).toHaveBeenCalledWith(400); expect(execute).not.toHaveBeenCalled();
});
it('valida ids y rechaza eliminar otro periodo', async () => {
  await gestionarPeriodo(req('GET', {}, { id: '0' }), res);
  await gestionarPeriodo(req('DELETE', {}), res);
  expect(res.status).toHaveBeenCalledWith(400);
  execute.mockResolvedValueOnce([[{ id: 9 }], []] as never).mockResolvedValueOnce([{ affectedRows: 0 }, []] as never);
  await gestionarPeriodo(req('DELETE', {}, { id: '9', periodoId: '3' } as never), res);
  expect(execute).toHaveBeenLastCalledWith(expect.stringContaining('WHERE id = ? AND ministro_id = ?'), [3, 9]);
  expect(res.status).toHaveBeenLastCalledWith(404);
});
it('crea, consulta y elimina sin cambiar el interruptor general', async () => {
  execute.mockResolvedValueOnce([[{ id: 9 }], []] as never).mockResolvedValueOnce([{ insertId: 3 }, []] as never);
  await gestionarPeriodo(req(), res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith({ id: 3, desde: '2026-12-10T10:00', hasta: '2026-12-15T18:00', origen: 'disponibilidad' });
  execute.mockResolvedValueOnce([[{ id: 9 }], []] as never).mockResolvedValueOnce([[], []] as never);
  await gestionarPeriodo(req('GET'), res);
  expect(res.json).toHaveBeenLastCalledWith([]);
  execute.mockResolvedValueOnce([[{ id: 9 }], []] as never).mockResolvedValueOnce([{ affectedRows: 1 }, []] as never);
  await gestionarPeriodo(req('DELETE', {}, { id: '9', periodoId: '3' } as never), res);
  expect(res.status).toHaveBeenLastCalledWith(204);
});
it('rechaza ministros inexistentes y ajenos, y maneja fallos de base', async () => {
  execute.mockResolvedValueOnce([[], []] as never);
  await gestionarPeriodo(req(), res); expect(res.status).toHaveBeenLastCalledWith(404);
  const coordinador = req(); coordinador.user!.rol_id = 2;
  execute.mockResolvedValueOnce([[], []] as never);
  await gestionarPeriodo(coordinador, res); expect(res.status).toHaveBeenLastCalledWith(403);
  execute.mockRejectedValueOnce(new Error('Sin conexión'));
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await gestionarPeriodo(req(), res); expect(res.status).toHaveBeenLastCalledWith(500);
  log.mockRestore();
});
