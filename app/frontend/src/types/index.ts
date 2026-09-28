export interface Grupo {
  id: number;
  nombre: string;
  coordinador_id: number;
  nombre_coordinador: string;
}

export interface Persona {
  id: number;
  nombre: string;
}

export interface Evento {
  id: number;
  descripcion: string;
  encargado_id: number;
  reserva_id: number;
  nombre_encargado: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  nombre_espacio: string | null;
}

export type NotificacionTipo = 'global' | 'grupo' | 'individual';

export interface Notificacion {
  id: number;
  mensaje: string;
  fecha: string;
  tipo: NotificacionTipo;
  remitente_id: number | null;
  remitente_nombre: string | null;
  grupo_id: number | null;
  leida: boolean;
  evento_id: number | null;
  evento_descripcion: string | null;
  requiere_confirmacion: boolean;
  asistencia_confirmada: boolean;
  motivo_excusa: string | null;
}

export interface NotificacionPapelera {
  id: number;
  mensaje: string;
  fecha: string;
  tipo: NotificacionTipo;
  remitente_id: number | null;
  remitente_nombre: string | null;
  grupo_id: number | null;
  leida: boolean;
  evento_id: number | null;
  evento_descripcion: string | null;
  requiere_confirmacion: boolean;
  eliminada_en: string;
}

export interface NotificacionEnviada {
  id: number;
  mensaje: string;
  fecha: string;
  tipo: NotificacionTipo;
  grupo_id: number | null;
  evento_id: number | null;
  requiere_confirmacion: boolean;
  total_destinatarios: number;
  total_leidas: number;
  destinatarios_nombres: string | null;
}

export interface DestinatarioInfo {
  id: number;
  nombre: string;
  rol_id: number;
  rol_nombre: string;
}

export interface ReservaDisponible {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  nombre_espacio: string | null;
  solicitante_id: number;
  nombre_solicitante: string;
}
