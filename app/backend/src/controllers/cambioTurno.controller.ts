import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/db';
import type { PoolConnection } from 'mysql2/promise';
import { HttpStatus } from '../utils/httpStatus';
import type { CambioTurnoCreateInput, CambioTurnoConInfo } from '../types/cambioTurno.types';

// HU-23: permite a un ministro asignado a una tarea solicitar que otro ministro tome su lugar.
// Al aceptarse (responderCambioTurno) el titular de la tarea se actualiza automáticamente,
// sin intervención del coordinador de ministros.

// POST /api/cambios-turno
export const solicitarCambioTurno = async (req: Request, res: Response): Promise<void> => {
  const solicitanteId = req.user!.id;
  const { tarea_id, destinatario_id } = req.body as CambioTurnoCreateInput;

  if (!tarea_id || !destinatario_id) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'tarea_id y destinatario_id son requeridos' });
    return;
  }

  if (Number(destinatario_id) === Number(solicitanteId)) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'No puedes solicitar un cambio de turno contigo mismo' });
    return;
  }

  let conn: PoolConnection | null = null;
  try {
    const [tareas] = await pool.execute<RowDataPacket[]>(
      'SELECT id, titulo, descripcion, fecha, hora_inicio, hora_fin FROM tarea WHERE id = ?',
      [tarea_id]
    );
    if (tareas.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Tarea no encontrada' });
      return;
    }
    const tarea = tareas[0];

    // El solicitante debe ser el titular actual de la tarea; de paso obtenemos su nombre para el mensaje.
    const [asignaciones] = await pool.execute<RowDataPacket[]>(
      `SELECT p.nombre
       FROM asignacion_tarea at
       INNER JOIN persona p ON p.id = at.persona_id
       WHERE at.tarea_id = ? AND at.persona_id = ?`,
      [tarea_id, solicitanteId]
    );
    if (asignaciones.length === 0) {
      res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Solo el ministro asignado a la tarea puede solicitar un cambio de turno' });
      return;
    }
    const solicitanteNombre = asignaciones[0].nombre;

    const [destinatarios] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM persona WHERE id = ?',
      [destinatario_id]
    );
    if (destinatarios.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Ministro destinatario no encontrado' });
      return;
    }

    const [pendientes] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 FROM cambio_turno WHERE tarea_id = ? AND destinatario_id = ? AND estado = 'pendiente'`,
      [tarea_id, destinatario_id]
    );
    if (pendientes.length > 0) {
      res.status(HttpStatus.CONFLICT).json({ mensaje: 'Ya existe una solicitud de cambio de turno pendiente para este ministro en esta tarea' });
      return;
    }

    const [conflictos] = await pool.execute<RowDataPacket[]>(
      `SELECT 1
       FROM asignacion_tarea at
       INNER JOIN tarea t ON t.id = at.tarea_id
       WHERE at.persona_id = ?
         AND t.fecha = ?
         AND t.hora_inicio < ?
         AND t.hora_fin > ?
       LIMIT 1`,
      [destinatario_id, tarea.fecha, tarea.hora_fin, tarea.hora_inicio]
    );
    if (conflictos.length > 0) {
      res.status(HttpStatus.CONFLICT).json({ mensaje: 'El ministro destinatario ya tiene una tarea asignada en ese horario' });
      return;
    }

    const hoy = new Date().toISOString().split('T')[0];
    const horaInicio = String(tarea.hora_inicio).substring(0, 5);
    const horaFin = String(tarea.hora_fin).substring(0, 5);
    const mensaje = `${solicitanteNombre} te solicita un cambio de turno para la tarea: ${tarea.titulo} (${tarea.fecha} ${horaInicio}-${horaFin})`;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [notifResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id) VALUES (?, ?, 'individual', ?)`,
      [mensaje, hoy, solicitanteId]
    );
    await conn.execute(
      'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
      [destinatario_id, notifResult.insertId]
    );

    const [cambioResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO cambio_turno (tarea_id, solicitante_id, destinatario_id, estado, notificacion_id, fecha_solicitud)
       VALUES (?, ?, ?, 'pendiente', ?, ?)`,
      [tarea_id, solicitanteId, destinatario_id, notifResult.insertId, hoy]
    );

    await conn.commit();

    res.status(HttpStatus.CREATED).json({
      mensaje: 'Solicitud de cambio de turno enviada',
      cambio_turno: {
        id: cambioResult.insertId,
        tarea_id: Number(tarea_id),
        solicitante_id: solicitanteId,
        destinatario_id: Number(destinatario_id),
        estado: 'pendiente',
      },
    });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error en solicitarCambioTurno:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al solicitar el cambio de turno' });
  } finally {
    if (conn) conn.release();
  }
};

// GET /api/cambios-turno — solicitudes donde el usuario autenticado es solicitante o destinatario
export const getCambiosTurno = async (req: Request, res: Response): Promise<void> => {
  const personaId = req.user!.id;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ct.id, ct.tarea_id, ct.solicitante_id, ct.destinatario_id, ct.estado,
              ct.fecha_solicitud, ct.fecha_respuesta,
              s.nombre AS solicitante_nombre, d.nombre AS destinatario_nombre,
              t.titulo AS tarea_titulo, t.descripcion AS tarea_descripcion, t.fecha AS tarea_fecha,
              t.hora_inicio AS tarea_hora_inicio, t.hora_fin AS tarea_hora_fin
       FROM cambio_turno ct
       INNER JOIN persona s ON s.id = ct.solicitante_id
       INNER JOIN persona d ON d.id = ct.destinatario_id
       INNER JOIN tarea t   ON t.id = ct.tarea_id
       WHERE ct.solicitante_id = ? OR ct.destinatario_id = ?
       ORDER BY ct.fecha_solicitud DESC, ct.id DESC`,
      [personaId, personaId]
    );

    res.status(HttpStatus.OK).json(rows as CambioTurnoConInfo[]);
  } catch (error) {
    console.error('Error en getCambiosTurno:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener las solicitudes de cambio de turno' });
  }
};

// PUT /api/cambios-turno/:id/responder — el destinatario acepta o rechaza la solicitud.
// Al aceptar, actualiza automáticamente el titular de la tarea (asignacion_tarea), sin
// intervención del coordinador de ministros.
export const responderCambioTurno = async (req: Request, res: Response): Promise<void> => {
  const destinatarioId = req.user!.id;
  const { id } = req.params;
  const { aceptar } = req.body;

  if (typeof aceptar !== 'boolean') {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El campo aceptar (boolean) es requerido' });
    return;
  }

  let conn: PoolConnection | null = null;
  try {
    const [cambios] = await pool.execute<RowDataPacket[]>(
      'SELECT id, tarea_id, solicitante_id, destinatario_id, estado, notificacion_id FROM cambio_turno WHERE id = ?',
      [id]
    );
    if (cambios.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Solicitud de cambio de turno no encontrada' });
      return;
    }
    const cambio = cambios[0];

    if (Number(cambio.destinatario_id) !== Number(destinatarioId)) {
      res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Solo el ministro destinatario puede responder esta solicitud' });
      return;
    }
    if (cambio.estado !== 'pendiente') {
      res.status(HttpStatus.CONFLICT).json({ mensaje: 'Esta solicitud de cambio de turno ya fue respondida' });
      return;
    }

    const [tareas] = await pool.execute<RowDataPacket[]>(
      'SELECT id, titulo, descripcion, fecha, hora_inicio, hora_fin FROM tarea WHERE id = ?',
      [cambio.tarea_id]
    );
    if (tareas.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Tarea no encontrada' });
      return;
    }
    const tarea = tareas[0];
    const hoy = new Date().toISOString().split('T')[0];

    if (!aceptar) {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE cambio_turno SET estado = 'rechazado', fecha_respuesta = ? WHERE id = ?`,
        [hoy, id]
      );
      await marcarNotificacionLeida(conn, cambio.notificacion_id, destinatarioId);
      await notificarSolicitante(
        conn,
        cambio.solicitante_id,
        destinatarioId,
        hoy,
        `Tu solicitud de cambio de turno para la tarea "${tarea.titulo}" fue rechazada`
      );

      await conn.commit();
      res.status(HttpStatus.OK).json({ mensaje: 'Cambio de turno rechazado', tarea_id: cambio.tarea_id });
      return;
    }

    // Aceptar: revalidar que el solicitante sigue siendo el titular y que el destinatario
    // sigue sin conflicto de horario, ya que el estado pudo cambiar desde la solicitud.
    const [asignaciones] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM asignacion_tarea WHERE tarea_id = ? AND persona_id = ?',
      [cambio.tarea_id, cambio.solicitante_id]
    );
    if (asignaciones.length === 0) {
      res.status(HttpStatus.CONFLICT).json({ mensaje: 'El ministro solicitante ya no está asignado a esta tarea' });
      return;
    }

    const [conflictos] = await pool.execute<RowDataPacket[]>(
      `SELECT 1
       FROM asignacion_tarea at
       INNER JOIN tarea t ON t.id = at.tarea_id
       WHERE at.persona_id = ?
         AND t.id <> ?
         AND t.fecha = ?
         AND t.hora_inicio < ?
         AND t.hora_fin > ?
       LIMIT 1`,
      [destinatarioId, cambio.tarea_id, tarea.fecha, tarea.hora_fin, tarea.hora_inicio]
    );
    if (conflictos.length > 0) {
      res.status(HttpStatus.CONFLICT).json({ mensaje: 'No se puede aceptar: ya tienes otra tarea asignada en ese horario' });
      return;
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.execute(
      'DELETE FROM asignacion_tarea WHERE tarea_id = ? AND persona_id = ?',
      [cambio.tarea_id, cambio.solicitante_id]
    );
    await conn.execute(
      'INSERT IGNORE INTO asignacion_tarea (tarea_id, persona_id) VALUES (?, ?)',
      [cambio.tarea_id, destinatarioId]
    );
    await conn.execute(
      `UPDATE cambio_turno SET estado = 'aceptado', fecha_respuesta = ? WHERE id = ?`,
      [hoy, id]
    );
    await marcarNotificacionLeida(conn, cambio.notificacion_id, destinatarioId);
    await notificarSolicitante(
      conn,
      cambio.solicitante_id,
      destinatarioId,
      hoy,
      `Tu solicitud de cambio de turno para la tarea "${tarea.titulo}" fue aceptada`
    );

    await conn.commit();

    res.status(HttpStatus.OK).json({
      mensaje: 'Cambio de turno aceptado, titular actualizado automáticamente',
      tarea_id: cambio.tarea_id,
      nuevo_titular: destinatarioId,
    });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error en responderCambioTurno:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al responder la solicitud de cambio de turno' });
  } finally {
    if (conn) conn.release();
  }
};

async function marcarNotificacionLeida(conn: PoolConnection, notificacionId: number | null, personaId: number): Promise<void> {
  if (!notificacionId) return;
  await conn.execute(
    'UPDATE persona_notificacion SET leida = 1 WHERE notificacion_id = ? AND persona_id = ?',
    [notificacionId, personaId]
  );
}

async function notificarSolicitante(
  conn: PoolConnection,
  solicitanteId: number,
  remitenteId: number,
  fecha: string,
  mensaje: string
): Promise<void> {
  const [notifResult] = await conn.execute<ResultSetHeader>(
    `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id) VALUES (?, ?, 'individual', ?)`,
    [mensaje, fecha, remitenteId]
  );
  await conn.execute(
    'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
    [solicitanteId, notifResult.insertId]
  );
}
