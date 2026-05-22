import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import type { NotificacionConLeida, NotificacionCreateInput } from '../types/notificacion.types';

export const getNotificaciones = async (req: Request, res: Response): Promise<void> => {
  const personaId = req.user!.id;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT n.id, n.mensaje, n.fecha, n.tipo, n.remitente_id, n.grupo_id,
              pn.leida
       FROM notificacion n
       INNER JOIN persona_notificacion pn ON pn.notificacion_id = n.id
       WHERE pn.persona_id = ?
       ORDER BY n.fecha DESC`,
      [personaId]
    );

    res.status(HttpStatus.OK).json(rows as NotificacionConLeida[]);
  } catch (error) {
    console.error('Error en getNotificaciones:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener notificaciones' });
  }
};

export const marcarLeida = async (req: Request, res: Response): Promise<void> => {
  const personaId = req.user!.id;
  const { id } = req.params;
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE persona_notificacion
       SET leida = 1
       WHERE notificacion_id = ? AND persona_id = ?`,
      [id, personaId]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Notificación no encontrada para este usuario' });
      return;
    }

    res.status(HttpStatus.OK).json({ mensaje: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error en marcarLeida:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al marcar notificación como leída' });
  }
};

export const createNotificacion = async (req: Request, res: Response): Promise<void> => {
  const remitenteId = req.user!.id;
  const { mensaje, tipo, grupo_id, destinatarios } = req.body as NotificacionCreateInput;

  if (!mensaje || !tipo || !destinatarios || destinatarios.length === 0) {
    res.status(HttpStatus.BAD_REQUEST).json({
      mensaje: 'Campos requeridos: mensaje, tipo, destinatarios (array no vacío)',
    });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const fecha = new Date().toISOString().slice(0, 10);
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id, grupo_id)
       VALUES (?, ?, ?, ?, ?)`,
      [mensaje, fecha, tipo, remitenteId, grupo_id ?? null]
    );

    const notificacionId = result.insertId;

    for (const personaId of destinatarios) {
      await conn.execute(
        `INSERT IGNORE INTO persona_notificacion (persona_id, notificacion_id, leida)
         VALUES (?, ?, 0)`,
        [personaId, notificacionId]
      );
    }

    await conn.commit();

    res.status(HttpStatus.CREATED).json({
      mensaje: 'Notificación creada exitosamente',
      id: notificacionId,
      destinatarios: destinatarios.length,
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error en createNotificacion:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al crear notificación' });
  } finally {
    conn.release();
  }
};

export const deleteNotificacion = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM notificacion WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Notificación no encontrada' });
      return;
    }

    res.status(HttpStatus.NO_CONTENT).send();
  } catch (error) {
    console.error('Error en deleteNotificacion:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al eliminar notificación' });
  }
};
