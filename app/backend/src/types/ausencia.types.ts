export interface AusenciaCreateInput {
  ministro_id: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface AusenciaCreada extends AusenciaCreateInput {
  id: number;
  ministro: { id: number; nombre: string; correo: string };
  notificacion_id: number;
}
