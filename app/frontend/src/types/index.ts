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

export interface ReservaDisponible {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  nombre_espacio: string | null;
  solicitante_id: number;
  nombre_solicitante: string;
}
