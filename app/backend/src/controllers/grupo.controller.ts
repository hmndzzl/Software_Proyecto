import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/db';
import { HttpStatus } from '../utils/httpStatus';

// get api/grupos retorna todos los grupos con el nombre del coordinador
export const getGrupos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT g.id, g.nombre, g.coordinador_id, p.nombre AS nombre_coordinador
       FROM grupo g
       JOIN persona p ON p.id = g.coordinador_id
       ORDER BY g.nombre ASC`
    );
    res.status(HttpStatus.OK).json(rows);
  } catch (error) {
    console.error('Error en getGrupos:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener los grupos' });
  }
};

// el /api/grupos/:id tetorna un grupo por ID con el nombre del coordinador
export const getGrupoById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT g.id, g.nombre, g.coordinador_id, p.nombre AS nombre_coordinador
       FROM grupo g
       JOIN persona p ON p.id = g.coordinador_id
       WHERE g.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Grupo no encontrado' });
      return;
    }

    res.status(HttpStatus.OK).json(rows[0]);
  } catch (error) {
    console.error('Error en getGrupoById:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener el grupo' });
  }
};

// se crea el post /api/grupos para un nuevo grupo
export const createGrupo = async (req: Request, res: Response): Promise<void> => {
  const { nombre, coordinador_id } = req.body;

  if (!nombre || !coordinador_id) {
    res.status(HttpStatus.BAD_REQUEST).json({
      mensaje: 'Los campos nombre y coordinador_id son requeridos',
    });
    return;
  }

  try {
    // Verificar que el coordinador existe
    const [personas] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM persona WHERE id = ?',
      [coordinador_id]
    );

    if (personas.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'El coordinador indicado no existe' });
      return;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO grupo (nombre, coordinador_id) VALUES (?, ?)',
      [nombre, coordinador_id]
    );

    res.status(HttpStatus.CREATED).json({
      mensaje: 'Grupo creado exitosamente',
      grupo: {
        id: result.insertId,
        nombre,
        coordinador_id,
      },
    });
  } catch (error: any) {
    // Capturar violacion de unique key (nombre duplicado o coordinador ya asignado)
    if (error.code === 'ER_DUP_ENTRY') {
      const mensaje = error.message.includes('uq_grupo_nombre')
        ? 'Ya existe un grupo con ese nombre'
        : 'Este coordinador ya tiene un grupo asignado';
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje });
      return;
    }
    console.error('Error en createGrupo:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al crear el grupo' });
  }
};

// se maneja el put api/grupos/:id el cual actualiza el nombre o coordinador de un grupo
export const updateGrupo = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { nombre, coordinador_id } = req.body;

  if (!nombre || !coordinador_id) {
    res.status(HttpStatus.BAD_REQUEST).json({
      mensaje: 'Los campos nombre y coordinador_id son requeridos',
    });
    return;
  }

  try {
    // verifica que el coordinador existe
    const [personas] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM persona WHERE id = ?',
      [coordinador_id]
    );

    if (personas.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'El coordinador indicado no existe' });
      return;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE grupo SET nombre = ?, coordinador_id = ? WHERE id = ?',
      [nombre, coordinador_id, id]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Grupo no encontrado' });
      return;
    }

    res.status(HttpStatus.OK).json({
      mensaje: 'Grupo actualizado exitosamente',
      grupo: { id: Number(id), nombre, coordinador_id },
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      const mensaje = error.message.includes('uq_grupo_nombre')
        ? 'Ya existe un grupo con ese nombre'
        : 'Este coordinador ya tiene un grupo asignado';
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje });
      return;
    }
    console.error('Error en updateGrupo:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al actualizar el grupo' });
  }
};

// El delete /api/grupos/:id elimina un grupo por ID
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