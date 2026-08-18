import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/db';
import { ESTADOS_RESERVA } from '../config/estadosReserva';
import { HttpStatus } from '../utils/httpStatus';

export const getEventos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT e.id, e.descripcion, e.encargado_id, e.reserva_id,
              p.nombre  AS nombre_encargado,
              r.fecha, r.hora_inicio, r.hora_fin, r.estado_reserva_id,
              esp.nombre AS nombre_espacio
       FROM evento e
       JOIN persona p    ON p.id   = e.encargado_id
       JOIN reserva r    ON r.id   = e.reserva_id
       LEFT JOIN espacio esp ON esp.id = r.espacio_id
       ORDER BY r.fecha ASC, r.hora_inicio ASC`
    );
    res.status(HttpStatus.OK).json(rows);
  } catch (error) {
    console.error('Error en getEventos:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener los eventos' });
  }
};

export const getEventoById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT e.id, e.descripcion, e.encargado_id, e.reserva_id,
              p.nombre  AS nombre_encargado,
              r.fecha, r.hora_inicio, r.hora_fin, r.estado_reserva_id,
              esp.nombre AS nombre_espacio
       FROM evento e
       JOIN persona p    ON p.id   = e.encargado_id
       JOIN reserva r    ON r.id   = e.reserva_id
       LEFT JOIN espacio esp ON esp.id = r.espacio_id
       WHERE e.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Evento no encontrado' });
      return;
    }
    res.status(HttpStatus.OK).json(rows[0]);
  } catch (error) {
    console.error('Error en getEventoById:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener el evento' });
  }
};

// Retorna reservas confirmadas sin evento asignado, incluyendo el nombre del solicitante
export const getReservasDisponibles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT r.id, r.fecha, r.hora_inicio, r.hora_fin,
              r.solicitante_id,
              p.nombre  AS nombre_solicitante,
              esp.nombre AS nombre_espacio
       FROM reserva r
       JOIN persona p        ON p.id   = r.solicitante_id
       LEFT JOIN espacio esp ON esp.id = r.espacio_id
       LEFT JOIN evento e    ON e.reserva_id = r.id
       WHERE r.estado_reserva_id = ?
         AND e.id IS NULL
       ORDER BY r.fecha ASC, r.hora_inicio ASC`,
      [ESTADOS_RESERVA.CONFIRMADA]
    );
    res.status(HttpStatus.OK).json(rows);
  } catch (error) {
    console.error('Error en getReservasDisponibles:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener las reservas disponibles' });
  }
};

export const createEvento = async (req: Request, res: Response): Promise<void> => {
  const { descripcion, reserva_id } = req.body;

  if (!descripcion || !reserva_id) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Los campos descripcion y reserva_id son requeridos' });
    return;
  }

  try {
    const [reservas] = await pool.execute<RowDataPacket[]>(
      'SELECT id, estado_reserva_id, solicitante_id FROM reserva WHERE id = ?',
      [reserva_id]
    );

    if (reservas.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'La reserva indicada no existe' });
      return;
    }
    if (reservas[0].estado_reserva_id !== ESTADOS_RESERVA.CONFIRMADA) {
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Solo se pueden asociar eventos a reservas confirmadas' });
      return;
    }

    // El encargado es automáticamente quien hizo la solicitud de reserva
    const encargado_id = reservas[0].solicitante_id;

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO evento (descripcion, encargado_id, reserva_id) VALUES (?, ?, ?)',
      [descripcion, encargado_id, reserva_id]
    );

    res.status(HttpStatus.CREATED).json({
      mensaje: 'Evento creado exitosamente',
      evento: { id: result.insertId, descripcion, encargado_id, reserva_id }
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Esta reserva ya tiene un evento asignado' });
      return;
    }
    console.error('Error en createEvento:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al crear el evento' });
  }
};

// Solo se puede editar la descripción; el encargado queda fijo al solicitante de la reserva
export const updateEvento = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { descripcion } = req.body;

  if (!descripcion) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El campo descripcion es requerido' });
    return;
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE evento SET descripcion = ? WHERE id = ?',
      [descripcion, id]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Evento no encontrado' });
      return;
    }

    res.status(HttpStatus.OK).json({ mensaje: 'Evento actualizado exitosamente' });
  } catch (error) {
    console.error('Error en updateEvento:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al actualizar el evento' });
  }
};

export const deleteEvento = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM evento WHERE id = ?', [id]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Evento no encontrado' });
      return;
    }

    res.status(HttpStatus.NO_CONTENT).send();
  } catch (error) {
    console.error('Error en deleteEvento:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al eliminar el evento' });
  }
};
