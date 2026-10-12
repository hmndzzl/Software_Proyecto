export interface ContenidoLanding {
  nombre_parroquia: string;
  lema: string;
  titulo_principal: string;
  descripcion_principal: string;
  quienes_somos: { titulo: string; descripcion: string; mision: string; comunidad: string; servicio: string };
  cantidad_grupos: number;
  cantidad_espacios: number;
  valores_encabezado: { titulo: string; descripcion: string };
  valores: { titulo: string; descripcion: string }[];
  horarios_misa: { dias: string; horas: string[] }[];
  horarios_oficina: { dias: string; horario: string }[];
  contacto: { titulo: string; direccion: string; correo: string; telefono: string };
  texto_pie: string;
}

export type CambiosLanding = Partial<Pick<ContenidoLanding, 'cantidad_grupos' | 'cantidad_espacios'>> & {
  quienes_somos?: Partial<ContenidoLanding['quienes_somos']>;
  contacto?: Partial<ContenidoLanding['contacto']>;
};
