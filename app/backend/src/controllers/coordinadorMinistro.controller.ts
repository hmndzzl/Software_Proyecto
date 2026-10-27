import { Request, Response } from 'express';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import { ROLES } from '../config/roles';
import { ESTADOS_CUENTA } from '../config/cuentas';
import { HttpStatus } from '../utils/httpStatus';

const idValido = (id: string) => /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));

export async function listarCoordinadores(_req: Request, res: Response): Promise<void> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id, nombre, estado_cuenta FROM persona WHERE rol_id = ? AND estado_cuenta = 'activa' ORDER BY nombre, id",
      [ROLES.COORDINADOR_MINISTROS],
    );
    res.status(HttpStatus.OK).json(rows);
  } catch (error) {
    console.error('Error al listar coordinadores:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'No se pudieron obtener los coordinadores' });
  }
}

export async function listarMinistrosAsignados(req: Request, res: Response): Promise<void> {
  if (!idValido(req.params.coordinadorId)) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El coordinador debe tener un identificador válido' });
    return;
  }
  try {
    const [coordinadores] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM persona WHERE id = ? AND rol_id = ? AND estado_cuenta = 'activa'",
      [Number(req.params.coordinadorId), ROLES.COORDINADOR_MINISTROS],
    );
    if (!coordinadores.length) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Coordinador de ministros no encontrado' });
      return;
    }
    // Las relaciones se conservan, pero el directorio solo muestra cuentas activas.
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre, p.correo, p.estado_cuenta
       FROM coordinador_ministro cm JOIN persona p ON p.id = cm.ministro_id
       WHERE cm.coordinador_id = ? AND p.estado_cuenta = 'activa' ORDER BY p.nombre, p.id`,
      [Number(req.params.coordinadorId)],
    );
    res.status(HttpStatus.OK).json(rows);
  } catch (error) {
    console.error('Error al listar ministros asignados:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'No se pudieron obtener los ministros asignados' });
  }
}

async function cambiarRelacion(req: Request, res: Response, asignar: boolean): Promise<void> {
  const { coordinadorId, ministroId } = req.params;
  if (!idValido(coordinadorId) || !idValido(ministroId)) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Los identificadores deben ser enteros positivos válidos' });
    return;
  }
  let conn: PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    // Bloqueo consistente: un cambio simultáneo de rol/estado no puede invalidar la asignación.
    const [personas] = await conn.execute<RowDataPacket[]>(
      'SELECT id, rol_id, estado_cuenta FROM persona WHERE id IN (?, ?) ORDER BY id FOR UPDATE',
      [Number(coordinadorId), Number(ministroId)],
    );
    const coordinador = personas.find(p => p.id === Number(coordinadorId));
    const ministro = personas.find(p => p.id === Number(ministroId));
    if (!coordinador || coordinador.rol_id !== ROLES.COORDINADOR_MINISTROS || !ministro) {
      await conn.rollback();
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Coordinador de ministros o persona no encontrados' });
      return;
    }
    if (asignar && (ministro.rol_id !== ROLES.MINISTRO
      || coordinador.estado_cuenta !== ESTADOS_CUENTA.ACTIVA
      || ministro.estado_cuenta !== ESTADOS_CUENTA.ACTIVA)) {
      await conn.rollback();
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Solo se pueden asignar ministros activos a coordinadores activos' });
      return;
    }
    if (asignar) {
      // La clave compuesta evita duplicados; no reemplaza relaciones con otros coordinadores.
      await conn.execute(
        `INSERT INTO coordinador_ministro (coordinador_id, ministro_id) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE ministro_id = VALUES(ministro_id)`,
        [Number(coordinadorId), Number(ministroId)],
      );
    } else {
      await conn.execute('DELETE FROM coordinador_ministro WHERE coordinador_id = ? AND ministro_id = ?',
        [Number(coordinadorId), Number(ministroId)]);
    }
    await conn.commit();
    res.status(HttpStatus.OK).json({ mensaje: asignar ? 'Ministro asignado al coordinador' : 'Relación retirada' });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error al gestionar relación coordinador-ministro:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'No se pudo actualizar la relación' });
  } finally {
    conn?.release();
  }
}

export const asignarMinistro = (req: Request, res: Response) => cambiarRelacion(req, res, true);
export const quitarMinistro = (req: Request, res: Response) => cambiarRelacion(req, res, false);
