import type { PoolConnection } from 'mysql2/promise';
import type { ResultSetHeader } from 'mysql2';

export type TipoDecision = 'reserva' | 'cuenta';
export type ResultadoDecision = 'aprobada' | 'rechazada' | 'pendiente' | 'cancelada' | 'baja';

/** Se ejecuta en la misma transacción del cambio, nunca con autor o fecha del cliente. */
export async function registrarDecision(conn: PoolConnection, tipo: TipoDecision, id: number, resultado: ResultadoDecision, actorId: number) {
  const [guardado] = await conn.execute<ResultSetHeader>(
    `INSERT INTO ${tipo}_decision (${tipo}_id, resultado, actor_id, actor_nombre, fecha_utc)
     SELECT ?, ?, p.id, p.nombre, UTC_TIMESTAMP(3) FROM persona p WHERE p.id = ?`,
    [id, resultado, actorId],
  );
  if (guardado.affectedRows !== 1) throw new Error('No se pudo registrar el autor de la decisión');
}
