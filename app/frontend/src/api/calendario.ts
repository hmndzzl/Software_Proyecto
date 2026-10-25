import apiClient from './client';
import type { Tarea } from '../types';

export type VistaCalendario = 'personal' | 'coordinacion' | 'parroquial';
export interface EventoCalendario {
  id: number;
  reserva_id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  encargado_id: number;
  nombre_encargado: string;
  nombre_espacio: string | null;
  estado_reserva_id: number;
  tareas: Tarea[];
}
export interface Calendario {
  eventos: EventoCalendario[];
  tareas: Tarea[];
}
export function consultarCalendario(inicio: string, fin: string, vista: VistaCalendario, personaId: string) {
  return apiClient.get<Calendario>('/api/calendario', {
    params: { fecha_inicio: inicio, fecha_fin: fin, vista, ...(vista === 'coordinacion' && personaId ? { persona_id: personaId } : {}) },
  });
}
