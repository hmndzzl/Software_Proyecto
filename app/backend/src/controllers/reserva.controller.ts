import { Request, Response } from 'express';
import { registrarDecision, type ResultadoDecision } from '../services/decisiones.service';
import { formatHorario } from '../utils/formatoHorario';
import db from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import { ROLES } from '../config/roles';
import { ESTADOS_RESERVA } from '../config/estadosReserva';
import { withTransaction } from '../utils/withTransaction';
import { CHECKIN_ANTICIPACION_MIN } from '../config/constants';
import { AHORA_GUATEMALA_SQL, obtenerFechaHoraGuatemala } from '../utils/horaGuatemala';
import { ErrorAforo, validarCantidadEsperada, validarCapacidad } from '../utils/aforo';

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

  const { hoy: hoyStr, horaActual: horaActualStr } = await obtenerFechaHoraGuatemala(db);

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
  let reservaCreada: number | undefined;

  try {
    const cantidad = validarCantidadEsperada(req.body.cantidad_personas) ?? null;
    await withTransaction(async (conn) => {
      await validarCapacidad(conn, Number(espacio_id), cantidad);
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
        `INSERT INTO reserva (fecha, hora_inicio, hora_fin, espacio_id, estado_reserva_id, solicitante_id, cantidad_personas)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [fecha, hora_inicio, hora_fin, espacio_id, ESTADOS_RESERVA.PENDIENTE, solicitante_id, cantidad]
      );

      const reservaId = resResult.insertId;

      await conn.query(
        `INSERT INTO evento (titulo, descripcion, encargado_id, reserva_id, publico) VALUES (?, ?, ?, ?, ?)`,
        [titulo, descripcion, solicitante_id, reservaId, publico === true ? 1 : 0]
      );

      // Toda solicitud queda pendiente, incluso cuando la crea uno de los aprobadores.
      const [aprobadores]: any = await conn.query(
        `SELECT id FROM persona WHERE rol_id IN (?, ?) AND estado_cuenta = 'activa'`,
        [ROLES.SACERDOTE, ROLES.ADMIN]
      );

      if (aprobadores.length > 0) {
        const mensajeNotificacion = `Nueva solicitud de reserva #${reservaId}: «${titulo}», para el ${fecha} (${formatHorario(hora_inicio, hora_fin)}). Pendiente de tu aprobación en Reservas.`;
        const [notifResult]: any = await conn.query(
          `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id) VALUES (?, DATE(UTC_TIMESTAMP() - INTERVAL 6 HOUR), 'individual', ?)`,
          [mensajeNotificacion, solicitante_id]
        );
        for (const aprobador of aprobadores) {
          await conn.query(
            'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
            [aprobador.id, notifResult.insertId]
          );
        }
      }

      reservaCreada = reservaId;
      return 'commit';
    });
    if (reservaCreada !== undefined) {
      return res.status(HttpStatus.CREATED).json({
        message: 'Solicitud de reserva y evento creados correctamente',
        reservaId: reservaCreada,
      });
    }
  } catch (error) {
    if (error instanceof ErrorAforo) return res.status(error.status).json({ message: error.message });
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

  const { hoy: hoyStr, horaActual: horaActualStr } = await obtenerFechaHoraGuatemala(db);

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
    const cantidadEnviada = validarCantidadEsperada(req.body.cantidad_personas);
    let guardada = false;
    await withTransaction(async (conn) => {
      const [rows]: any = await conn.query('SELECT * FROM reserva WHERE id = ? FOR UPDATE', [id]);

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

      if (String(rows[0].fecha).slice(0, 10) !== fechaSoloFecha) {
        const [vinculadas]: any = await conn.query(
          `SELECT t.id FROM tarea t JOIN evento e ON e.id = t.evento_id
           WHERE e.reserva_id = ? FOR UPDATE`, [id],
        );
        if (vinculadas.length) {
          res.status(HttpStatus.CONFLICT).json({ message: 'Desvincula y reprograma las tareas asociadas antes de cambiar el día de esta reserva' });
          return 'rollback';
        }
      }

      const cantidad = cantidadEnviada ?? rows[0].cantidad_personas ?? null;
      await validarCapacidad(conn, Number(espacio_id), cantidad);
      await conn.query(
        `UPDATE reserva SET fecha = ?, hora_inicio = ?, hora_fin = ?, espacio_id = ?, estado_reserva_id = ?, cantidad_personas = ? WHERE id = ?`,
        [fecha, hora_inicio, hora_fin, espacio_id, ESTADOS_RESERVA.PENDIENTE, cantidad, id]
      );

      await conn.query(
        `UPDATE evento SET titulo = ?, descripcion = ? WHERE reserva_id = ?`,
        [titulo, descripcion, id]
      );

      // La edición resetea la reserva a Pendiente: los aprobadores necesitan saber que
      // hay (de nuevo) algo esperando su decisión, igual que al crear una solicitud nueva.
      const [aprobadores]: any = await conn.query(
        `SELECT id FROM persona WHERE rol_id IN (?, ?) AND estado_cuenta = 'activa' AND id != ?`,
        [ROLES.SACERDOTE, ROLES.ADMIN, req.user!.id]
      );

      if (aprobadores.length > 0) {
        const mensajeNotificacion = `La reserva del ${fecha} (${formatHorario(hora_inicio, hora_fin)}) fue editada y está pendiente de tu aprobación.`;
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

      if (rows[0].estado_reserva_id !== undefined && rows[0].estado_reserva_id !== ESTADOS_RESERVA.PENDIENTE) {
        await registrarDecision(conn, 'reserva', Number(id), 'pendiente', req.user!.id);
      }
      guardada = true;
      return 'commit';
    });
    if (guardada) res.status(HttpStatus.OK).json({ message: 'Reserva actualizada. Vuelve a estado Pendiente para re-aprobación.' });
  } catch (error) {
    if (error instanceof ErrorAforo) return res.status(error.status).json({ message: error.message });
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
      `SELECT r.id, r.espacio_id, r.fecha, r.hora_inicio, r.hora_fin, r.estado_reserva_id, r.cantidad_personas, p.nombre AS solicitante_nombre,
              esp.nombre AS espacio_nombre,
              ev.id      AS evento_id,
              ev.titulo  AS evento_titulo,
              ev.descripcion AS evento_descripcion
       FROM reserva r
       LEFT JOIN espacio esp ON esp.id = r.espacio_id
       LEFT JOIN evento  ev  ON ev.reserva_id = r.id
       LEFT JOIN persona p ON p.id = r.solicitante_id
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
    const params = [ESTADOS_RESERVA.CONFIRMADA, ...(espacio_id ? [Number(espacio_id)] : [])];

    // HU-15: "en_uso" para que el calendario del espacio pueda resaltar la
    // reserva con check-in activo ahora mismo (mismo criterio que espacio.controller).
    const [reservas]: any = await db.query(`
      SELECT r.id, r.fecha, r.hora_inicio, r.hora_fin, r.estado_reserva_id, r.cantidad_personas,
             r.espacio_id, r.solicitante_id,
             DATE_FORMAT(r.checkin_en, '%Y-%m-%d %H:%i:%s') AS checkin_en,
             (r.checkin_en IS NOT NULL
              AND r.estado_reserva_id = ?
              AND r.fecha = DATE(${AHORA_GUATEMALA_SQL})
              AND TIME(${AHORA_GUATEMALA_SQL}) BETWEEN r.hora_inicio AND r.hora_fin
             ) AS en_uso,
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

    for (const r of reservas) {
      r.en_uso = Boolean(r.en_uso);
    }

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

    let aplicada = false;
    await withTransaction(async conn => {
      const [rows]: any = await conn.query(
        'SELECT * FROM reserva WHERE id = ? FOR UPDATE',
        [id]
      );

      if (!rows || rows.length === 0) {
        res.status(HttpStatus.NOT_FOUND).json({
          message: 'Reserva no encontrada'
        });
        return 'rollback';
      }

      const reserva = rows[0];

      const esSolicitante = reserva.solicitante_id === req.user!.id;
      const esPrivilegiado = req.user!.rol_id === ROLES.ADMIN || req.user!.rol_id === ROLES.SACERDOTE;

      // Rechazar es una acción de un tercero sobre la reserva de otra persona. Si el propio
      // solicitante la envía (incluso siendo Admin/Sacerdote), en realidad es una cancelación:
      // debe usar CANCELADA. Esta validación aplica sin importar el privilegio del usuario.
      if (esSolicitante && estadoReservaId === ESTADOS_RESERVA.RECHAZADA) {
        res.status(HttpStatus.FORBIDDEN).json({
          message: 'No puedes rechazar tu propia reserva, solo cancelarla'
        });
        return 'rollback';
      }

      if (!esPrivilegiado) {
        if (!esSolicitante) {
          res.status(HttpStatus.FORBIDDEN).json({
            message: 'No tienes permiso para modificar el estado de esta reserva'
          });
          return 'rollback';
        }
        if (estadoReservaId !== ESTADOS_RESERVA.CANCELADA) {
          res.status(HttpStatus.FORBIDDEN).json({
            message: 'Solo puedes cancelar tu propia reserva'
          });
          return 'rollback';
        }
        if (![ESTADOS_RESERVA.PENDIENTE, ESTADOS_RESERVA.CONFIRMADA].includes(reserva.estado_reserva_id)) {
          res.status(HttpStatus.BAD_REQUEST).json({
            message: 'Solo puedes cancelar reservas en estado Pendiente o Confirmada'
          });
          return 'rollback';
        }
      }

      if (estadoReservaId === ESTADOS_RESERVA.CONFIRMADA) {
        if (reserva.espacio_id === null) {
          res.status(HttpStatus.BAD_REQUEST).json({ message: 'El espacio de esta reserva fue eliminado. Selecciona otro espacio antes de aprobarla' });
          return 'rollback';
        }
        await validarCapacidad(conn, Number(reserva.espacio_id), reserva.cantidad_personas ?? null);
        const [conflictos]: any = await conn.query(
          `SELECT * FROM reserva
           WHERE espacio_id = ?
             AND fecha = ?
             AND estado_reserva_id = ?
             AND id <> ?
             AND (hora_inicio < ? AND hora_fin > ?)`,
          [reserva.espacio_id, reserva.fecha, ESTADOS_RESERVA.CONFIRMADA, id, reserva.hora_fin, reserva.hora_inicio]
        );

        if (conflictos.length > 0) {
          res.status(HttpStatus.BAD_REQUEST).json({
            message: 'No se puede aprobar la reserva porque el salón ya está ocupado en ese horario'
          });
          return 'rollback';
        }
      }

      await conn.query(
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
        const mensajeNotificacion = `Tu reserva del ${reserva.fecha} (${formatHorario(reserva.hora_inicio, reserva.hora_fin)}) ${verbos[estadoReservaId]}.`;
        const fechaHoy = new Date().toISOString().split('T')[0];

        const [notifResult]: any = await conn.query(
          `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id) VALUES (?, ?, 'individual', ?)`,
          [mensajeNotificacion, fechaHoy, req.user!.id]
        );
        await conn.query(
          'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
          [reserva.solicitante_id, notifResult.insertId]
        );
      }

      if (reserva.estado_reserva_id !== estadoReservaId) {
        const resultados: Record<number, ResultadoDecision> = {
          [ESTADOS_RESERVA.PENDIENTE]: 'pendiente', [ESTADOS_RESERVA.CONFIRMADA]: 'aprobada',
          [ESTADOS_RESERVA.RECHAZADA]: 'rechazada', [ESTADOS_RESERVA.CANCELADA]: 'cancelada',
        };
        await registrarDecision(conn, 'reserva', Number(id), resultados[estadoReservaId], req.user!.id);
      }
      aplicada = true;
      return 'commit';
    });
    if (!aplicada) return;
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
    if (error instanceof ErrorAforo) return res.status(error.status).json({ message: error.message });
    console.error('Error al cambiar estado de la reserva:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al actualizar el estado de la reserva'
    });
  }
};

// HU-15: check-in real de espacio vía QR. Permite confirmar presencia desde
// CHECKIN_ANTICIPACION_MIN minutos antes de hora_inicio hasta hora_fin — el estado
// "en uso" real (sin tolerancia) se calcula dinámicamente en espacio.controller.ts
// a partir de checkin_en, así que no hace falta liberar nada manualmente.
export const checkinReserva = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // checkin_en se formatea con DATE_FORMAT (mismo patrón que notificacion.enviado_en)
    // para que mysql2 no la reinterprete como Date con la zona horaria del servidor.
    const [rows]: any = await db.query(
      `SELECT id, solicitante_id, estado_reserva_id, espacio_id,
              DATE_FORMAT(checkin_en, '%Y-%m-%d %H:%i:%s') AS checkin_en
       FROM reserva WHERE id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Reserva no encontrada' });
    }

    const reserva = rows[0];

    const esSolicitante = reserva.solicitante_id === req.user!.id;
    const esPrivilegiado = req.user!.rol_id === ROLES.ADMIN || req.user!.rol_id === ROLES.SACERDOTE;

    if (!esSolicitante && !esPrivilegiado) {
      return res.status(HttpStatus.FORBIDDEN).json({
        message: 'No tienes permiso para hacer check-in de esta reserva'
      });
    }

    if (reserva.estado_reserva_id !== ESTADOS_RESERVA.CONFIRMADA) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Solo se puede hacer check-in de una reserva confirmada'
      });
    }

    if (reserva.espacio_id === null) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Esta reserva no tiene un salón asignado'
      });
    }

    if (reserva.checkin_en) {
      return res.status(HttpStatus.OK).json({
        message: 'Ya se había hecho check-in de esta reserva',
        checkin_en: reserva.checkin_en
      });
    }

    const anticipacion = `00:${String(CHECKIN_ANTICIPACION_MIN).padStart(2, '0')}:00`;
    const [ventana]: any = await db.query(
      `SELECT
         (fecha = DATE(${AHORA_GUATEMALA_SQL})
          AND hora_fin > TIME(${AHORA_GUATEMALA_SQL})
          AND SUBTIME(hora_inicio, ?) <= TIME(${AHORA_GUATEMALA_SQL})
         ) AS dentro_de_ventana
       FROM reserva WHERE id = ?`,
      [anticipacion, id]
    );

    if (!ventana[0].dentro_de_ventana) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: `El check-in solo está disponible desde ${CHECKIN_ANTICIPACION_MIN} minutos antes de que inicie la reserva hasta que termine`
      });
    }

    await db.query(`UPDATE reserva SET checkin_en = ${AHORA_GUATEMALA_SQL} WHERE id = ?`, [id]);

    const [actualizada]: any = await db.query(
      `SELECT DATE_FORMAT(checkin_en, '%Y-%m-%d %H:%i:%s') AS checkin_en FROM reserva WHERE id = ?`,
      [id]
    );

    return res.status(HttpStatus.OK).json({
      message: 'Check-in registrado correctamente',
      checkin_en: actualizada[0].checkin_en
    });
  } catch (error) {
    console.error('Error al hacer checkin de la reserva:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al hacer check-in de la reserva'
    });
  }
};
