import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/db';
import type { PoolConnection } from 'mysql2/promise';
import { HttpStatus } from '../utils/httpStatus';
import type { CambioTurnoCreateInput } from '../types/cambioTurno.types';

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
      'SELECT id, descripcion, fecha, hora_inicio, hora_fin FROM tarea WHERE id = ?',
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
    const mensaje = `${solicitanteNombre} te solicita un cambio de turno para la tarea: ${tarea.descripcion} (${tarea.fecha} ${horaInicio}-${horaFin})`;

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
