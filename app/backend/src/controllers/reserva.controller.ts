import { Request, Response } from 'express';
import db from '../config/db';
import { HttpStatus } from '../utils/httpStatus';

export const crearReserva = async (req: Request, res: Response) => {
  try {
    const { fecha, hora_inicio, hora_fin, espacio_id } = req.body;

    if (!fecha || !hora_inicio || !hora_fin || !espacio_id) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Faltan campos obligatorios'
      });
    }

    if (hora_inicio >= hora_fin) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'La hora de inicio debe ser menor que la hora de fin'
      });
    }

    const [resultado]: any = await db.query(
      `INSERT INTO reserva (fecha, hora_inicio, hora_fin, espacio_id, estado_reserva_id)
       VALUES (?, ?, ?, ?, 1)`,
      [fecha, hora_inicio, hora_fin, espacio_id]
    );

    return res.status(HttpStatus.CREATED).json({
      message: 'Solicitud de reserva creada y enviada para aprobación',
      reservaId: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al crear la reserva'
    });
  }
};

export const obtenerReservas = async (_req: Request, res: Response) => {
  try {
    const [reservas]: any = await db.query(`
      SELECT r.id, r.fecha, r.hora_inicio, r.hora_fin, r.estado_reserva_id,
             e.nombre AS espacio_nombre
      FROM reserva r
      LEFT JOIN espacio e ON e.id = r.espacio_id
      ORDER BY r.fecha ASC, r.hora_inicio ASC
    `);

    return res.status(HttpStatus.OK).json(reservas);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al obtener las reservas'
    });
  }
};

export const obtenerReservaPorId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [rows]: any = await db.query(
      'SELECT * FROM reserva WHERE id = ?',
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'Reserva no encontrada'
      });
    }

    return res.status(HttpStatus.OK).json(rows[0]);
  } catch (error) {
    console.error('Error al obtener reserva:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al obtener la reserva'
    });
  }
};

export const cambiarEstadoReserva = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado_id } = req.body;

    if (!estado_id) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Debe enviarse el estado_id'
      });
    }

    if (![1, 2, 3].includes(Number(estado_id))) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'estado_id inválido'
      });
    }

    const [rows]: any = await db.query(
      'SELECT * FROM reserva WHERE id = ?',
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'Reserva no encontrada'
      });
    }

    const reserva = rows[0];

    if (Number(estado_id) === 2) {
      const [conflictos]: any = await db.query(
        `SELECT * FROM reserva
         WHERE espacio_id = ?
           AND fecha = ?
           AND estado_reserva_id = 2
           AND id <> ?
           AND (hora_inicio < ? AND hora_fin > ?)`,
        [reserva.espacio_id, reserva.fecha, id, reserva.hora_fin, reserva.hora_inicio]
      );

      if (conflictos.length > 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'No se puede aprobar la reserva porque el salón ya está ocupado en ese horario'
        });
      }
    }

    await db.query(
      'UPDATE reserva SET estado_reserva_id = ? WHERE id = ?',
      [estado_id, id]
    );

    const mensajes: Record<number, string> = {
      1: 'Reserva marcada como pendiente nuevamente',
      2: 'Reserva aprobada correctamente',
      3: 'Reserva rechazada correctamente',
    };

    return res.status(HttpStatus.OK).json({
      message: mensajes[Number(estado_id)] ?? 'Estado actualizado correctamente'
    });
  } catch (error) {
    console.error('Error al cambiar estado de la reserva:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al actualizar el estado de la reserva'
    });
  }
};
