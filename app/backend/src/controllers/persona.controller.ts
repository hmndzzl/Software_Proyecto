import { DISPONIBILIDAD_ACTUAL_SQL } from '../services/disponibilidad.service';
import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcryptjs';
import pool from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import { ROLES } from '../config/roles';
import { isClerkEnabled } from '../config/clerk';
import { sincronizarPerfilEnClerk } from '../services/clerkProfile.service';
import { withTransaction } from '../utils/withTransaction';
import { normalizarTelefono, guardarTelefono, TELEFONO_PRINCIPAL_SQL, ErrorTelefono, esTelefonoDuplicado } from '../utils/telefono';

export const getCoordinadoresGrupo = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre
       FROM persona p
       WHERE p.rol_id = 3 AND p.estado_cuenta = 'activa'
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
        `SELECT p.id, p.nombre, p.correo, p.disponible, ${DISPONIBILIDAD_ACTUAL_SQL}, ${TELEFONO_PRINCIPAL_SQL}
         FROM persona p
         INNER JOIN coordinador_ministro cm ON cm.ministro_id = p.id
         WHERE cm.coordinador_id = ? AND p.estado_cuenta = 'activa'
         ORDER BY p.nombre ASC`,
        [req.user.id]
      );
      res.status(HttpStatus.OK).json(rows);
      return;
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre, p.correo, p.disponible, ${DISPONIBILIDAD_ACTUAL_SQL}, ${TELEFONO_PRINCIPAL_SQL}
       FROM persona p
       INNER JOIN rol r ON r.id = p.rol_id
       WHERE LOWER(TRIM(r.detalle)) = 'ministro' AND p.estado_cuenta = 'activa'
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

// GET /api/personas/encargados-evento — lista las personas disponibles para reasignar un evento.
export const getEncargadosEvento = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id, nombre FROM persona WHERE estado_cuenta = 'activa' ORDER BY nombre ASC"
    );
    res.status(HttpStatus.OK).json(rows);
  } catch (error) {
    console.error('Error en getEncargadosEvento:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      mensaje: 'Error al obtener las personas encargadas',
    });
  }
};

// GET /api/personas/:id — devuelve datos públicos de una persona (sin password)
export const getPersonaById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre, p.correo, p.rol_id, p.disponible, r.detalle AS rol_nombre, ${TELEFONO_PRINCIPAL_SQL}
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
// Campos editables: nombre, correo, teléfono principal y password (opcionales). Si la persona está vinculada a Clerk,
// la nueva contraseña y el nuevo correo también se actualizan allá.
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
  if (!nombre && !correo && !password && rol_id === undefined && req.body.telefono === undefined) {
    res.status(HttpStatus.BAD_REQUEST).json({
      mensaje: 'Debes enviar al menos un campo para actualizar: nombre, correo, password, telefono',
    });
    return;
  }

  // Solo Admin puede cambiar el rol
  if (rol_id !== undefined && !esAdmin) {
    res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Solo el administrador puede cambiar el rol' });
    return;
  }

  try {
    const telefono = normalizarTelefono(req.body.telefono);
    // Verificar que la persona existe
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id, nombre, correo, rol_id, clerk_user_id FROM persona WHERE id = ?',
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

    if (req.body.telefono !== undefined && telefono) {
      const [duplicados] = await pool.execute<RowDataPacket[]>('SELECT id FROM telefono WHERE numero = ? AND persona_id <> ? LIMIT 1', [telefono, targetId]);
      if (duplicados.length) throw new ErrorTelefono(409, 'El teléfono ya está registrado en otra cuenta');
    }

    // Clerk guarda su propia contraseña y correo: se cambian primero allá, para que si los
    // rechaza (o no responde) no quede la BD distinta a lo que Clerk usa para iniciar sesión.
    if ((password || correo) && isClerkEnabled() && existing[0].clerk_user_id) {
      const correoCambio = correo && correo.toLowerCase() !== String(existing[0].correo).toLowerCase();
      const errorClerk = await sincronizarPerfilEnClerk(existing[0].clerk_user_id, {
        password: password || undefined,
        correoNuevo: correoCambio ? correo : undefined,
        correoAnterior: existing[0].correo,
      });
      if (errorClerk) {
        res.status(errorClerk.status).json({ mensaje: errorClerk.mensaje });
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

    if (req.body.telefono !== undefined) {
      await withTransaction(async conn => {
        // Bloquea la persona para serializar cambios del teléfono principal.
        await conn.execute('SELECT id FROM persona WHERE id = ? FOR UPDATE', [targetId]);
        if (campos.length) await conn.execute(`UPDATE persona SET ${campos.join(', ')} WHERE id = ?`, valores);
        await guardarTelefono(conn, targetId, telefono);
        return 'commit';
      });
    } else {
      const [result] = await pool.execute<ResultSetHeader>(`UPDATE persona SET ${campos.join(', ')} WHERE id = ?`, valores);
      if (result.affectedRows === 0) {
        res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Persona no encontrada' });
        return;
      }
    }

    // Devolver datos actualizados (sin password)
    const [updated] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre, p.correo, p.rol_id, r.detalle AS rol_nombre, ${TELEFONO_PRINCIPAL_SQL}
       FROM persona p JOIN rol r ON r.id = p.rol_id
       WHERE p.id = ?`,
      [targetId]
    );

    res.status(HttpStatus.OK).json({
      mensaje: 'Perfil actualizado correctamente',
      persona: updated[0],
    });
  } catch (error) {
    if (error instanceof ErrorTelefono || esTelefonoDuplicado(error)) {
      res.status(error instanceof ErrorTelefono ? error.status : 409).json({ mensaje: error instanceof ErrorTelefono ? error.message : 'El teléfono ya está registrado en otra cuenta' });
      return;
    }
    console.error('Error en editarPerfil:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al actualizar el perfil' });
  }
};
