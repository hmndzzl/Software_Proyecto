import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { validarEventoTarea } from './tareaEvento.service';
import { withTransaction } from '../utils/withTransaction';
import { ROLES } from '../config/roles';
import { TOPE_SERVICIOS_MES } from '../config/constants';
import type { Tarea, TareaCreateInput } from '../types/tarea.types';

import { ErrorAsignacion } from './asignacionError';
export { ErrorAsignacion } from './asignacionError';

export function validarMinistros(ids: unknown): number[] {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100
    || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new ErrorAsignacion(400, 'Selecciona entre 1 y 100 ministros válidos');
  }
  return [...new Set(ids as number[])].sort((a, b) => a - b);
}

/** Crea y asigna, o amplía una tarea existente, sin dejar asignaciones parciales. */
export async function guardarTareaConMinistros(
  entrada: TareaCreateInput | number,
  ids: number[],
  usuario: { id: number; rol_id: number },
) {
  let tarea!: Tarea;
  const alertas: { persona_id: number; ministro_no_disponible: boolean; tope_servicios_superado: boolean; servicios_en_el_mes: number; tope_servicios_mes: number }[] = [];
  await withTransaction(async conn => {
    if (typeof entrada === 'number') {
      const [rows] = await conn.execute<RowDataPacket[]>('SELECT * FROM tarea WHERE id = ? FOR UPDATE', [entrada]);
      if (!rows.length) throw new ErrorAsignacion(404, 'Tarea no encontrada');
      tarea = rows[0] as Tarea & RowDataPacket;
    } else {
      tarea = { ...entrada, id: 0 };
    }

    if (typeof entrada !== 'number') await validarEventoTarea(conn, tarea.evento_id, tarea.fecha);

    // Serializa las asignaciones múltiples del mismo ministro y respeta el directorio activo.
    const placeholders = ids.map(() => '?').join(', ');
    const [ministros] = await conn.execute<RowDataPacket[]>(
      `SELECT id, nombre, disponible FROM persona WHERE id IN (${placeholders}) AND rol_id = ? AND estado_cuenta = 'activa' ORDER BY id FOR UPDATE`,
      [...ids, ROLES.MINISTRO],
    );
    if (ministros.length !== ids.length) throw new ErrorAsignacion(404, 'Uno o más ministros ya no están disponibles en el directorio');
    if (usuario.rol_id === ROLES.COORDINADOR_MINISTROS) {
      const [propios] = await conn.execute<RowDataPacket[]>(
        `SELECT ministro_id FROM coordinador_ministro WHERE coordinador_id = ? AND ministro_id IN (${placeholders})`,
        [usuario.id, ...ids],
      );
      if (propios.length !== ids.length) throw new ErrorAsignacion(403, 'Solo puedes asignar a tus propios ministros');
    }

    for (const ministro of ministros) {
      const [conflictos] = await conn.execute<RowDataPacket[]>(
        `SELECT t.id FROM asignacion_tarea a JOIN tarea t ON t.id = a.tarea_id
         WHERE a.persona_id = ? AND t.id <> ? AND t.fecha = ? AND t.hora_inicio < ? AND t.hora_fin > ? LIMIT 1`,
        [ministro.id, tarea.id, tarea.fecha, tarea.hora_fin, tarea.hora_inicio],
      );
      if (conflictos.length) throw new ErrorAsignacion(409, `${ministro.nombre} ya tiene una tarea asignada en ese horario`);
    }
    if (typeof entrada !== 'number') {
      const [result] = await conn.execute<ResultSetHeader>(
        'INSERT INTO tarea (fecha, hora_inicio, hora_fin, titulo, descripcion, evento_id) VALUES (?, ?, ?, ?, ?, ?)',
        [tarea.fecha, tarea.hora_inicio, tarea.hora_fin, tarea.titulo, tarea.descripcion, tarea.evento_id ?? null],
      );
      tarea.id = result.insertId;
    }
    for (const ministro of ministros) {
      const [asignacion] = await conn.execute<ResultSetHeader>(
        'INSERT IGNORE INTO asignacion_tarea (tarea_id, persona_id) VALUES (?, ?)', [tarea.id, ministro.id],
      );
      if (asignacion.affectedRows) {
        const [notificacion] = await conn.execute<ResultSetHeader>(
          "INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id) VALUES (?, CURDATE(), 'individual', ?)",
          [`Se te asignó la tarea: ${tarea.titulo}`, usuario.id],
        );
        await conn.execute('INSERT INTO persona_notificacion (persona_id, notificacion_id, leida) VALUES (?, ?, 0)', [ministro.id, notificacion.insertId]);
      }
      const [conteo] = await conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM asignacion_tarea a JOIN tarea t ON t.id = a.tarea_id
         WHERE a.persona_id = ? AND YEAR(t.fecha) = YEAR(?) AND MONTH(t.fecha) = MONTH(?)`,
        [ministro.id, tarea.fecha, tarea.fecha],
      );
      const total = Number(conteo[0].total);
      alertas.push({ persona_id: ministro.id, ministro_no_disponible: !ministro.disponible,
        tope_servicios_superado: total > TOPE_SERVICIOS_MES, servicios_en_el_mes: total, tope_servicios_mes: TOPE_SERVICIOS_MES });
    }
    return 'commit';
  });
  return { tarea, alertas };
}
