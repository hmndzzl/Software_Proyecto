import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../../config/db';
import { withTransaction } from '../withTransaction';

vi.mock('../../config/db', () => ({
  default: {
    getConnection: vi.fn(),
  },
}));

describe('withTransaction', () => {
  let conn: any;

  beforeEach(() => {
    conn = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    vi.mocked(pool.getConnection).mockResolvedValue(conn);
  });

  it('confirma la transacción cuando fn devuelve "commit"', async () => {
    await withTransaction(async () => 'commit');

    expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it('revierte la transacción cuando fn devuelve "rollback" (validación de negocio, no excepción)', async () => {
    await withTransaction(async () => 'rollback');

    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it('revierte y relanza el error original cuando fn lanza una excepción', async () => {
    const errorOriginal = new Error('fallo inesperado');

    await expect(withTransaction(async () => { throw errorOriginal; })).rejects.toBe(errorOriginal);

    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it('si el propio rollback falla, registra el error secundario y relanza el error original', async () => {
    const errorOriginal = new Error('fallo inesperado');
    const errorRollback = new Error('la conexión ya se cerró');
    conn.rollback.mockRejectedValue(errorRollback);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(withTransaction(async () => { throw errorOriginal; })).rejects.toBe(errorOriginal);

    expect(consoleSpy).toHaveBeenCalledWith('Error al revertir transacción:', errorRollback);
    expect(conn.release).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it('siempre libera la conexión, incluso si commit falla', async () => {
    const errorCommit = new Error('commit falló');
    conn.commit.mockRejectedValue(errorCommit);

    await expect(withTransaction(async () => 'commit')).rejects.toThrow('commit falló');

    expect(conn.release).toHaveBeenCalledTimes(1);
  });
});
