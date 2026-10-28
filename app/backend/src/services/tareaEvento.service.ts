import type { PoolConnection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { ErrorAsignacion } from './asignacionError';

/** Se ejecuta dentro de la transacción que escribe la tarea. */
export async function validarEventoTarea(conn: PoolConnection, eventoId: unknown, fecha: string, nuevaRelacion = true) {
  if (eventoId === null || eventoId === undefined) return;
  if (!Number.isSafeInteger(eventoId) || Number(eventoId) <= 0) {
    throw new ErrorAsignacion(400, 'Selecciona una misa o evento válido');
  }
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT r.fecha, r.estado_reserva_id FROM evento e
     JOIN reserva r ON r.id = e.reserva_id WHERE e.id = ? FOR UPDATE`, [Number(eventoId)],
  );
  if (!rows.length) throw new ErrorAsignacion(404, 'La misa o evento seleccionado no existe');
  if (rows[0].fecha !== fecha.slice(0, 10)) {
    throw new ErrorAsignacion(400, 'La tarea debe tener la misma fecha que la misa o evento asociado');
  }
  if (nuevaRelacion && ![1, 2].includes(rows[0].estado_reserva_id)) {
    throw new ErrorAsignacion(400, 'Solo puedes vincular tareas a eventos confirmados o pendientes');
  }
}
