import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import { ROLES } from '../config/roles';
import { ESTADOS_CUENTA, esEstadoCuenta } from '../config/cuentas';

import type { PoolConnection } from 'mysql2/promise';
import { withTransaction } from '../utils/withTransaction';
import { registrarDecision } from '../services/decisiones.service';

const ROLES_VALIDOS: number[] = Object.values(ROLES);

function parseId(valor: string): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/cuentas?estado=pendiente|activa|rechazada — por defecto, las pendientes.
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
        'UPDATE persona SET estado_cuenta = ?, rol_id = ? WHERE id = ? AND estado_cuenta <> ?',
        [ESTADOS_CUENTA.ACTIVA, rolId, id, ESTADOS_CUENTA.ACTIVA]
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
    if (aplicada) res.status(HttpStatus.OK).json({ mensaje: 'Cuenta aprobada' });
  } catch (error) {
    console.error('Error en aprobarCuenta:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al aprobar la cuenta' });
  }
};

// PATCH /api/cuentas/:id/rechazar — rechaza una cuenta pendiente o desactiva una activa (p. ej. la
// persona ya no está en la parroquia). Una rechazada puede aprobarse de nuevo después.
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

      // El estado va en el WHERE para que dos acciones simultáneas no se pisen.
      const [resultado] = await conn.execute<ResultSetHeader>(
        'UPDATE persona SET estado_cuenta = ? WHERE id = ? AND estado_cuenta IN (?, ?)',
        [ESTADOS_CUENTA.RECHAZADA, id, ESTADOS_CUENTA.PENDIENTE, ESTADOS_CUENTA.ACTIVA]
      );

      if (resultado.affectedRows === 0) {
        res.status(HttpStatus.CONFLICT).json({ mensaje: 'La cuenta ya está rechazada' });
        return 'rollback';
      }

      await notificarCambioCuenta(conn, id, req.user!.id, 'Tu cuenta fue rechazada. Si crees que es un error, contacta al administrador parroquial.');

      await registrarDecision(conn, 'cuenta', id, 'rechazada', req.user!.id);
      aplicada = true;
      return 'commit';
    });
    if (aplicada) res.status(HttpStatus.OK).json({ mensaje: 'Cuenta rechazada' });
  } catch (error) {
    console.error('Error en rechazarCuenta:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al rechazar la cuenta' });
  }
};

// Distingue "no existe" (404) de "ya estaba activa" (409).
async function responderCuentaYaActiva(conn: PoolConnection, id: number, res: Response): Promise<void> {
  const [rows] = await conn.execute<RowDataPacket[]>('SELECT id FROM persona WHERE id = ?', [id]);

  if (rows.length === 0) {
    res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Cuenta no encontrada' });
    return;
  }
  res.status(HttpStatus.CONFLICT).json({ mensaje: 'La cuenta ya está activa' });
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
