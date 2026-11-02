import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/db';
import { withTransaction } from '../utils/withTransaction';
import { HttpStatus } from '../utils/httpStatus';
import type { CoordinadorGrupoInfo, GrupoConCoordinadores } from '../types/grupo.types';

async function adjuntarCoordinadores(grupos: RowDataPacket[]): Promise<GrupoConCoordinadores[]> {
  return Promise.all(
    grupos.map(async (grupo) => {
      const [coordinadores] = await pool.execute<RowDataPacket[]>(
        `SELECT p.id, p.nombre
         FROM grupo_coordinador gc
         JOIN persona p ON p.id = gc.coordinador_id
         WHERE gc.grupo_id = ?
         ORDER BY p.nombre`,
        [grupo.id]
      );
      return { ...grupo, coordinadores } as GrupoConCoordinadores;
    })
  );
}

// Valida que coordinador_ids venga como arreglo no vacío (400 si no), que todos los ids
// existan y estén activos (404 si no), y que ninguno coordine ya otro grupo (400 si no —
// un coordinador solo puede estar a cargo de un grupo a la vez). `grupoIdActual` excluye
// al propio grupo de esa última verificación cuando se está editando uno existente.
// Retorna los ids sin duplicados.
async function validarCoordinadorIds(coordinadorIds: unknown, grupoIdActual?: number): Promise<
  { ids: number[] } | { status: typeof HttpStatus.BAD_REQUEST | typeof HttpStatus.NOT_FOUND; mensaje: string }
> {
  if (!Array.isArray(coordinadorIds) || coordinadorIds.length === 0) {
    return { status: HttpStatus.BAD_REQUEST, mensaje: 'El campo coordinador_ids debe ser un arreglo con al menos un id' };
  }
  const ids = [...new Set(coordinadorIds.map((id) => Number(id)))];
  const [personas] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM persona WHERE id IN (${ids.map(() => '?').join(',')}) AND estado_cuenta = 'activa'`,
    ids
  );
  if (personas.length !== ids.length) {
    return { status: HttpStatus.NOT_FOUND, mensaje: 'Alguno de los coordinadores indicados no existe' };
  }

  const placeholders = ids.map(() => '?').join(',');
  const ocupadosQuery = grupoIdActual != null
    ? `SELECT coordinador_id FROM grupo_coordinador WHERE coordinador_id IN (${placeholders}) AND grupo_id <> ?`
    : `SELECT coordinador_id FROM grupo_coordinador WHERE coordinador_id IN (${placeholders})`;
  const ocupadosParams = grupoIdActual != null ? [...ids, grupoIdActual] : ids;
  const [ocupados] = await pool.execute<RowDataPacket[]>(ocupadosQuery, ocupadosParams);
  if (ocupados.length > 0) {
    return { status: HttpStatus.BAD_REQUEST, mensaje: 'Alguno de los coordinadores ya está a cargo de otro grupo' };
  }

  return { ids };
}

// get api/grupos retorna todos los grupos con sus coordinadores
export const getGrupos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT g.id, g.nombre FROM grupo g ORDER BY g.nombre ASC`
    );
    res.status(HttpStatus.OK).json(await adjuntarCoordinadores(rows));
  } catch (error) {
    console.error('Error en getGrupos:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener los grupos' });
  }
};

// el /api/grupos/:id retorna un grupo por ID con sus coordinadores
export const getGrupoById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT g.id, g.nombre FROM grupo g WHERE g.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Grupo no encontrado' });
      return;
    }

    const [grupoConCoordinadores] = await adjuntarCoordinadores(rows);
    res.status(HttpStatus.OK).json(grupoConCoordinadores);
  } catch (error) {
    console.error('Error en getGrupoById:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener el grupo' });
  }
};

// se crea el post /api/grupos para un nuevo grupo
export const createGrupo = async (req: Request, res: Response): Promise<void> => {
  const { nombre, coordinador_ids } = req.body;

  if (!nombre) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El campo nombre es requerido' });
    return;
  }

  try {
    const validacion = await validarCoordinadorIds(coordinador_ids);
    if ('status' in validacion) {
      res.status(validacion.status).json({ mensaje: validacion.mensaje });
      return;
    }

    let nuevoId = 0;
    await withTransaction(async (conn) => {
      const [result] = await conn.execute<ResultSetHeader>(
        'INSERT INTO grupo (nombre) VALUES (?)',
        [nombre]
      );
      nuevoId = result.insertId;
      for (const coordinadorId of validacion.ids) {
        await conn.execute(
          'INSERT INTO grupo_coordinador (grupo_id, coordinador_id) VALUES (?, ?)',
          [nuevoId, coordinadorId]
        );
      }
      return 'commit';
    });

    const [coordinadores] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre FROM grupo_coordinador gc JOIN persona p ON p.id = gc.coordinador_id WHERE gc.grupo_id = ? ORDER BY p.nombre`,
      [nuevoId]
    );
    res.status(HttpStatus.CREATED).json({
      mensaje: 'Grupo creado exitosamente',
      grupo: { id: nuevoId, nombre, coordinadores: coordinadores as CoordinadorGrupoInfo[] },
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Ya existe un grupo con ese nombre' });
      return;
    }
    console.error('Error en createGrupo:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al crear el grupo' });
  }
};

// se maneja el put api/grupos/:id el cual actualiza el nombre y/o los coordinadores de un grupo
export const updateGrupo = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { nombre, coordinador_ids } = req.body;

  if (!nombre) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El campo nombre es requerido' });
    return;
  }

  try {
    const validacion = await validarCoordinadorIds(coordinador_ids, Number(id));
    if ('status' in validacion) {
      res.status(validacion.status).json({ mensaje: validacion.mensaje });
      return;
    }

    let encontrado = true;
    await withTransaction(async (conn) => {
      const [grupos] = await conn.execute<RowDataPacket[]>('SELECT id FROM grupo WHERE id = ?', [id]);
      if (grupos.length === 0) {
        encontrado = false;
        return 'rollback';
      }
      await conn.execute('UPDATE grupo SET nombre = ? WHERE id = ?', [nombre, id]);
      await conn.execute('DELETE FROM grupo_coordinador WHERE grupo_id = ?', [id]);
      for (const coordinadorId of validacion.ids) {
        await conn.execute(
          'INSERT INTO grupo_coordinador (grupo_id, coordinador_id) VALUES (?, ?)',
          [id, coordinadorId]
        );
      }
      return 'commit';
    });

    if (!encontrado) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Grupo no encontrado' });
      return;
    }

    const [coordinadores] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre FROM grupo_coordinador gc JOIN persona p ON p.id = gc.coordinador_id WHERE gc.grupo_id = ? ORDER BY p.nombre`,
      [id]
    );
    res.status(HttpStatus.OK).json({
      mensaje: 'Grupo actualizado exitosamente',
      grupo: { id: Number(id), nombre, coordinadores: coordinadores as CoordinadorGrupoInfo[] },
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Ya existe un grupo con ese nombre' });
      return;
    }
    console.error('Error en updateGrupo:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al actualizar el grupo' });
  }
};

// El delete /api/grupos/:id elimina un grupo por ID (el ON DELETE CASCADE limpia grupo_coordinador)
export const deleteGrupo = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM grupo WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Grupo no encontrado' });
      return;
    }

    res.status(HttpStatus.NO_CONTENT).send();
  } catch (error) {
    console.error('Error en deleteGrupo:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al eliminar el grupo' });
  }
};
