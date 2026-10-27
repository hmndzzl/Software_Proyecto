import { beforeEach, expect, it, vi } from 'vitest';
import pool from '../../config/db';
import { obtenerPersonaSesion } from '../sesion.service';
vi.mock('../../config/db', () => ({ default: { execute: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
it('consulta el estado persistido en cada llamada, sin cachear la cuenta activa', async () => {
  vi.mocked(pool.execute).mockResolvedValueOnce([[{ id: 7, rol_id: 4, estado_cuenta: 'activa' }]] as never)
    .mockResolvedValueOnce([[{ id: 7, rol_id: 4, estado_cuenta: 'baja' }]] as never);
  expect(await obtenerPersonaSesion(7)).toMatchObject({ estado_cuenta: 'activa' });
  expect(await obtenerPersonaSesion(7)).toMatchObject({ estado_cuenta: 'baja' });
  expect(pool.execute).toHaveBeenCalledWith('SELECT id, rol_id, estado_cuenta FROM persona WHERE id = ?', [7]);
});
it('devuelve null para una persona inexistente', async () => {
  vi.mocked(pool.execute).mockResolvedValue([[]] as never);
  expect(await obtenerPersonaSesion(7)).toBeNull();
});
