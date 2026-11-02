export interface CoordinadorGrupoInfo {
  id: number;
  nombre: string;
}

export interface Grupo {
  id: number;
  nombre: string;
  coordinadores: CoordinadorGrupoInfo[];
}

export interface Persona {
  id: number;
  nombre: string;
}

export interface Evento {
  id: number;
  titulo?: string;
  estado_reserva_id?: number;
  publico?: 0 | 1 | boolean;
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
  enviado_en?: string | null;
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
  enviado_en?: string | null;
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
  enviado_en?: string | null;
  tipo: NotificacionTipo;
  grupo_id: number | null;
  evento_id: number | null;
  requiere_confirmacion: boolean;
  total_destinatarios: number;
  total_leidas: number;
  total_confirmaron: number;
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

export interface Reserva {
  cantidad_personas?: number | null;
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  espacio_id?: number | null;
  espacio_nombre?: string | null;
  estado_reserva_id: number;
  solicitante_id?: number;
  solicitante_nombre: string | null;
  evento_id?: number | null;
  evento_publico?: 0 | 1 | boolean;
  evento_titulo: string | null;
  evento_descripcion: string | null;
  checkin_en?: string | null;
  en_uso?: boolean;
}

export interface AsignadoInfo {
  persona_id: number;
  nombre: string;
  correo?: string;
  rol?: string;
}

export interface Tarea {
  id: number;
  evento_id?: number | null;
  titulo: string;
  descripcion: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  persona_nombre?: string | null;
  asignados: AsignadoInfo[];
}

export interface Ministro {
  periodo_activo?: boolean | number;
  ausencia_activa?: boolean | number;
  telefono?: string | null;
  id: number;
  nombre: string;
  correo: string;
  rol_id?: number;
  disponible?: boolean;
}
