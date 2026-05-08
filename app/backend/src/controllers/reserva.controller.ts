import { Request, Response } from 'express';
import db from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import { ROLES } from '../config/roles';

export const crearReserva = async (req: Request, res: Response) => {
  const { fecha, hora_inicio, hora_fin, espacio_id, titulo, descripcion } = req.body;

  if (!fecha || !hora_inicio || !hora_fin || !espacio_id || !titulo || !descripcion) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      message: 'Faltan campos obligatorios (fecha, hora_inicio, hora_fin, espacio_id, titulo, descripcion)'
    });
  }

  if (hora_inicio >= hora_fin) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      message: 'La hora de inicio debe ser menor que la hora de fin'
    });
  }

  const solicitante_id = req.user!.id;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [resResult]: any = await conn.query(
      `INSERT INTO reserva (fecha, hora_inicio, hora_fin, espacio_id, estado_reserva_id, solicitante_id)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [fecha, hora_inicio, hora_fin, espacio_id, solicitante_id]
    );

    const reservaId = resResult.insertId;

    await conn.query(
      `INSERT INTO evento (titulo, descripcion, encargado_id, reserva_id) VALUES (?, ?, ?, ?)`,
      [titulo, descripcion, solicitante_id, reservaId]
    );

    await conn.commit();

    return res.status(HttpStatus.CREATED).json({
      message: 'Solicitud de reserva y evento creados correctamente',
      reservaId
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error al crear reserva:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al crear la reserva'
    });
  } finally {
    conn.release();
  }
};

export const editarReserva = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fecha, hora_inicio, hora_fin, espacio_id, titulo, descripcion } = req.body;

  if (!fecha || !hora_inicio || !hora_fin || !espacio_id || !titulo || !descripcion) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      message: 'Faltan campos obligatorios (fecha, hora_inicio, hora_fin, espacio_id, titulo, descripcion)'
    });
  }

  if (hora_inicio >= hora_fin) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      message: 'La hora de inicio debe ser menor que la hora de fin'
    });
  }

  const conn = await db.getConnection();

  try {
    const [rows]: any = await conn.query('SELECT * FROM reserva WHERE id = ?', [id]);

    if (!rows || rows.length === 0) {
      conn.release();
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Reserva no encontrada' });
    }

    const esSolicitante = rows[0].solicitante_id === req.user!.id;
    const esPrivilegiado = req.user!.rol_id === ROLES.ADMIN || req.user!.rol_id === ROLES.SACERDOTE;
    if (!esSolicitante && !esPrivilegiado) {
      conn.release();
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'No tienes permiso para editar esta reserva' });
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE reserva SET fecha = ?, hora_inicio = ?, hora_fin = ?, espacio_id = ?, estado_reserva_id = 1 WHERE id = ?`,
      [fecha, hora_inicio, hora_fin, espacio_id, id]
    );

    await conn.query(
      `UPDATE evento SET titulo = ?, descripcion = ? WHERE reserva_id = ?`,
      [titulo, descripcion, id]
    );

    await conn.commit();

    return res.status(HttpStatus.OK).json({
      message: 'Reserva actualizada. Vuelve a estado Pendiente para re-aprobación.'
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error al editar reserva:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al editar la reserva'
    });
  } finally {
    conn.release();
  }
};

export const obtenerMisReservas = async (req: Request, res: Response) => {
  try {
    const solicitante_id = req.user!.id;

    const [reservas]: any = await db.query(
      `SELECT r.id, r.fecha, r.hora_inicio, r.hora_fin, r.estado_reserva_id,
              esp.nombre AS espacio_nombre,
              ev.id      AS evento_id,
              ev.descripcion AS evento_descripcion
       FROM reserva r
       LEFT JOIN espacio esp ON esp.id = r.espacio_id
       LEFT JOIN evento  ev  ON ev.reserva_id = r.id
       WHERE r.solicitante_id = ?
       ORDER BY r.fecha DESC, r.hora_inicio DESC`,
      [solicitante_id]
    );

    return res.status(HttpStatus.OK).json(reservas);
  } catch (error) {
    console.error('Error al obtener mis reservas:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al obtener tus reservas'
    });
  }
};

export const obtenerReservas = async (req: Request, res: Response) => {
  try {
    const { espacio_id } = req.query;
    const filtro = espacio_id ? 'WHERE r.espacio_id = ?' : '';
    const params = espacio_id ? [Number(espacio_id)] : [];

    const [reservas]: any = await db.query(`
      SELECT r.id, r.fecha, r.hora_inicio, r.hora_fin, r.estado_reserva_id,
             r.espacio_id, r.solicitante_id,
             e.nombre AS espacio_nombre,
             ev.titulo AS evento_titulo,
             ev.descripcion AS evento_descripcion
      FROM reserva r
      LEFT JOIN espacio e ON e.id = r.espacio_id
      LEFT JOIN evento ev ON ev.reserva_id = r.id
      ${filtro}
      ORDER BY r.fecha ASC, r.hora_inicio ASC
    `, params);

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
