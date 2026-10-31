import { beforeEach, describe, expect, it, vi } from 'vitest';
import pool from '../../config/db';
import { enviarRecordatorios, enviarRecordatoriosTardios } from '../recordatorios.service';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn(), getConnection: vi.fn() } }));

const candidato = { tarea_id: 1, persona_id: 9 };
const servicio = { titulo: 'Lectura', fecha: '2026-11-01', hora_inicio: '10:00:00', hora_fin: '11:00:00' };

function conexion() {
  return {
    beginTransaction: vi.fn(), execute: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
  };
}

beforeEach(() => {
  vi.mocked(pool.execute).mockReset();
  vi.mocked(pool.getConnection).mockReset();
});

describe('enviarRecordatorios / enviarRecordatoriosTardios', () => {
  it('no hace nada si no hay candidatos en la ventana', async () => {
    vi.mocked(pool.execute).mockResolvedValueOnce([[], []] as any);
    const resultado = await enviarRecordatorios();
    expect(resultado).toEqual({ enviados: 0, omitidos: 0, errores: 0 });
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('envía el recordatorio tardío con el prefijo de recuperación', async () => {
    vi.mocked(pool.execute).mockResolvedValueOnce([[candidato], []] as any);
    const conn = conexion();
    vi.mocked(conn.execute)
      .mockResolvedValueOnce([[servicio], []] as any)
      .mockResolvedValueOnce([{}] as any)
      .mockResolvedValueOnce([{ insertId: 5 }] as any)
      .mockResolvedValueOnce([{}] as any);
    vi.mocked(pool.getConnection).mockResolvedValueOnce(conn as any);

    const resultado = await enviarRecordatoriosTardios();

    expect(resultado).toEqual({ enviados: 1, omitidos: 0, errores: 0 });
    expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
    expect(conn.execute).toHaveBeenNthCalledWith(3,
      expect.stringContaining('INSERT INTO notificacion'),
      [expect.stringContaining('recuperado tras una interrupción'), expect.any(String)]);
    expect(conn.execute).toHaveBeenNthCalledWith(4,
      expect.stringContaining('INSERT INTO persona_notificacion'),
      [candidato.persona_id, 5]);
  });

  it('omite el candidato si la revalidación bajo bloqueo ya no encuentra la asignación', async () => {
    vi.mocked(pool.execute).mockResolvedValueOnce([[candidato], []] as any);
    const conn = conexion();
    vi.mocked(conn.execute).mockResolvedValueOnce([[], []] as any);
    vi.mocked(pool.getConnection).mockResolvedValueOnce(conn as any);

    const resultado = await enviarRecordatorios();

    expect(resultado).toEqual({ enviados: 0, omitidos: 1, errores: 0 });
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.execute).toHaveBeenCalledTimes(1);
  });

  it('cuenta como omitido un recordatorio duplicado (clave única) sin registrar error', async () => {
    vi.mocked(pool.execute).mockResolvedValueOnce([[candidato], []] as any);
    const conn = conexion();
    vi.mocked(conn.execute)
      .mockResolvedValueOnce([[servicio], []] as any)
      .mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    vi.mocked(pool.getConnection).mockResolvedValueOnce(conn as any);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const resultado = await enviarRecordatorios();

    expect(resultado).toEqual({ enviados: 0, omitidos: 1, errores: 0 });
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
  });

  it('cuenta y registra un error inesperado al enviar, sin detener a los demás candidatos', async () => {
    const candidato2 = { tarea_id: 2, persona_id: 10 };
    vi.mocked(pool.execute).mockResolvedValueOnce([[candidato, candidato2], []] as any);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const conn1 = conexion();
    vi.mocked(conn1.execute)
      .mockResolvedValueOnce([[servicio], []] as any)
      .mockRejectedValueOnce(new Error('BD caída'));
    const conn2 = conexion();
    vi.mocked(conn2.execute)
      .mockResolvedValueOnce([[servicio], []] as any)
      .mockResolvedValueOnce([{}] as any)
      .mockResolvedValueOnce([{ insertId: 6 }] as any)
      .mockResolvedValueOnce([{}] as any);
    vi.mocked(pool.getConnection).mockResolvedValueOnce(conn1 as any).mockResolvedValueOnce(conn2 as any);

    const resultado = await enviarRecordatorios();

    expect(resultado).toEqual({ enviados: 1, omitidos: 0, errores: 1 });
    expect(conn1.rollback).toHaveBeenCalledTimes(1);
    expect(conn2.commit).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('No se pudo enviar recordatorio de servicio', candidato, expect.any(Error));
  });
});
