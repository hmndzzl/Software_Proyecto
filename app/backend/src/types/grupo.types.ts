// Coincide con la tabla `grupo` del schema
export interface Grupo {
  id: number;
  nombre: string;
}

// se usa para representar la info de un coordinador de grupo asignado
export interface CoordinadorGrupoInfo {
  id: number;
  nombre: string;
}

// se usa para devolver la info de un grupo junto con sus coordinadores
export interface GrupoConCoordinadores extends Grupo {
  coordinadores: CoordinadorGrupoInfo[];
}
