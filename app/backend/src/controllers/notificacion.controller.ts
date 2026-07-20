import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import { ROLES } from '../config/roles';
import type { NotificacionConLeida, NotificacionCreateInput, DestinatarioInfo } from '../types/notificacion.types';

// GET /api/notificaciones — notificaciones del usuario autenticado con nombre de remitente
export const getNotificaciones = async (req: Request, res: Response): Promise<void> => {
  const personaId = req.user!.id;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT n.id, n.mensaje, n.fecha, n.tipo, n.remitente_id, n.grupo_id,
              n.evento_id, n.requiere_confirmacion,
              pn.leida, pn.asistencia_confirmada,
              r.nombre AS remitente_nombre,
              ev.descripcion AS evento_descripcion
       FROM notificacion n
       INNER JOIN persona_notificacion pn ON pn.notificacion_id = n.id
       LEFT  JOIN persona r               ON r.id = n.remitente_id
       LEFT  JOIN evento ev               ON ev.id = n.evento_id
       WHERE pn.persona_id = ?
       ORDER BY n.fecha DESC`,
      [personaId]
    );

    res.status(HttpStatus.OK).json(rows as NotificacionConLeida[]);
  } catch (error) {
    console.error('Error en getNotificaciones:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener notificaciones' });
  }
};

// PUT /api/notificaciones/:id/leida
export const marcarLeida = async (req: Request, res: Response): Promise<void> => {
  const personaId = req.user!.id;
  const { id } = req.params;
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE persona_notificacion
       SET leida = 1
       WHERE notificacion_id = ? AND persona_id = ?`,
      [id, personaId]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Notificación no encontrada para este usuario' });
      return;
    }

    res.status(HttpStatus.OK).json({ mensaje: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error en marcarLeida:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al marcar notificación como leída' });
  }
};

// PUT /api/notificaciones/:id/asistencia — confirma asistencia al evento asociado a la notificación
export const confirmarAsistencia = async (req: Request, res: Response): Promise<void> => {
  const personaId = req.user!.id;
  const { id } = req.params;
  try {
    const [notifs] = await pool.execute<RowDataPacket[]>(
      `SELECT requiere_confirmacion FROM notificacion WHERE id = ?`,
      [id]
    );

    if (notifs.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Notificación no encontrada' });
      return;
    }
    if (!notifs[0].requiere_confirmacion) {
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Esta notificación no requiere confirmación de asistencia' });
      return;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE persona_notificacion
       SET asistencia_confirmada = 1, leida = 1
       WHERE notificacion_id = ? AND persona_id = ?`,
      [id, personaId]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Notificación no encontrada para este usuario' });
      return;
    }

    res.status(HttpStatus.OK).json({ mensaje: 'Asistencia confirmada' });
  } catch (error) {
    console.error('Error en confirmarAsistencia:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al confirmar asistencia' });
  }
};

// GET /api/notificaciones/destinatarios — personas a las que el usuario puede enviar notificaciones
// Admin/Sacerdote: todos | CoordMinistros: sus ministros | Otros: 403
export const getDestinatarios = async (req: Request, res: Response): Promise<void> => {
  const rolId = req.user!.rol_id;
  const userId = req.user!.id;

  try {
    let rows: RowDataPacket[];

    if (rolId === ROLES.ADMIN || rolId === ROLES.SACERDOTE) {
      [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT p.id, p.nombre, r.id AS rol_id, r.detalle AS rol_nombre
         FROM persona p
         INNER JOIN rol r ON r.id = p.rol_id
         ORDER BY r.id ASC, p.nombre ASC`
      );
    } else if (rolId === ROLES.COORDINADOR_MINISTROS) {
      [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT p.id, p.nombre, r.id AS rol_id, r.detalle AS rol_nombre
         FROM persona p
         INNER JOIN coordinador_ministro cm ON cm.ministro_id = p.id
         INNER JOIN rol r ON r.id = p.rol_id
         WHERE cm.coordinador_id = ?
         ORDER BY p.nombre ASC`,
        [userId]
      );
    } else {
      res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'No tienes permiso para enviar notificaciones' });
      return;
    }

    res.status(HttpStatus.OK).json(rows as DestinatarioInfo[]);
  } catch (error) {
    console.error('Error en getDestinatarios:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener destinatarios' });
  }
};

// POST /api/notificaciones — crear notificación
// Admin/Sacerdote: global (auto-todos) o individual (cualquier destinatario)
// CoordMinistros: individual solo a sus ministros
export const createNotificacion = async (req: Request, res: Response): Promise<void> => {
  const remitenteId = req.user!.id;
  const rolId      = req.user!.rol_id;
  const { mensaje, tipo, grupo_id, destinatarios, evento_id, requiere_confirmacion } = req.body as NotificacionCreateInput;

  if (!mensaje || !tipo) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Campos requeridos: mensaje, tipo' });
    return;
  }

  // CoordMinistros: solo tipo individual
  if (rolId === ROLES.COORDINADOR_MINISTROS && tipo !== 'individual') {
    res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Coordinador de ministros solo puede enviar notificaciones individuales' });
    return;
  }

  if (requiere_confirmacion && !evento_id) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Selecciona el evento al que aplica la confirmación de asistencia' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (evento_id) {
      const [eventos] = await conn.execute<RowDataPacket[]>('SELECT id FROM evento WHERE id = ?', [evento_id]);
      if (eventos.length === 0) {
        await conn.rollback();
        res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'El evento indicado no existe' });
        return;
      }
    }

    const fecha = new Date().toISOString().slice(0, 10);
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id, grupo_id, evento_id, requiere_confirmacion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [mensaje, fecha, tipo, remitenteId, grupo_id ?? null, evento_id ?? null, requiere_confirmacion ? 1 : 0]
    );

    const notificacionId = result.insertId;
    let ids: number[] = [];

    if (tipo === 'global') {
      // Auto-poblar con todos los usuarios del sistema
      const [personas] = await conn.execute<RowDataPacket[]>('SELECT id FROM persona');
      ids = (personas as RowDataPacket[]).map((p) => p.id as number);
    } else {
      // individual o grupo: requiere destinatarios
      if (!destinatarios || destinatarios.length === 0) {
        await conn.rollback();
        res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'destinatarios requeridos para tipo individual/grupo' });
        return;
      }

      // CoordMinistros: validar que todos los destinatarios sean sus ministros
      if (rolId === ROLES.COORDINADOR_MINISTROS) {
        const [mis] = await conn.execute<RowDataPacket[]>(
          `SELECT ministro_id FROM coordinador_ministro WHERE coordinador_id = ?`,
          [remitenteId]
        );
        const misIds = (mis as RowDataPacket[]).map((r) => r.ministro_id as number);
        const invalidos = destinatarios.filter((d) => !misIds.includes(d));
        if (invalidos.length > 0) {
          await conn.rollback();
          res.status(HttpStatus.FORBIDDEN).json({ mensaje: 'Solo puedes notificar a tus ministros asignados' });
          return;
        }
      }

      ids = destinatarios;
    }

    for (const personaId of ids) {
      await conn.execute(
        `INSERT IGNORE INTO persona_notificacion (persona_id, notificacion_id, leida)
         VALUES (?, ?, 0)`,
        [personaId, notificacionId]
      );
    }

    await conn.commit();

    res.status(HttpStatus.CREATED).json({
      mensaje: 'Notificación creada exitosamente',
      id: notificacionId,
      destinatarios: ids.length,
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error en createNotificacion:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al crear notificación' });
  } finally {
    conn.release();
  }
};

// DELETE /api/notificaciones/:id — solo Admin/Sacerdote
export const deleteNotificacion = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM notificacion WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Notificación no encontrada' });
      return;
    }

    res.status(HttpStatus.NO_CONTENT).send();
  } catch (error) {
    console.error('Error en deleteNotificacion:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al eliminar notificación' });
  }
};
