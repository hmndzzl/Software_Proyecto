import { beforeEach, expect, it, vi } from 'vitest';
import pool from '../../config/db';
import { obtenerPersonaSesion } from '../sesion.service';
vi.mock('../../config/db', () => ({ default: { execute: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
it('consulta el estado persistido en cada llamada, sin cachear la cuenta activa', async () => {
  vi.mocked(pool.execute).mockResolvedValueOnce([[{ id: 7, rol_id: 4, estado_cuenta: 'activa' }]] as never)
    .mockResolvedValueOnce([[{ id: 7, rol_id: 4, estado_cuenta: 'baja' }]] as never);
  const sid = '00000000-0000-0000-0000-000000000001';
  expect(await obtenerPersonaSesion(7, sid, 'access')).toMatchObject({ estado_cuenta: 'activa' });
  expect(await obtenerPersonaSesion(7, sid, 'access')).toMatchObject({ estado_cuenta: 'baja' });
  expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('JOIN sesion_jwt'), [7, sid]);
});
it('devuelve null para una persona inexistente', async () => {
  vi.mocked(pool.execute).mockResolvedValue([[]] as never);
  expect(await obtenerPersonaSesion(7, '00000000-0000-0000-0000-000000000001', 'access')).toBeNull();
});
it('rechaza tokens antiguos, sid inválidos y refresh usados como acceso sin consultar la BD', async () => {
  expect(await obtenerPersonaSesion(7)).toBeNull();
  expect(await obtenerPersonaSesion(7, 'inválido', 'access')).toBeNull();
  expect(await obtenerPersonaSesion(7, '00000000-0000-0000-0000-000000000001', 'refresh')).toBeNull();
  expect(pool.execute).not.toHaveBeenCalled();
});
