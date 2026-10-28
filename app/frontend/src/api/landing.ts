import apiClient from './client';

export const CLAVES_IMAGENES_LANDING = [
  'hero', 'quienes_1', 'quienes_2', 'quienes_3', 'historia_1', 'historia_2', 'historia_3', 'entrada',
] as const;
export type ClaveImagenLanding = typeof CLAVES_IMAGENES_LANDING[number];
export type ImagenesLanding = Partial<Record<ClaveImagenLanding, string>>;

export interface ValorLanding {
  titulo: string;
  descripcion: string;
  imagen?: string;
}

export interface HorarioMisa {
  dias: string;
  horas: string[];
}

export interface HorarioOficina {
  dias: string;
  horario: string;
}

export interface TarjetaDevocion {
  titulo: string;
  descripcion: string;
  imagen?: string;
}

export interface TarjetaHistoria {
  titulo: string;
  lema: string;
  resumen: string;
  detalle: string;
}

export interface HistoriaLanding {
  titulo: string;
  descripcion: string;
  tarjetas: TarjetaHistoria[];
}

export interface TarjetaFecha {
  fecha: string;
  titulo: string;
  descripcion: string;
  imagen?: string;
}

export interface FechasLanding {
  titulo: string;
  descripcion: string;
  tarjetas: TarjetaFecha[];
}

export interface DevocionLanding {
  titulo: string;
  descripcion: string;
  oracion: { titulo: string; texto: string };
  tarjetas: TarjetaDevocion[];
}

export interface ContenidoLanding {
  nombre_parroquia: string;
  lema: string;
  titulo_principal: string;
  descripcion_principal: string;
  quienes_somos: {
    titulo: string;
    descripcion: string;
    mision: string;
    comunidad: string;
    servicio: string;
  };
  cantidad_grupos: number;
  cantidad_espacios: number;
  valores_encabezado: {
    titulo: string;
    descripcion: string;
  };
  valores: ValorLanding[];
  horarios_misa: HorarioMisa[];
  horarios_oficina: HorarioOficina[];
  contacto: {
    titulo: string;
    direccion: string;
    correo: string;
    telefono: string;
  };
  historia: HistoriaLanding;
  fechas: FechasLanding;
  devocion: DevocionLanding;
  imagenes?: ImagenesLanding;
  texto_pie: string;
}

export type CambiosLanding = Partial<Pick<ContenidoLanding,
  'lema' | 'titulo_principal' | 'descripcion_principal' | 'cantidad_grupos' | 'cantidad_espacios' |
  'valores' | 'horarios_misa' | 'horarios_oficina'
>> & {
  quienes_somos?: Partial<ContenidoLanding['quienes_somos']>;
  valores_encabezado?: Partial<ContenidoLanding['valores_encabezado']>;
  contacto?: Partial<ContenidoLanding['contacto']>;
  historia?: Partial<HistoriaLanding>;
  imagenes?: ImagenesLanding;
  fechas?: Partial<FechasLanding>;
  devocion?: Partial<Omit<DevocionLanding, 'oracion'>> & { oracion?: Partial<DevocionLanding['oracion']> };
};

export async function obtenerContenidoLanding(publico = false): Promise<ContenidoLanding> {
  const ruta = publico ? '/api/public/landing' : '/api/landing';
  const { data } = await apiClient.get<ContenidoLanding>(ruta);
  return data;
}

export async function actualizarContenidoLanding(cambios: CambiosLanding): Promise<CambiosLanding> {
  const { data } = await apiClient.patch<CambiosLanding>('/api/landing', cambios);
  return data;
}

/** Sube una foto ya optimizada por el servidor; su URL se publica al guardar el contenido. */
export async function subirImagenLanding(archivo: File): Promise<string> {
  const datos = new FormData();
  datos.set('imagen', archivo);
  const { data } = await apiClient.post<{ url: string }>('/api/landing/imagenes', datos);
  return data.url;
}
