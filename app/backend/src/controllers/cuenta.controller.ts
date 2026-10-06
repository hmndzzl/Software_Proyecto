import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import { ROLES } from '../config/roles';
import { ESTADOS_CUENTA, esEstadoCuenta } from '../config/cuentas';

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
    // El estado va en el WHERE para que dos aprobaciones simultáneas no se pisen.
    const [resultado] = await pool.execute<ResultSetHeader>(
      'UPDATE persona SET estado_cuenta = ?, rol_id = ? WHERE id = ? AND estado_cuenta <> ?',
      [ESTADOS_CUENTA.ACTIVA, rolId, id, ESTADOS_CUENTA.ACTIVA]
    );

    if (resultado.affectedRows === 0) {
      await responderCuentaYaActiva(id, res);
      return;
    }

    res.status(HttpStatus.OK).json({ mensaje: 'Cuenta aprobada' });
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
    const [cuentas] = await pool.execute<RowDataPacket[]>(
      'SELECT rol_id, estado_cuenta FROM persona WHERE id = ?',
      [id]
    );
    if (cuentas.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Cuenta no encontrada' });
      return;
    }
    if (cuentas[0].rol_id === ROLES.ADMIN && req.user!.rol_id !== ROLES.ADMIN) {
      res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Solo un administrador puede rechazar la cuenta de otro administrador' });
      return;
    }

    // El estado va en el WHERE para que dos acciones simultáneas no se pisen.
    const [resultado] = await pool.execute<ResultSetHeader>(
      'UPDATE persona SET estado_cuenta = ? WHERE id = ? AND estado_cuenta IN (?, ?)',
      [ESTADOS_CUENTA.RECHAZADA, id, ESTADOS_CUENTA.PENDIENTE, ESTADOS_CUENTA.ACTIVA]
    );

    if (resultado.affectedRows === 0) {
      res.status(HttpStatus.CONFLICT).json({ mensaje: 'La cuenta ya está rechazada' });
      return;
    }

    res.status(HttpStatus.OK).json({ mensaje: 'Cuenta rechazada' });
  } catch (error) {
    console.error('Error en rechazarCuenta:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al rechazar la cuenta' });
  }
};

// Distingue "no existe" (404) de "ya estaba activa" (409).
async function responderCuentaYaActiva(id: number, res: Response): Promise<void> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM persona WHERE id = ?', [id]);

  if (rows.length === 0) {
    res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Cuenta no encontrada' });
    return;
  }
  res.status(HttpStatus.CONFLICT).json({ mensaje: 'La cuenta ya está activa' });
}
