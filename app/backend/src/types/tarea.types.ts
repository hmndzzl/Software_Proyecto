// Coincide con la tabla `tarea` del schema
export interface Tarea {
  id: number;
  fecha: string;        // en formato: YYYY-MM-DD
  hora_inicio: string;  // en formato: HH:MM:SS
  hora_fin: string;
  descripcion: string;
}

export type TareaCreateInput = Omit<Tarea, 'id'>;

// se usa para manejar la asignación de tareas a personas
export interface Asignacion {
  tarea_id: number;
  persona_id: number;
}

// se usa para devolver la info de una tarea junto con las personas asignadas
export interface TareaConAsignados extends Tarea {
  asignados: AsignadoInfo[];
  persona_nombre?: string | null;
}

// se usa para representar la info de una persona asignada a una tarea, junto con su rol
export interface AsignadoInfo {
  persona_id: number;
  nombre: string;
  correo: string;
  rol: string;
}