import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/db';
import { ROLES } from '../config/roles';

// Las fechas/horas de tarea son horas civiles de Guatemala (UTC-6).
const horaGuatemala = (date: Date) => new Date(date.getTime() - 6 * 3600_000).toISOString().slice(0, 19).replace('T', ' ');
interface Candidato extends RowDataPacket { tarea_id: number; persona_id: number }
interface Servicio extends RowDataPacket { titulo: string; fecha: string; hora_inicio: string; hora_fin: string }

export async function enviarRecordatorios(ahora = new Date()) {
  const desde = horaGuatemala(new Date(ahora.getTime() + 24 * 3600_000));
  const hasta = horaGuatemala(new Date(ahora.getTime() + 48 * 3600_000));
  const fechaEnvio = horaGuatemala(ahora).slice(0, 10);
  const [candidatos] = await pool.execute<Candidato[]>(
    `SELECT a.tarea_id, a.persona_id FROM asignacion_tarea a
     JOIN tarea t ON t.id = a.tarea_id JOIN persona p ON p.id = a.persona_id
     WHERE p.rol_id = ? AND p.estado_cuenta = 'activa'
       AND t.fecha BETWEEN DATE(?) AND DATE(?)
       AND TIMESTAMP(t.fecha, t.hora_inicio) BETWEEN ? AND ?
       AND NOT EXISTS (SELECT 1 FROM recordatorio_servicio r
         WHERE r.tarea_id = t.id AND r.persona_id = p.id AND r.fecha = t.fecha AND r.hora_inicio = t.hora_inicio)
     ORDER BY t.id, p.id`, [ROLES.MINISTRO, desde, hasta, desde, hasta]);
  const resultado = { enviados: 0, omitidos: 0, errores: 0 };
  for (const candidato of candidatos) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Revalidar y bloquear la asignación: puede cambiar entre la selección y el envío.
      const [servicios] = await conn.execute<Servicio[]>(
        `SELECT t.titulo, t.fecha, t.hora_inicio, t.hora_fin FROM tarea t
         JOIN asignacion_tarea a ON a.tarea_id = t.id JOIN persona p ON p.id = a.persona_id
         WHERE t.id = ? AND p.id = ? AND p.rol_id = ? AND p.estado_cuenta = 'activa'
           AND TIMESTAMP(t.fecha, t.hora_inicio) BETWEEN ? AND ? FOR UPDATE`,
        [candidato.tarea_id, candidato.persona_id, ROLES.MINISTRO, desde, hasta]);
      if (!servicios.length) {
        await conn.rollback();
        resultado.omitidos++;
        continue;
      }
      const servicio = servicios[0];
      // La clave única protege también cuando hay varios procesos del backend.
      await conn.execute(`INSERT INTO recordatorio_servicio (tarea_id, persona_id, fecha, hora_inicio) VALUES (?, ?, ?, ?)`,
        [candidato.tarea_id, candidato.persona_id, servicio.fecha, servicio.hora_inicio]);
      const mensaje = `Recordatorio de servicio: ${servicio.titulo}. Te corresponde el ${servicio.fecha} de ${servicio.hora_inicio.slice(0, 5)} a ${servicio.hora_fin.slice(0, 5)} (hora de Guatemala).`;
      const [notificacion] = await conn.execute<ResultSetHeader>(
        `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id) VALUES (?, ?, 'individual', NULL)`,
        [mensaje, fechaEnvio]);
      await conn.execute(`INSERT INTO persona_notificacion (persona_id, notificacion_id, leida) VALUES (?, ?, 0)`,
        [candidato.persona_id, notificacion.insertId]);
      await conn.commit();
      resultado.enviados++;
    } catch (error) {
      await conn.rollback();
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') resultado.omitidos++;
      else {
        resultado.errores++;
        console.error('No se pudo enviar recordatorio de servicio', candidato, error);
      }
    } finally { conn.release(); }
  }
  return resultado;
}
