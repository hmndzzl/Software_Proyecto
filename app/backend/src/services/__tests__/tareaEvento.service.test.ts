import { describe, expect, it, vi } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import { validarEventoTarea } from '../tareaEvento.service';

function conexion(rows = [{ fecha: '2026-10-24', estado_reserva_id: 2 }]) {
  return { execute: vi.fn().mockResolvedValue([rows]) };
}

describe('asociación entre tarea y evento', () => {
  it('permite tareas independientes sin consultar eventos', async () => {
    const conn = conexion();
    await validarEventoTarea(conn as unknown as PoolConnection, null, '2026-10-24');
    expect(conn.execute).not.toHaveBeenCalled();
  });

  it.each([0, -1, '1', 1.5])('rechaza identificadores inválidos: %s', async id => {
    await expect(validarEventoTarea(conexion() as unknown as PoolConnection, id, '2026-10-24')).rejects.toMatchObject({ status: 400 });
  });

  it('rechaza eventos inexistentes', async () => {
    await expect(validarEventoTarea(conexion([]) as unknown as PoolConnection, 1, '2026-10-24')).rejects.toMatchObject({ status: 404 });
  });

  it('rechaza una fecha distinta', async () => {
    await expect(validarEventoTarea(conexion() as unknown as PoolConnection, 1, '2026-10-25')).rejects.toMatchObject({ status: 400 });
  });

  it.each([1, 2])('permite vincular a un evento con estado %s', async estado => {
    await expect(validarEventoTarea(conexion([{ fecha: '2026-10-24', estado_reserva_id: estado }]) as unknown as PoolConnection, 1, '2026-10-24')).resolves.toBeUndefined();
  });

  it.each([3, 4])('conserva relaciones existentes pero no crea nuevas con estado %s', async estado => {
    const conn = conexion([{ fecha: '2026-10-24', estado_reserva_id: estado }]) as unknown as PoolConnection;
    await expect(validarEventoTarea(conn, 1, '2026-10-24')).rejects.toMatchObject({ status: 400 });
    await expect(validarEventoTarea(conn, 1, '2026-10-24', false)).resolves.toBeUndefined();
  });
});
