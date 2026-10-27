import type { RowDataPacket } from 'mysql2';
import type { Tarea } from '../types/tarea.types';

// Horas civiles de Guatemala, igual que tarea.fecha/hora_inicio/hora_fin.
export const DISPONIBILIDAD_TAREA_SQL = `
  EXISTS (SELECT 1 FROM disponibilidad_periodo d WHERE d.ministro_id = p.id
    AND d.desde < TIMESTAMP(?, ?) AND d.hasta > TIMESTAMP(?, ?)) AS periodo_no_disponible,
  EXISTS (SELECT 1 FROM periodo_ausencia a WHERE a.ministro_id = p.id
    AND a.fecha_inicio <= ? AND a.fecha_fin >= ?) AS ausencia_reportada`;

export function parametrosDisponibilidad(t: Pick<Tarea, 'fecha' | 'hora_inicio' | 'hora_fin'> | RowDataPacket) {
  return [t.fecha, t.hora_fin, t.fecha, t.hora_inicio, t.fecha, t.fecha];
}

export function alertaDisponibilidad(p: RowDataPacket | { disponible?: boolean | number; periodo_no_disponible?: number; ausencia_reportada?: number }) {
  return {
    ministro_no_disponible: !p.disponible || Boolean(p.periodo_no_disponible) || Boolean(p.ausencia_reportada),
    periodo_no_disponible: Boolean(p.periodo_no_disponible),
    ausencia_reportada: Boolean(p.ausencia_reportada),
  };
}
