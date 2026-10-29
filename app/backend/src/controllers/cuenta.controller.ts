import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import { ROLES } from '../config/roles';
import { ESTADOS_CUENTA, esEstadoCuenta } from '../config/cuentas';
import { enviarCorreoCuenta, EstadoCuentaCorreo } from '../services/email.service';

import type { PoolConnection } from 'mysql2/promise';
import { withTransaction } from '../utils/withTransaction';
import { registrarDecision } from '../services/decisiones.service';
import { AHORA_GUATEMALA_SQL } from '../utils/horaGuatemala';
import { ESTADOS_RESERVA } from '../config/estadosReserva';

const ROLES_VALIDOS: number[] = Object.values(ROLES);

function parseId(valor: string): number | null {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// GET /api/cuentas?estado=pendiente|activa|rechazada|baja — por defecto, las pendientes.
export const listarCuentas = async (req: Request, res: Response): Promise<void> => {
  const estado = req.query.estado ?? ESTADOS_CUENTA.PENDIENTE;

  if (!esEstadoCuenta(estado)) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Estado de cuenta inválido' });
    return;
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre, p.correo, p.rol_id, p.estado_cuenta
       FROM persona p
       WHERE p.estado_cuenta = ?
       ORDER BY p.nombre ASC`,
      [estado]
    );
    res.status(HttpStatus.OK).json(rows);
  } catch (error) {
    console.error('Error en listarCuentas:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener las cuentas' });
  }
};

// PATCH /api/cuentas/:id/aprobar — activa la cuenta y le asigna el rol elegido por quien aprueba.
// Admin y Sacerdote pueden aprobar; solo un Admin puede otorgar el rol de Admin.
export const aprobarCuenta = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id);
  const rolId = Number(req.body?.rol_id);

  if (id === null) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Id de cuenta inválido' });
    return;
  }
  if (!ROLES_VALIDOS.includes(rolId)) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Debes elegir un rol válido para la cuenta' });
    return;
  }
  if (rolId === ROLES.ADMIN && req.user!.rol_id !== ROLES.ADMIN) {
    res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Solo un administrador puede asignar el rol de Administrador' });
    return;
  }

  try {
    let aplicada = false;
    await withTransaction(async conn => {
      // El estado va en el WHERE para que dos aprobaciones simultáneas no se pisen.
      const [resultado] = await conn.execute<ResultSetHeader>(
        'UPDATE persona SET estado_cuenta = ?, rol_id = ? WHERE id = ? AND estado_cuenta IN (?, ?)',
        [ESTADOS_CUENTA.ACTIVA, rolId, id, ESTADOS_CUENTA.PENDIENTE, ESTADOS_CUENTA.RECHAZADA]
      );

      if (resultado.affectedRows === 0) {
        await responderCuentaYaActiva(conn, id, res);
        return 'rollback';
      }

      await notificarCambioCuenta(conn, id, req.user!.id, 'Tu cuenta fue aprobada. Ya puedes iniciar sesión.');

      await registrarDecision(conn, 'cuenta', id, 'aprobada', req.user!.id);
      aplicada = true;
      return 'commit';
    });
    if (aplicada) {
      void enviarCorreoCambioCuenta(id, 'aprobada');
      res.status(HttpStatus.OK).json({ mensaje: 'Cuenta aprobada' });
    }
  } catch (error) {
    console.error('Error en aprobarCuenta:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al aprobar la cuenta' });
  }
};

// PATCH /api/cuentas/:id/rechazar — rechaza una solicitud pendiente.
// No se puede rechazar la propia cuenta, y solo un Admin puede rechazar a otro Admin.
export const rechazarCuenta = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id);

  if (id === null) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Id de cuenta inválido' });
    return;
  }
  if (id === req.user!.id) {
    res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'No puedes rechazar tu propia cuenta' });
    return;
  }

  try {
    let aplicada = false;
    await withTransaction(async conn => {
      const [cuentas] = await conn.execute<RowDataPacket[]>(
        'SELECT rol_id, estado_cuenta FROM persona WHERE id = ? FOR UPDATE',
        [id]
      );
      if (cuentas.length === 0) {
        res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Cuenta no encontrada' });
        return 'rollback';
      }
      if (cuentas[0].rol_id === ROLES.ADMIN && req.user!.rol_id !== ROLES.ADMIN) {
        res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Solo un administrador puede rechazar la cuenta de otro administrador' });
        return 'rollback';
      }

      if (cuentas[0].estado_cuenta !== ESTADOS_CUENTA.PENDIENTE) {
        res.status(HttpStatus.CONFLICT).json({ mensaje: 'Solo se pueden rechazar cuentas pendientes' });
        return 'rollback';
      }
      // El estado va en el WHERE para que dos acciones simultáneas no se pisen.
      const [resultado] = await conn.execute<ResultSetHeader>(
        'UPDATE persona SET estado_cuenta = ? WHERE id = ? AND estado_cuenta = ?',
        [ESTADOS_CUENTA.RECHAZADA, id, ESTADOS_CUENTA.PENDIENTE]
      );

      if (resultado.affectedRows === 0) {
        res.status(HttpStatus.CONFLICT).json({ mensaje: 'Solo se pueden rechazar cuentas pendientes' });
        return 'rollback';
      }

      await notificarCambioCuenta(conn, id, req.user!.id, 'Tu cuenta fue rechazada. Si crees que es un error, contacta al administrador parroquial.');

      await registrarDecision(conn, 'cuenta', id, 'rechazada', req.user!.id);
      aplicada = true;
      return 'commit';
    });
    if (aplicada) {
      void enviarCorreoCambioCuenta(id, 'rechazada');
      res.status(HttpStatus.OK).json({ mensaje: 'Cuenta rechazada' });
    }
  } catch (error) {
    console.error('Error en rechazarCuenta:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al rechazar la cuenta' });
  }
};

// La baja conserva la persona y todas sus relaciones; se registra en la misma transacción.
export const darDeBajaCuenta = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Id de cuenta inválido' });
    return;
  }
  if (id === req.user!.id) {
    res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'No puedes eliminar tu propia cuenta' });
    return;
  }
  try {
    let aplicada = false;
    await withTransaction(async conn => {
      const [cuentas] = await conn.execute<RowDataPacket[]>(
        'SELECT rol_id, estado_cuenta, nombre FROM persona WHERE id = ? FOR UPDATE', [id],
      );
      if (!cuentas.length) {
        res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Cuenta no encontrada' });
        return 'rollback';
      }
      if (cuentas[0].rol_id === ROLES.ADMIN && req.user!.rol_id !== ROLES.ADMIN) {
        res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Solo un administrador puede eliminar la cuenta de otro administrador' });
        return 'rollback';
      }
      if (cuentas[0].estado_cuenta !== ESTADOS_CUENTA.ACTIVA) {
        res.status(HttpStatus.CONFLICT).json({ mensaje: 'Solo se pueden dar de baja cuentas activas' });
        return 'rollback';
      }
      await notificarCompromisosHuerfanos(conn, id, cuentas[0].rol_id, cuentas[0].nombre, req.user!.id);
      await conn.execute('UPDATE persona SET estado_cuenta = ? WHERE id = ?', [ESTADOS_CUENTA.BAJA, id]);
      await registrarDecision(conn, 'cuenta', id, 'baja', req.user!.id);
      aplicada = true;
      return 'commit';
    });
    if (aplicada) {
      void enviarCorreoCambioCuenta(id, 'desactivada');
      res.status(HttpStatus.OK).json({ mensaje: 'Cuenta dada de baja. Su historial se conserva.' });
    }
  } catch (error) {
    console.error('Error al dar de baja la cuenta:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'No se pudo dar de baja la cuenta' });
  }
};

// Distingue "no existe" (404) de "ya estaba activa" (409).
async function responderCuentaYaActiva(conn: PoolConnection, id: number, res: Response): Promise<void> {
  const [rows] = await conn.execute<RowDataPacket[]>('SELECT id FROM persona WHERE id = ?', [id]);

  if (rows.length === 0) {
    res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Cuenta no encontrada' });
    return;
  }
  res.status(HttpStatus.CONFLICT).json({ mensaje: 'Solo se pueden aprobar cuentas pendientes o rechazadas' });
}

// Avisa por correo: la persona aún no puede iniciar sesión, así que la notificación interna no la ve.
// No se espera desde el controlador ni lanza: un fallo de SMTP no debe afectar la respuesta, el cambio ya está guardado.
async function enviarCorreoCambioCuenta(personaId: number, estado: EstadoCuentaCorreo): Promise<void> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT correo, nombre FROM persona WHERE id = ?', [personaId]);
    if (rows.length === 0) return;
    await enviarCorreoCuenta(rows[0].correo, rows[0].nombre, estado);
  } catch (error) {
    console.error('Error en enviarCorreoCambioCuenta:', error);
  }
}

// Avisa al coordinador (o, si no tiene o no aplica, a Sacerdote/Admin) de las tareas
// y reservas futuras que la persona dada de baja deja sin seguimiento. La baja no las
// cancela ni reasigna (se conservan intactas); esto solo evita que pasen desapercibidas.
async function notificarCompromisosHuerfanos(
  conn: PoolConnection, personaId: number, rolId: number, nombrePersona: string, actorId: number,
): Promise<void> {
  const [tareas] = await conn.execute<RowDataPacket[]>(
    `SELECT t.titulo, t.fecha, t.hora_inicio FROM tarea t
     JOIN asignacion_tarea at ON at.tarea_id = t.id
     WHERE at.persona_id = ? AND t.fecha >= DATE(${AHORA_GUATEMALA_SQL})
     ORDER BY t.fecha, t.hora_inicio`,
    [personaId],
  );
  const [reservas] = await conn.execute<RowDataPacket[]>(
    `SELECT e.titulo, r.fecha FROM reserva r JOIN evento e ON e.reserva_id = r.id
     WHERE r.solicitante_id = ? AND r.fecha >= DATE(${AHORA_GUATEMALA_SQL})
       AND r.estado_reserva_id IN (?, ?)
     ORDER BY r.fecha, r.hora_inicio`,
    [personaId, ESTADOS_RESERVA.PENDIENTE, ESTADOS_RESERVA.CONFIRMADA],
  );
  if (!tareas.length && !reservas.length) return;

  const destinatarios = new Set<number>();
  if (rolId === ROLES.MINISTRO) {
    const [coordinadores] = await conn.execute<RowDataPacket[]>(
      `SELECT cm.coordinador_id FROM coordinador_ministro cm
       JOIN persona p ON p.id = cm.coordinador_id WHERE cm.ministro_id = ? AND p.estado_cuenta = 'activa'`,
      [personaId],
    );
    for (const c of coordinadores) destinatarios.add(c.coordinador_id);
  }
  if (destinatarios.size === 0) {
    const [aprobadores] = await conn.execute<RowDataPacket[]>(
      `SELECT id FROM persona WHERE rol_id IN (?, ?) AND estado_cuenta = 'activa' AND id != ?`,
      [ROLES.SACERDOTE, ROLES.ADMIN, actorId],
    );
    for (const a of aprobadores) destinatarios.add(a.id);
  }
  if (destinatarios.size === 0) return;

  const detalle = [
    ...tareas.map(t => `tarea "${t.titulo}" el ${t.fecha} ${String(t.hora_inicio).slice(0, 5)}`),
    ...reservas.map(r => `reserva "${r.titulo}" el ${r.fecha}`),
  ].join('; ');
  const mensaje = `${nombrePersona} fue dado de baja con compromisos futuros sin reasignar: ${detalle}. Revísalos en las pantallas correspondientes.`;

  const [notifResult] = await conn.execute<ResultSetHeader>(
    `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id) VALUES (?, DATE(${AHORA_GUATEMALA_SQL}), 'individual', ?)`,
    [mensaje, actorId],
  );
  for (const destinatarioId of destinatarios) {
    await conn.execute(
      'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
      [destinatarioId, notifResult.insertId],
    );
  }
}

// Notifica a la persona cuya cuenta cambió de estado. Queda en su bandeja aunque
// todavía no pueda iniciar sesión (p. ej. si estaba pendiente).
async function notificarCambioCuenta(conn: PoolConnection, personaId: number, remitenteId: number, mensaje: string): Promise<void> {
  const hoy = new Date().toISOString().split('T')[0];
  const [notifResult] = await conn.execute<ResultSetHeader>(
    `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id) VALUES (?, ?, 'individual', ?)`,
    [mensaje, hoy, remitenteId]
  );
  await conn.execute(
    'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
    [personaId, notifResult.insertId]
  );
}
