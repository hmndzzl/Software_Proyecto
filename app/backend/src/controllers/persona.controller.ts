import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcryptjs';
import pool from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import { ROLES } from '../config/roles';

export const getCoordinadoresGrupo = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre
       FROM persona p
       WHERE p.rol_id = 3
       ORDER BY p.nombre ASC`
    );
    res.status(HttpStatus.OK).json(rows);
  } catch (error) {
    console.error('Error en getCoordinadoresGrupo:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      mensaje: 'Error al obtener los coordinadores de grupo',
    });
  }
};

// GET /api/personas — Coordinador de Ministros ve solo sus propios ministros
// (coordinador_ministro); cualquier otro rol autenticado ve el directorio completo.
export const getMinistros = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.rol_id === ROLES.COORDINADOR_MINISTROS) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT p.id, p.nombre, p.correo, p.disponible
         FROM persona p
         INNER JOIN coordinador_ministro cm ON cm.ministro_id = p.id
         WHERE cm.coordinador_id = ?
         ORDER BY p.nombre ASC`,
        [req.user.id]
      );
      res.status(HttpStatus.OK).json(rows);
      return;
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre, p.correo, p.disponible
       FROM persona p
       INNER JOIN rol r ON r.id = p.rol_id
       WHERE LOWER(TRIM(r.detalle)) = 'ministro'
       ORDER BY p.nombre ASC`
    );

    res.status(HttpStatus.OK).json(rows);
  } catch (error) {
    console.error('Error en getMinistros:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      mensaje: 'Error al obtener los ministros',
    });
  }
};

// GET /api/personas/:id — devuelve datos públicos de una persona (sin password)
export const getPersonaById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre, p.correo, p.rol_id, p.disponible, r.detalle AS rol_nombre
       FROM persona p
       JOIN rol r ON r.id = p.rol_id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Persona no encontrada' });
      return;
    }

    res.status(HttpStatus.OK).json(rows[0]);
  } catch (error) {
    console.error('Error en getPersonaById:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener la persona' });
  }
};

// PATCH /api/personas/:id/disponibilidad — marca/desmarca a un ministro como disponible
// No requiere ser el propio usuario, lo gestiona quien coordina ministros.
export const actualizarDisponibilidad = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { disponible } = req.body;

  if (typeof disponible !== 'boolean') {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El campo disponible (boolean) es requerido' });
    return;
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE persona SET disponible = ? WHERE id = ?',
      [disponible ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Persona no encontrada' });
      return;
    }

    res.status(HttpStatus.OK).json({
      mensaje: disponible ? 'Ministro marcado como disponible' : 'Ministro marcado como no disponible',
      id: Number(id),
      disponible,
    });
  } catch (error) {
    console.error('Error en actualizarDisponibilidad:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al actualizar la disponibilidad' });
  }
};

// PUT /api/personas/:id — editar perfil propio
// Campos editables: nombre, correo, password (opcional).
// rol_id: solo Admin puede modificarlo.
export const editarPerfil = async (req: Request, res: Response): Promise<void> => {
  const targetId = Number(req.params.id);
  const requesterId = req.user!.id;
  const requesterRol = req.user!.rol_id;

  // Solo el propio usuario o un Admin puede editar el perfil
  const esAdmin = requesterRol === ROLES.ADMIN;
  if (requesterId !== targetId && !esAdmin) {
    res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'No tienes permiso para editar este perfil' });
    return;
  }

  const { nombre, correo, password, rol_id } = req.body;

  // Al menos uno de los campos editables debe venir
  if (!nombre && !correo && !password && rol_id === undefined) {
    res.status(HttpStatus.BAD_REQUEST).json({
      mensaje: 'Debes enviar al menos un campo para actualizar: nombre, correo, password',
    });
    return;
  }

  // Solo Admin puede cambiar el rol
  if (rol_id !== undefined && !esAdmin) {
    res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Solo el administrador puede cambiar el rol' });
    return;
  }

  try {
    // Verificar que la persona existe
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id, nombre, correo, rol_id FROM persona WHERE id = ?',
      [targetId]
    );
    if (existing.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Persona no encontrada' });
      return;
    }

    // Si viene un correo nuevo, verificar que no esté en uso por OTRA persona
    if (correo) {
      const [correoRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM persona WHERE correo = ? AND id != ?',
        [correo, targetId]
      );
      if (correoRows.length > 0) {
        res.status(HttpStatus.CONFLICT).json({ mensaje: 'El correo ya está en uso por otra persona' });
        return;
      }
    }

    // Construir SET dinámico solo con los campos que llegaron
    const campos: string[]  = [];
    const valores: any[] = [];

    if (nombre) {
      campos.push('nombre = ?');
      valores.push(nombre);
    }
    if (correo) {
      campos.push('correo = ?');
      valores.push(correo);
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      campos.push('password = ?');
      valores.push(hashed);
    }
    if (rol_id !== undefined && esAdmin) {
      campos.push('rol_id = ?');
      valores.push(rol_id);
    }

    valores.push(targetId); // para el WHERE

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE persona SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Persona no encontrada' });
      return;
    }

    // Devolver datos actualizados (sin password)
    const [updated] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre, p.correo, p.rol_id, r.detalle AS rol_nombre
       FROM persona p JOIN rol r ON r.id = p.rol_id
       WHERE p.id = ?`,
      [targetId]
    );

    res.status(HttpStatus.OK).json({
      mensaje: 'Perfil actualizado correctamente',
      persona: updated[0],
    });
  } catch (error) {
    console.error('Error en editarPerfil:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al actualizar el perfil' });
  }
};