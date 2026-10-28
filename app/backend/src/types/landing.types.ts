export const CLAVES_IMAGENES_LANDING = [
  'hero', 'quienes_1', 'quienes_2', 'quienes_3', 'historia_1', 'historia_2', 'historia_3', 'entrada',
] as const;
export type ClaveImagenLanding = typeof CLAVES_IMAGENES_LANDING[number];
// Fotos válidas en el contenido: las subidas desde el panel y las incluidas en el despliegue (media/landing).
export const URL_IMAGEN_LANDING = /^\/uploads\/landing\/(?:subidas\/)?[a-z0-9-]+\.webp$/;
// Solo estas se pueden borrar del disco: las del despliegue nunca se eliminan.
export const URL_SUBIDA_LANDING = /^\/uploads\/landing\/subidas\/[a-f0-9-]{36}\.webp$/;

export interface ContenidoLanding {
  nombre_parroquia: string;
  lema: string;
  titulo_principal: string;
  descripcion_principal: string;
  quienes_somos: { titulo: string; descripcion: string; mision: string; comunidad: string; servicio: string };
  cantidad_grupos: number;
  cantidad_espacios: number;
  valores_encabezado: { titulo: string; descripcion: string };
  valores: { titulo: string; descripcion: string; imagen?: string }[];
  horarios_misa: { dias: string; horas: string[] }[];
  horarios_oficina: { dias: string; horario: string }[];
  contacto: { titulo: string; direccion: string; correo: string; telefono: string };
  historia: {
    titulo: string;
    descripcion: string;
    tarjetas: { titulo: string; lema: string; resumen: string; detalle: string }[];
  };
  fechas: {
    titulo: string;
    descripcion: string;
    tarjetas: { fecha: string; titulo: string; descripcion: string; imagen?: string }[];
  };
  devocion: {
    titulo: string;
    descripcion: string;
    oracion: { titulo: string; texto: string };
    tarjetas: { titulo: string; descripcion: string; imagen?: string }[];
  };
  imagenes?: Partial<Record<ClaveImagenLanding, string>>;
  texto_pie: string;
}

export type CambiosLanding = Partial<Pick<ContenidoLanding,
  'lema' | 'titulo_principal' | 'descripcion_principal' | 'cantidad_grupos' | 'cantidad_espacios' |
  'valores' | 'horarios_misa' | 'horarios_oficina'>> & {
  quienes_somos?: Partial<ContenidoLanding['quienes_somos']>;
  contacto?: Partial<ContenidoLanding['contacto']>;
  valores_encabezado?: Partial<ContenidoLanding['valores_encabezado']>;
  historia?: Partial<ContenidoLanding['historia']>;
  imagenes?: Partial<Record<ClaveImagenLanding, string>>;
  fechas?: Partial<ContenidoLanding['fechas']>;
  devocion?: Partial<Omit<ContenidoLanding['devocion'], 'oracion'>> & {
    oracion?: Partial<ContenidoLanding['devocion']['oracion']>;
  };
};
