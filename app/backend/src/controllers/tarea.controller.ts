import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import type { TareaCreateInput, TareaConAsignados, AsignadoInfo } from '../types/tarea.types';

// Manejo de get, post, put, delete para tareas y asignaciones
// Retorna todas las tareas con sus ministros asignados con GET /api/tareas
export const getTareas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [tareas] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM tarea ORDER BY fecha, hora_inicio'
    );

    // Para cada tarea buscamos sus asignados con un JOIN
    const tareasConAsignados: TareaConAsignados[] = await Promise.all(
      tareas.map(async (tarea) => {
        const [asignados] = await pool.execute<RowDataPacket[]>(
          `SELECT p.id AS persona_id, p.nombre, p.correo, r.detalle AS rol
           FROM asignacion_tarea at2
           JOIN persona p ON p.id = at2.persona_id
           JOIN rol r     ON r.id = p.rol_id
           WHERE at2.tarea_id = ?`,
          [tarea.id]
        );
        return { ...(tarea as any), asignados } as TareaConAsignados;
      })
    );

    res.status(HttpStatus.OK).json(tareasConAsignados);
  } catch (error) {
    console.error('Error en getTareas:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener las tareas' });
  }
};

// manejo de get por id para obtener una tarea específica con sus asignados con GET /api/tareas/:id
export const getTareaById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM tarea WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Tarea no encontrada' });
      return;
    }

    const [asignados] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id AS persona_id, p.nombre, p.correo, r.detalle AS rol
       FROM asignacion_tarea at2
       JOIN persona p ON p.id = at2.persona_id
       JOIN rol r     ON r.id = p.rol_id
       WHERE at2.tarea_id = ?`,
      [id]
    );

    res.status(HttpStatus.OK).json({
      ...rows[0],
      asignados: asignados as AsignadoInfo[],
    });
  } catch (error) {
    console.error('Error en getTareaById:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener la tarea' });
  }
};

// Manejo de creación de tarea con POST /api/tareas
export const createTarea = async (req: Request, res: Response): Promise<void> => {
  const { fecha, hora_inicio, hora_fin, descripcion } = req.body as TareaCreateInput;

  if (!fecha || !hora_inicio || !hora_fin || !descripcion) {
    res.status(HttpStatus.BAD_REQUEST).json({
      mensaje: 'Todos los campos son requeridos: fecha, hora_inicio, hora_fin, descripcion',
    });
    return;
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO tarea (fecha, hora_inicio, hora_fin, descripcion) VALUES (?, ?, ?, ?)',
      [fecha, hora_inicio, hora_fin, descripcion]
    );

    res.status(HttpStatus.CREATED).json({
      mensaje: 'Tarea creada exitosamente',
      tarea: {
        id: result.insertId,
        fecha,
        hora_inicio,
        hora_fin,
        descripcion,
        asignados: [],
      },
    });
  } catch (error) {
    console.error('Error en createTarea:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al crear la tarea' });
  }
};

// manejo de PUT para actualizar una tarea con PUT /api/tareas/:id
export const updateTarea = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { fecha, hora_inicio, hora_fin, descripcion } = req.body as TareaCreateInput;

  if (!fecha || !hora_inicio || !hora_fin || !descripcion) {
    res.status(HttpStatus.BAD_REQUEST).json({
      mensaje: 'Todos los campos son requeridos: fecha, hora_inicio, hora_fin, descripcion',
    });
    return;
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE tarea SET fecha = ?, hora_inicio = ?, hora_fin = ?, descripcion = ? WHERE id = ?',
      [fecha, hora_inicio, hora_fin, descripcion, id]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Tarea no encontrada' });
      return;
    }

    res.status(HttpStatus.OK).json({
      mensaje: 'Tarea actualizada exitosamente',
      tarea: { id: Number(id), fecha, hora_inicio, hora_fin, descripcion },
    });
  } catch (error) {
    console.error('Error en updateTarea:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al actualizar la tarea' });
  }
};

// Manejo de eliminación de tarea con DELETE /api/tareas/:id
export const deleteTarea = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM tarea WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Tarea no encontrada' });
      return;
    }

    res.status(HttpStatus.NO_CONTENT).send();
  } catch (error) {
    console.error('Error en deleteTarea:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al eliminar la tarea' });
  }
};

// manejo de asignación de tarea a ministro con POST /api/tareas/asignar
// Asigna un ministro a una tarea. INSERT IGNORE evita error si ya existe
export const asignarTarea = async (req: Request, res: Response): Promise<void> => {
  const { tarea_id, persona_id } = req.body;

  if (!tarea_id || !persona_id) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'tarea_id y persona_id son requeridos' });
    return;
  }

  try {
    const [tareas] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM tarea WHERE id = ?', [tarea_id]
    );
    if (tareas.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Tarea no encontrada' });
      return;
    }

    const [personas] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM persona WHERE id = ?', [persona_id]
    );
    if (personas.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Persona no encontrada' });
      return;
    }

    await pool.execute(
      'INSERT IGNORE INTO asignacion_tarea (tarea_id, persona_id) VALUES (?, ?)',
      [tarea_id, persona_id]
    );

    res.status(HttpStatus.CREATED).json({
      mensaje: 'Asignación realizada correctamente',
      tarea_id,
      persona_id,
    });
  } catch (error) {
    console.error('Error en asignarTarea:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al realizar la asignación' });
  }
};

// Manejo del DELETE /api/tareas/asignar 
export const desasignarTarea = async (req: Request, res: Response): Promise<void> => {
  const { tarea_id, persona_id } = req.body;

  if (!tarea_id || !persona_id) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'tarea_id y persona_id son requeridos' });
    return;
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM asignacion_tarea WHERE tarea_id = ? AND persona_id = ?',
      [tarea_id, persona_id]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Asignación no encontrada' });
      return;
    }

    res.status(HttpStatus.NO_CONTENT).send();
  } catch (error) {
    console.error('Error en desasignarTarea:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al eliminar la asignación' });
  }
};