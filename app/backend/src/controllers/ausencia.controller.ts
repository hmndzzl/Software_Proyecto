import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import pool from '../config/db';
import { ROLES } from '../config/roles';
import { HttpStatus } from '../utils/httpStatus';
import { AusenciaCreada } from '../types/ausencia.types';

function esFecha(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1000-01-01') return false;
  const fecha = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === value;
}

// HU-31: la identidad se verifica contra la sesión y se completa desde la BD.
export const crearAusencia = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(HttpStatus.UNAUTHORIZED).json({ mensaje: 'Autenticación requerida' });
    return;
  }
  if (req.user.rol_id !== ROLES.MINISTRO) {
    res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Solo un ministro puede notificar su ausencia' });
    return;
  }
  const { ministro_id, fecha_inicio, fecha_fin } = req.body ?? {};
  const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
  const justificacion = typeof req.body?.justificacion === 'string' ? req.body.justificacion.trim() : '';
  if (!titulo || titulo.length > 255 || !justificacion || justificacion.length > 5000) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El título (máximo 255 caracteres) y la justificación (máximo 5000 caracteres) son obligatorios' });
    return;
  }
  if (!Number.isSafeInteger(ministro_id) || ministro_id <= 0 ||
      !esFecha(fecha_inicio) || !esFecha(fecha_fin) || fecha_inicio > fecha_fin) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Envía ministro_id entero positivo y fechas válidas YYYY-MM-DD con fecha_inicio <= fecha_fin' });
    return;
  }
  if (ministro_id !== req.user.id) {
    res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Solo puedes registrar tu propio periodo de ausencia' });
    return;
  }

  let conn: PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [ministros] = await conn.execute<RowDataPacket[]>(
      'SELECT id, nombre, correo FROM persona WHERE id = ? AND rol_id = ?',
      [ministro_id, ROLES.MINISTRO]
    );
    if (!ministros.length) {
      await conn.rollback();
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Ministro no encontrado' });
      return;
    }
    const [destinatarios] = await conn.execute<RowDataPacket[]>(
      'SELECT id FROM persona WHERE rol_id IN (?, ?)', [ROLES.COORDINADOR_MINISTROS, ROLES.SACERDOTE]
    );
    if (!destinatarios.length) {
      await conn.rollback();
      res.status(HttpStatus.CONFLICT).json({ mensaje: 'No hay coordinadores de ministros ni sacerdotes registrados para recibir la notificación' });
      return;
    }
    const { id, nombre, correo } = ministros[0];
    const mensaje = `${titulo}\n${nombre} (${correo}) notificó un periodo de ausencia del ${fecha_inicio} al ${fecha_fin}, ambos días incluidos.\nJustificación: ${justificacion}`;
    const [notificacion] = await conn.execute<ResultSetHeader>(
      "INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id) VALUES (?, CURDATE(), 'individual', ?)",
      [mensaje, ministro_id]
    );
    for (const destinatario of destinatarios) {
      await conn.execute('INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
        [destinatario.id, notificacion.insertId]);
    }
    const [resultado] = await conn.execute<ResultSetHeader>(
      'INSERT INTO periodo_ausencia (ministro_id, fecha_inicio, fecha_fin, notificacion_id, titulo, justificacion) VALUES (?, ?, ?, ?, ?, ?)',
      [ministro_id, fecha_inicio, fecha_fin, notificacion.insertId, titulo, justificacion]
    );
    await conn.commit();
    const ausencia: AusenciaCreada = {
      id: resultado.insertId, ministro_id, ministro: { id, nombre, correo },
      fecha_inicio, fecha_fin, titulo, justificacion, notificacion_id: notificacion.insertId,
    };
    res.status(HttpStatus.CREATED).json({ mensaje: 'Periodo de ausencia registrado; coordinadores de ministros y sacerdote notificados', ausencia });
  } catch (error) {
    if (conn) {
      try { await conn.rollback(); } catch (rollbackError) { console.error('Error al revertir ausencia:', rollbackError); }
    }
    console.error('Error en crearAusencia:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al registrar el periodo de ausencia' });
  } finally {
    conn?.release();
  }
};
