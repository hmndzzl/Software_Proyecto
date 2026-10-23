import { Request, Response } from 'express';
import db from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import { ROLES } from '../config/roles';
import { ESTADOS_RESERVA } from '../config/estadosReserva';
import { withTransaction } from '../utils/withTransaction';

export const crearReserva = async (req: Request, res: Response) => {
  const { fecha, hora_inicio, hora_fin, espacio_id, titulo, descripcion } = req.body;
  const { publico } = req.body;
  if (publico !== undefined && typeof publico !== 'boolean') {
    return res.status(HttpStatus.BAD_REQUEST).json({ message: 'publico debe ser un booleano' });
  }
  if (publico !== undefined && req.user!.rol_id !== ROLES.ADMIN && req.user!.rol_id !== ROLES.SACERDOTE) {
    return res.status(HttpStatus.FORBIDDEN).json({ message: 'No tienes permiso para configurar la agenda pública' });
  }

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

  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  const hoyStr = `${y}-${m}-${d}`;

  const hh = String(ahora.getHours()).padStart(2, '0');
  const mm = String(ahora.getMinutes()).padStart(2, '0');
  const horaActualStr = `${hh}:${mm}`;

  const fechaSoloFecha = fecha.split('T')[0];

  if (fechaSoloFecha < hoyStr) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      message: 'La fecha de la reserva no puede estar en el pasado'
    });
  }

  if (fechaSoloFecha === hoyStr && hora_inicio < horaActualStr) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      message: 'La hora de inicio no puede estar en el pasado'
    });
  }

  const solicitante_id = req.user!.id;

  try {
    await withTransaction(async (conn) => {
      const [conflictos]: any = await conn.query(
        `SELECT * FROM reserva
         WHERE espacio_id = ?
           AND fecha = ?
           AND estado_reserva_id = ?
           AND (hora_inicio < ? AND hora_fin > ?)`,
        [espacio_id, fecha, ESTADOS_RESERVA.CONFIRMADA, hora_fin, hora_inicio]
      );

      if (conflictos.length > 0) {
        res.status(HttpStatus.CONFLICT).json({
          message: 'No se puede crear la reserva porque ya existe una reserva aprobada para este espacio en el mismo horario'
        });
        return 'rollback';
      }

      const [resResult]: any = await conn.query(
        `INSERT INTO reserva (fecha, hora_inicio, hora_fin, espacio_id, estado_reserva_id, solicitante_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [fecha, hora_inicio, hora_fin, espacio_id, ESTADOS_RESERVA.PENDIENTE, solicitante_id]
      );

      const reservaId = resResult.insertId;

      await conn.query(
        `INSERT INTO evento (titulo, descripcion, encargado_id, reserva_id, publico) VALUES (?, ?, ?, ?, ?)`,
        [titulo, descripcion, solicitante_id, reservaId, publico === true ? 1 : 0]
      );

      // Avisa a quienes aprueban reservas (Sacerdote/Admin) que hay una solicitud nueva esperando,
      // salvo que el propio solicitante ya sea uno de ellos (no tiene sentido notificarse a sí mismo).
      const [aprobadores]: any = await conn.query(
        `SELECT id FROM persona WHERE rol_id IN (?, ?) AND id != ?`,
        [ROLES.SACERDOTE, ROLES.ADMIN, solicitante_id]
      );

      if (aprobadores.length > 0) {
        const mensajeNotificacion = `Nueva solicitud de reserva para el ${fecha} (${hora_inicio}–${hora_fin}) pendiente de tu aprobación.`;
        const [notifResult]: any = await conn.query(
          `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id) VALUES (?, CURDATE(), 'individual', ?)`,
          [mensajeNotificacion, solicitante_id]
        );
        for (const aprobador of aprobadores) {
          await conn.query(
            'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
            [aprobador.id, notifResult.insertId]
          );
        }
      }

      res.status(HttpStatus.CREATED).json({
        message: 'Solicitud de reserva y evento creados correctamente',
        reservaId
      });
      return 'commit';
    });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al crear la reserva'
    });
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

  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  const hoyStr = `${y}-${m}-${d}`;

  const hh = String(ahora.getHours()).padStart(2, '0');
  const mm = String(ahora.getMinutes()).padStart(2, '0');
  const horaActualStr = `${hh}:${mm}`;

  const fechaSoloFecha = fecha.split('T')[0];

  if (fechaSoloFecha < hoyStr) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      message: 'La fecha de la reserva no puede estar en el pasado'
    });
  }

  if (fechaSoloFecha === hoyStr && hora_inicio < horaActualStr) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      message: 'La hora de inicio no puede estar en el pasado'
    });
  }

  try {
    await withTransaction(async (conn) => {
      const [rows]: any = await conn.query('SELECT * FROM reserva WHERE id = ?', [id]);

      if (!rows || rows.length === 0) {
        res.status(HttpStatus.NOT_FOUND).json({ message: 'Reserva no encontrada' });
        return 'rollback';
      }

      const esSolicitante = rows[0].solicitante_id === req.user!.id;
      const esPrivilegiado = req.user!.rol_id === ROLES.ADMIN || req.user!.rol_id === ROLES.SACERDOTE;
      if (!esSolicitante && !esPrivilegiado) {
        res.status(HttpStatus.FORBIDDEN).json({ message: 'No tienes permiso para editar esta reserva' });
        return 'rollback';
      }

      await conn.query(
        `UPDATE reserva SET fecha = ?, hora_inicio = ?, hora_fin = ?, espacio_id = ?, estado_reserva_id = ? WHERE id = ?`,
        [fecha, hora_inicio, hora_fin, espacio_id, ESTADOS_RESERVA.PENDIENTE, id]
      );

      await conn.query(
        `UPDATE evento SET titulo = ?, descripcion = ? WHERE reserva_id = ?`,
        [titulo, descripcion, id]
      );

      // La edición resetea la reserva a Pendiente: los aprobadores necesitan saber que
      // hay (de nuevo) algo esperando su decisión, igual que al crear una solicitud nueva.
      const [aprobadores]: any = await conn.query(
        `SELECT id FROM persona WHERE rol_id IN (?, ?) AND id != ?`,
        [ROLES.SACERDOTE, ROLES.ADMIN, req.user!.id]
      );

      if (aprobadores.length > 0) {
        const mensajeNotificacion = `La reserva del ${fecha} (${hora_inicio}–${hora_fin}) fue editada y está pendiente de tu aprobación.`;
        const [notifResult]: any = await conn.query(
          `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id) VALUES (?, CURDATE(), 'individual', ?)`,
          [mensajeNotificacion, req.user!.id]
        );
        for (const aprobador of aprobadores) {
          await conn.query(
            'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
            [aprobador.id, notifResult.insertId]
          );
        }
      }

      res.status(HttpStatus.OK).json({
        message: 'Reserva actualizada. Vuelve a estado Pendiente para re-aprobación.'
      });
      return 'commit';
    });
  } catch (error) {
    console.error('Error al editar reserva:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al editar la reserva'
    });
  }
};

export const obtenerMisReservas = async (req: Request, res: Response) => {
  try {
    const solicitante_id = req.user!.id;

    const [reservas]: any = await db.query(
      `SELECT r.id, r.espacio_id, r.fecha, r.hora_inicio, r.hora_fin, r.estado_reserva_id,
              esp.nombre AS espacio_nombre,
              ev.id      AS evento_id,
              ev.titulo  AS evento_titulo,
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
             ev.id AS evento_id, ev.publico AS evento_publico,
             ev.descripcion AS evento_descripcion,
             p.nombre AS solicitante_nombre
      FROM reserva r
      LEFT JOIN espacio e ON e.id = r.espacio_id
      LEFT JOIN evento ev ON ev.reserva_id = r.id
      LEFT JOIN persona p ON p.id = r.solicitante_id
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
    const estadoReservaId = Number(estado_id);
    const estadosReservaValidos: number[] = [
      ESTADOS_RESERVA.PENDIENTE,
      ESTADOS_RESERVA.CONFIRMADA,
      ESTADOS_RESERVA.RECHAZADA,
      ESTADOS_RESERVA.CANCELADA,
    ];

    if (!estado_id) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Debe enviarse el estado_id'
      });
    }

    if (!estadosReservaValidos.includes(estadoReservaId)) {
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

    const esSolicitante = reserva.solicitante_id === req.user!.id;
    const esPrivilegiado = req.user!.rol_id === ROLES.ADMIN || req.user!.rol_id === ROLES.SACERDOTE;

    // Rechazar es una acción de un tercero sobre la reserva de otra persona. Si el propio
    // solicitante la envía (incluso siendo Admin/Sacerdote), en realidad es una cancelación:
    // debe usar CANCELADA. Esta validación aplica sin importar el privilegio del usuario.
    if (esSolicitante && estadoReservaId === ESTADOS_RESERVA.RECHAZADA) {
      return res.status(HttpStatus.FORBIDDEN).json({
        message: 'No puedes rechazar tu propia reserva, solo cancelarla'
      });
    }

    if (!esPrivilegiado) {
      if (!esSolicitante) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'No tienes permiso para modificar el estado de esta reserva'
        });
      }
      if (estadoReservaId !== ESTADOS_RESERVA.CANCELADA) {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'Solo puedes cancelar tu propia reserva'
        });
      }
      if (![ESTADOS_RESERVA.PENDIENTE, ESTADOS_RESERVA.CONFIRMADA].includes(reserva.estado_reserva_id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Solo puedes cancelar reservas en estado Pendiente o Confirmada'
        });
      }
    }

    if (estadoReservaId === ESTADOS_RESERVA.CONFIRMADA) {
      const [conflictos]: any = await db.query(
        `SELECT * FROM reserva
         WHERE espacio_id = ?
           AND fecha = ?
           AND estado_reserva_id = ?
           AND id <> ?
           AND (hora_inicio < ? AND hora_fin > ?)`,
        [reserva.espacio_id, reserva.fecha, ESTADOS_RESERVA.CONFIRMADA, id, reserva.hora_fin, reserva.hora_inicio]
      );

      if (conflictos.length > 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'No se puede aprobar la reserva porque el salón ya está ocupado en ese horario'
        });
      }
    }

    await db.query(
      'UPDATE reserva SET estado_reserva_id = ? WHERE id = ?',
      [estadoReservaId, id]
    );

    // Si quien cambió el estado no es el propio solicitante, se le notifica el resultado.
    if (reserva.solicitante_id != null && reserva.solicitante_id !== req.user!.id) {
      const verbos: Record<number, string> = {
        [ESTADOS_RESERVA.PENDIENTE]: 'vuelve a estar pendiente de aprobación',
        [ESTADOS_RESERVA.CONFIRMADA]: 'fue aprobada',
        [ESTADOS_RESERVA.RECHAZADA]: 'fue rechazada',
        [ESTADOS_RESERVA.CANCELADA]: 'fue cancelada',
      };
      const mensajeNotificacion = `Tu reserva del ${reserva.fecha} (${reserva.hora_inicio}–${reserva.hora_fin}) ${verbos[estadoReservaId]}.`;
      const fechaHoy = new Date().toISOString().split('T')[0];

      const [notifResult]: any = await db.query(
        `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id) VALUES (?, ?, 'individual', ?)`,
        [mensajeNotificacion, fechaHoy, req.user!.id]
      );
      await db.query(
        'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
        [reserva.solicitante_id, notifResult.insertId]
      );
    }

    const mensajes: Record<number, string> = {
      [ESTADOS_RESERVA.PENDIENTE]: 'Reserva marcada como pendiente nuevamente',
      [ESTADOS_RESERVA.CONFIRMADA]: 'Reserva aprobada correctamente',
      [ESTADOS_RESERVA.RECHAZADA]: 'Reserva rechazada correctamente',
      [ESTADOS_RESERVA.CANCELADA]: 'Reserva cancelada correctamente',
    };

    return res.status(HttpStatus.OK).json({
      message: mensajes[estadoReservaId]
    });
  } catch (error) {
    console.error('Error al cambiar estado de la reserva:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al actualizar el estado de la reserva'
    });
  }
};
