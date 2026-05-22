import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import type { NotificacionConLeida } from '../types/notificacion.types';

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
