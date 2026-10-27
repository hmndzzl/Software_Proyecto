export interface PeriodoDisponibilidad {
  id: number;
  desde: string;
  hasta: string;
  origen: 'disponibilidad' | 'ausencia';
}

export interface AlertaDisponibilidad {
  persona_id?: number;
  ministro_no_disponible?: boolean;
  periodo_no_disponible?: boolean;
  ausencia_reportada?: boolean;
  tope_servicios_superado?: boolean;
  servicios_en_el_mes?: number;
  tope_servicios_mes?: number;
}

export function motivoIndisponibilidad(alerta: AlertaDisponibilidad): string {
  if (alerta.ausencia_reportada) return 'Tiene una ausencia reportada en la fecha de la tarea.';
  if (alerta.periodo_no_disponible) return 'Tiene un periodo no disponible que coincide con el horario de la tarea.';
  return 'Está marcado como no disponible.';
}
