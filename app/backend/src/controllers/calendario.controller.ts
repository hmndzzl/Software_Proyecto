import type { Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { ROLES } from '../config/roles';
import { ESTADOS_RESERVA } from '../config/estadosReserva';
import { withTransaction } from '../utils/withTransaction';

function fechaValida(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export async function getCalendario(req: Request, res: Response): Promise<void> {
  const { fecha_inicio: inicio, fecha_fin: fin, vista = 'personal', persona_id: persona } = req.query;
  if (!fechaValida(inicio) || !fechaValida(fin) || inicio > fin
    || (Date.parse(fin) - Date.parse(inicio)) / 86_400_000 > 41
    || typeof vista !== 'string' || !['personal', 'coordinacion', 'parroquial'].includes(vista)) {
    res.status(400).json({ mensaje: 'Selecciona una vista válida y un período de hasta 42 días con fechas YYYY-MM-DD' });
    return;
  }
  const usuario = req.user!;
  const privilegiado = usuario.rol_id === ROLES.ADMIN || usuario.rol_id === ROLES.SACERDOTE;
  const coordinador = usuario.rol_id === ROLES.COORDINADOR_MINISTROS;
  if ((vista === 'coordinacion' && !privilegiado && !coordinador) || (persona !== undefined && vista !== 'coordinacion')) {
    res.status(403).json({ mensaje: 'No tienes permiso para consultar ese calendario' });
    return;
  }
  if (persona !== undefined && (typeof persona !== 'string' || !/^[1-9]\d*$/.test(persona) || !Number.isSafeInteger(Number(persona)))) {
    res.status(400).json({ mensaje: 'Selecciona un ministro válido' });
    return;
  }

  try {
    let respuesta: { eventos: RowDataPacket[]; tareas: RowDataPacket[] } = { eventos: [], tareas: [] };
    await withTransaction(async conn => {
      if (persona !== undefined) {
        const [permitidos] = await conn.execute<RowDataPacket[]>(
          `SELECT p.id FROM persona p WHERE p.id = ? AND p.rol_id = ? AND p.estado_cuenta = 'activa'
           ${coordinador ? 'AND EXISTS (SELECT 1 FROM coordinador_ministro cm WHERE cm.ministro_id = p.id AND cm.coordinador_id = ?)' : ''}`,
          coordinador ? [Number(persona), ROLES.MINISTRO, usuario.id] : [Number(persona), ROLES.MINISTRO],
        );
        if (!permitidos.length) {
          res.status(403).json({ mensaje: 'El ministro no está disponible en tu directorio' });
          return 'rollback';
        }
      }

      let tareas: RowDataPacket[] = [];
      if (vista !== 'parroquial') {
        const alcance = vista === 'personal'
          ? 'AND EXISTS (SELECT 1 FROM asignacion_tarea a WHERE a.tarea_id = t.id AND a.persona_id = ?)'
          : coordinador
            ? 'AND EXISTS (SELECT 1 FROM asignacion_tarea a JOIN coordinador_ministro cm ON cm.ministro_id = a.persona_id WHERE a.tarea_id = t.id AND cm.coordinador_id = ?)'
            : '';
        const [rows] = await conn.execute<RowDataPacket[]>(
          `SELECT t.* FROM tarea t WHERE t.fecha BETWEEN ? AND ? ${alcance} ORDER BY t.fecha, t.hora_inicio, t.id`,
          alcance ? [inicio, fin, usuario.id] : [inicio, fin],
        );
        tareas = rows.map(t => ({ ...t, asignados: [] })) as RowDataPacket[];
        if (tareas.length) {
          const filtro = vista === 'personal' ? 'AND a.persona_id = ?'
            : coordinador ? 'AND EXISTS (SELECT 1 FROM coordinador_ministro cm WHERE cm.ministro_id = a.persona_id AND cm.coordinador_id = ?)' : '';
          const [asignados] = await conn.execute<RowDataPacket[]>(
            `SELECT a.tarea_id, p.id AS persona_id, p.nombre FROM asignacion_tarea a
             JOIN persona p ON p.id = a.persona_id WHERE a.tarea_id IN (${tareas.map(() => '?').join(',')})
             ${filtro} ORDER BY p.nombre, p.id`,
            [...tareas.map(t => t.id), ...(filtro ? [usuario.id] : [])],
          );
          const porId = new Map(tareas.map(t => [t.id, t]));
          for (const a of asignados) porId.get(a.tarea_id)!.asignados.push({ persona_id: a.persona_id, nombre: a.nombre });
        }
      }

      const [eventos] = await conn.execute<RowDataPacket[]>(
        `SELECT e.id, e.titulo, e.descripcion, e.encargado_id, p.nombre AS nombre_encargado,
                r.fecha, r.hora_inicio, r.hora_fin, r.estado_reserva_id, esp.nombre AS nombre_espacio
         FROM evento e JOIN reserva r ON r.id = e.reserva_id
         JOIN persona p ON p.id = e.encargado_id LEFT JOIN espacio esp ON esp.id = r.espacio_id
         WHERE r.fecha BETWEEN ? AND ? ORDER BY r.fecha, r.hora_inicio, e.id`, [inicio, fin],
      );
      // Cancelar retira el compromiso completo de la agenda, sin borrar su historial.
      const cancelados = new Set(eventos.filter(e => e.estado_reserva_id === ESTADOS_RESERVA.CANCELADA).map(e => e.id));
      tareas = tareas.filter(t => !cancelados.has(t.evento_id));
      // El equipo autorizado se conserva completo en el detalle del evento,
      // aunque el filtro de coordinación seleccione a una sola persona.
      const filtradas = persona === undefined ? tareas : tareas.filter(t => t.asignados.some((a: { persona_id: number }) => a.persona_id === Number(persona)));
      const idsVinculados = new Set(filtradas.map(t => t.evento_id));
      const personaConsulta = vista === 'personal' ? usuario.id : persona === undefined ? null : Number(persona);
      // Sacerdote/Admin ven en su calendario personal, además de sus propios
      // compromisos, toda reserva pendiente de la parroquia en el rango consultado
      // — es la cola de aprobaciones que les toca resolver, con la fecha en la que
      // está planificada (no hace falta ir a otra pantalla a buscarla).
      const esPersonalPrivilegiado = vista === 'personal' && privilegiado;
      respuesta = {
        tareas: filtradas,
        eventos: eventos.filter(e => {
          if (e.estado_reserva_id === ESTADOS_RESERVA.CANCELADA) return false;
          if (vista === 'parroquial') return e.estado_reserva_id === ESTADOS_RESERVA.CONFIRMADA;
          if (esPersonalPrivilegiado && e.estado_reserva_id === ESTADOS_RESERVA.PENDIENTE) return true;
          if (personaConsulta !== null) return e.encargado_id === personaConsulta || idsVinculados.has(e.id);
          return [ESTADOS_RESERVA.PENDIENTE, ESTADOS_RESERVA.CONFIRMADA].includes(e.estado_reserva_id) || idsVinculados.has(e.id);
        }).map(e => ({ ...e, tareas: tareas.filter(t => t.evento_id === e.id) })) as RowDataPacket[],
      };
      return 'commit';
    });
    if (!res.headersSent) res.status(200).json(respuesta);
  } catch (error) {
    console.error('Error en getCalendario:', error);
    if (!res.headersSent) res.status(500).json({ mensaje: 'No se pudo cargar el calendario. Intenta nuevamente.' });
  }
}
