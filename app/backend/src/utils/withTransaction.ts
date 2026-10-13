import type { PoolConnection } from 'mysql2/promise';
import pool from '../config/db';

/**
 * Centraliza el ciclo de vida getConnection/beginTransaction/commit/rollback/release
 * que se repetía en cada controller con escritura transaccional.
 *
 * `fn` hace todo el trabajo (lecturas de validación incluidas) y decide el desenlace
 * devolviendo 'commit' o 'rollback' — el propio `fn` sigue respondiendo con `res` en
 * cada punto de salida, igual que antes; este helper solo ejecuta la acción de BD
 * correspondiente. Si `fn` lanza una excepción no controlada, se revierte y se
 * re-lanza para que el controller la maneje en su propio catch (log + 500).
 */
export async function withTransaction(
  fn: (conn: PoolConnection) => Promise<'commit' | 'rollback'>
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const outcome = await fn(conn);
    if (outcome === 'commit') {
      await conn.commit();
    } else {
      await conn.rollback();
    }
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rollbackError) {
      console.error('Error al revertir transacción:', rollbackError);
    }
    throw error;
  } finally {
    conn.release();
  }
}
