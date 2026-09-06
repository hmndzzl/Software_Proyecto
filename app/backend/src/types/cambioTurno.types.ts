// Coincide con la tabla `cambio_turno` del schema
export type CambioTurnoEstado = 'pendiente' | 'aceptado' | 'rechazado';

export interface CambioTurno {
  id: number;
  tarea_id: number;
  solicitante_id: number;
  destinatario_id: number;
  estado: CambioTurnoEstado;
  notificacion_id: number | null;
  fecha_solicitud: string; // YYYY-MM-DD
  fecha_respuesta: string | null;
}

export interface CambioTurnoCreateInput {
  tarea_id: number;
  destinatario_id: number;
}

// se usa en GET /api/cambios-turno, incluye info legible de la tarea y de ambas personas
export interface CambioTurnoConInfo extends CambioTurno {
  solicitante_nombre: string;
  destinatario_nombre: string;
  tarea_descripcion: string;
  tarea_fecha: string;
  tarea_hora_inicio: string;
  tarea_hora_fin: string;
}
