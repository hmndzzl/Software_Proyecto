import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/db';
import type { PoolConnection } from 'mysql2/promise';
import { HttpStatus } from '../utils/httpStatus';
import { ROLES } from '../config/roles';
import { TOPE_SERVICIOS_MES } from '../config/constants';
import type { TareaCreateInput, TareaConAsignados, AsignadoInfo } from '../types/tarea.types';

// Manejo de get, post, put, delete para tareas y asignaciones
// Retorna todas las tareas con sus ministros asignados con GET /api/tareas
export const getTareas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fecha_inicio, fecha_fin, persona_id } = req.query;
    const tieneParametros = !!(fecha_inicio || fecha_fin || persona_id);

    let tareas: RowDataPacket[];

    if (!tieneParametros) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM tarea ORDER BY fecha, hora_inicio'
      );
      tareas = rows;
    } else {
      // Solo unimos con asignacion_tarea cuando se filtra por persona. Unir siempre
      // devolvia una fila por cada asignado, duplicando la tarea en el calendario.
      // La PK (tarea_id, persona_id) garantiza una sola fila por tarea en ese caso.
      let query = 'SELECT t.* FROM tarea t';
      if (persona_id) {
        query += ' JOIN asignacion_tarea at ON at.tarea_id = t.id';
      }

      const conditions: string[] = [];
      const values: any[] = [];

      if (fecha_inicio) {
        conditions.push('t.fecha >= ?');
        values.push(fecha_inicio);
      }
      if (fecha_fin) {
        conditions.push('t.fecha <= ?');
        values.push(fecha_fin);
      }
      if (persona_id) {
        conditions.push('at.persona_id = ?');
        values.push(Number(persona_id));
      }

      query += ' WHERE ' + conditions.join(' AND ');

      query += ' ORDER BY t.fecha, t.hora_inicio';

      const [rows] = await pool.execute<RowDataPacket[]>(query, values);
      tareas = rows;
    }

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
        return {
          ...(tarea as any),
          asignados,
          persona_nombre: (asignados[0] as AsignadoInfo | undefined)?.nombre ?? null,
        } as TareaConAsignados;
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

  if (hora_inicio >= hora_fin) {
    res.status(HttpStatus.BAD_REQUEST).json({
      mensaje: 'La hora de inicio debe ser menor que la hora de fin',
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

  if (hora_inicio >= hora_fin) {
    res.status(HttpStatus.BAD_REQUEST).json({
      mensaje: 'La hora de inicio debe ser menor que la hora de fin',
    });
    return;
  }

  try {
    const rolId = req.user!.rol_id;
    const esPrivilegiado = rolId === ROLES.ADMIN || rolId === ROLES.SACERDOTE;

    if (!esPrivilegiado) {
      if (rolId !== ROLES.COORDINADOR_MINISTROS) {
        res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'No tienes permiso para editar tareas' });
        return;
      }
      // Un coordinador de ministros solo puede editar tareas donde al menos uno de los
      // asignados actuales sea uno de sus propios ministros (coordinador_ministro).
      const [autorizado] = await pool.execute<RowDataPacket[]>(
        `SELECT 1
         FROM asignacion_tarea at
         INNER JOIN coordinador_ministro cm ON cm.ministro_id = at.persona_id
         WHERE at.tarea_id = ? AND cm.coordinador_id = ?
         LIMIT 1`,
        [id, req.user!.id]
      );
      if (autorizado.length === 0) {
        res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Solo puedes editar tareas de tus propios ministros asignados' });
        return;
      }
    }

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
// Asigna un ministro a una tarea e inserta notificación individual automáticamente.
// INSERT IGNORE evita error si la asignación ya existe.
export const asignarTarea = async (req: Request, res: Response): Promise<void> => {
  const { tarea_id, persona_id } = req.body;

  if (!tarea_id || !persona_id) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'tarea_id y persona_id son requeridos' });
    return;
  }

  let conn: PoolConnection | null = null;
  try {
    // Validaciones previas (sin transacción para evitar bloqueos innecesarios)
    const [tareas] = await pool.execute<RowDataPacket[]>(
      'SELECT id, descripcion, fecha, hora_inicio, hora_fin FROM tarea WHERE id = ?', [tarea_id]
    );
    if (tareas.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Tarea no encontrada' });
      return;
    }

    const [personas] = await pool.execute<RowDataPacket[]>(
      'SELECT id, disponible FROM persona WHERE id = ?', [persona_id]
    );
    if (personas.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Persona no encontrada' });
      return;
    }

    const tarea = tareas[0];

    // Alerta de rotación, no bloquea la asignación, solo informa.
    // ministro_no_disponible: fue marcado manualmente como no disponible (enfermo, permiso, etc.)
    // tope_servicios_superado: ya alcanzó/superó el tope de tareas del mes de la tarea asignada
    const ministroNoDisponible = !personas[0].disponible;

    const [conteoMes] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM asignacion_tarea at
       INNER JOIN tarea t ON t.id = at.tarea_id
       WHERE at.persona_id = ?
         AND YEAR(t.fecha) = YEAR(?) AND MONTH(t.fecha) = MONTH(?)`,
      [persona_id, tarea.fecha, tarea.fecha]
    );
    const serviciosPrevios = Number(conteoMes[0].total);

    const [conflictos] = await pool.execute<RowDataPacket[]>(
      `SELECT 1
       FROM asignacion_tarea at
       INNER JOIN tarea t ON t.id = at.tarea_id
       WHERE at.persona_id = ?
         AND t.fecha = ?
         AND t.hora_inicio < ?
         AND t.hora_fin > ?
       LIMIT 1`,
      [persona_id, tarea.fecha, tarea.hora_fin, tarea.hora_inicio]
    );
    if (conflictos.length > 0) {
      res.status(HttpStatus.CONFLICT).json({ mensaje: 'El ministro ya tiene una tarea asignada en ese horario' });
      return;
    }

    const descripcionTarea: string = (tareas[0] as any).descripcion;
    const remitenteId: number = req.user!.id;
    const hoy = new Date().toISOString().split('T')[0];

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1. Insertar asignación (IGNORE si ya existe)
    const [asignResult] = await conn.execute<ResultSetHeader>(
      'INSERT IGNORE INTO asignacion_tarea (tarea_id, persona_id) VALUES (?, ?)',
      [tarea_id, persona_id]
    );

    // 2. Solo notificar si la asignación fue nueva (affectedRows > 0)
    if (asignResult.affectedRows > 0) {
      const mensaje = `Se te asignó la tarea: ${descripcionTarea}`;

      const [notifResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id)
         VALUES (?, ?, 'individual', ?)`,
        [mensaje, hoy, remitenteId]
      );

      await conn.execute(
        'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
        [persona_id, notifResult.insertId]
      );
    }

    await conn.commit();

    const serviciosEnElMes = serviciosPrevios + (asignResult.affectedRows > 0 ? 1 : 0);

    res.status(HttpStatus.CREATED).json({
      mensaje: 'Asignación realizada correctamente',
      tarea_id,
      persona_id,
      alerta: {
        ministro_no_disponible: ministroNoDisponible,
        tope_servicios_superado: serviciosEnElMes > TOPE_SERVICIOS_MES,
        servicios_en_el_mes: serviciosEnElMes,
        tope_servicios_mes: TOPE_SERVICIOS_MES,
      },
    });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error en asignarTarea:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al realizar la asignación' });
  } finally {
    if (conn) conn.release();
  }
};

// Manejo del PUT /api/tareas/asignar — reasigna el responsable de una tarea de una persona a otra
// en una sola transacción (DELETE + INSERT), sin pasar por el flujo de solicitud/aceptación de HU-23.
// Pensado para que un coordinador cambie al responsable directamente, estilo "asignar" de Jira.
export const reasignarTarea = async (req: Request, res: Response): Promise<void> => {
  const { tarea_id, persona_actual_id, persona_nueva_id } = req.body;

  if (!tarea_id || !persona_actual_id || !persona_nueva_id) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'tarea_id, persona_actual_id y persona_nueva_id son requeridos' });
    return;
  }
  if (Number(persona_actual_id) === Number(persona_nueva_id)) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El nuevo responsable debe ser distinto al actual' });
    return;
  }

  let conn: PoolConnection | null = null;
  try {
    const [tareas] = await pool.execute<RowDataPacket[]>(
      'SELECT id, fecha, hora_inicio, hora_fin FROM tarea WHERE id = ?', [tarea_id]
    );
    if (tareas.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Tarea no encontrada' });
      return;
    }
    const tarea = tareas[0];

    const [asignaciones] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM asignacion_tarea WHERE tarea_id = ? AND persona_id = ?',
      [tarea_id, persona_actual_id]
    );
    if (asignaciones.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'La persona indicada no está asignada actualmente a esta tarea' });
      return;
    }

    const [personas] = await pool.execute<RowDataPacket[]>(
      'SELECT id, disponible FROM persona WHERE id = ?', [persona_nueva_id]
    );
    if (personas.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Persona no encontrada' });
      return;
    }

    // Misma alerta de rotación (no bloqueante) que asignarTarea, calculada para el nuevo responsable.
    const ministroNoDisponible = !personas[0].disponible;

    const [conteoMes] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM asignacion_tarea at
       INNER JOIN tarea t ON t.id = at.tarea_id
       WHERE at.persona_id = ?
         AND YEAR(t.fecha) = YEAR(?) AND MONTH(t.fecha) = MONTH(?)
         AND t.id <> ?`,
      [persona_nueva_id, tarea.fecha, tarea.fecha, tarea_id]
    );
    const serviciosEnElMes = Number(conteoMes[0].total) + 1;

    const [conflictos] = await pool.execute<RowDataPacket[]>(
      `SELECT 1
       FROM asignacion_tarea at
       INNER JOIN tarea t ON t.id = at.tarea_id
       WHERE at.persona_id = ?
         AND t.id <> ?
         AND t.fecha = ?
         AND t.hora_inicio < ?
         AND t.hora_fin > ?
       LIMIT 1`,
      [persona_nueva_id, tarea_id, tarea.fecha, tarea.hora_fin, tarea.hora_inicio]
    );
    if (conflictos.length > 0) {
      res.status(HttpStatus.CONFLICT).json({ mensaje: 'El nuevo responsable ya tiene una tarea asignada en ese horario' });
      return;
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.execute(
      'DELETE FROM asignacion_tarea WHERE tarea_id = ? AND persona_id = ?',
      [tarea_id, persona_actual_id]
    );
    await conn.execute(
      'INSERT IGNORE INTO asignacion_tarea (tarea_id, persona_id) VALUES (?, ?)',
      [tarea_id, persona_nueva_id]
    );

    await conn.commit();

    res.status(HttpStatus.OK).json({
      mensaje: 'Responsable reasignado correctamente',
      tarea_id: Number(tarea_id),
      persona_anterior_id: Number(persona_actual_id),
      persona_nueva_id: Number(persona_nueva_id),
      alerta: {
        ministro_no_disponible: ministroNoDisponible,
        tope_servicios_superado: serviciosEnElMes > TOPE_SERVICIOS_MES,
        servicios_en_el_mes: serviciosEnElMes,
        tope_servicios_mes: TOPE_SERVICIOS_MES,
      },
    });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error en reasignarTarea:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al reasignar la tarea' });
  } finally {
    if (conn) conn.release();
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
