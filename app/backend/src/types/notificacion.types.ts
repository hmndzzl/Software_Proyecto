export type NotificacionTipo = 'global' | 'grupo' | 'individual';

export interface Notificacion {
  id: number;
  mensaje: string;
  fecha: string;
  tipo: NotificacionTipo;
  remitente_id: number | null;
  grupo_id: number | null;
}

export interface NotificacionConLeida extends Notificacion {
  leida: boolean;
  remitente_nombre: string | null;
}

export interface DestinatarioInfo {
  id: number;
  nombre: string;
  rol_id: number;
  rol_nombre: string;
}

export interface NotificacionCreateInput {
  mensaje: string;
  tipo: NotificacionTipo;
  grupo_id?: number | null;
  destinatarios: number[];
}
