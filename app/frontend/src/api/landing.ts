import apiClient from './client';

export interface ValorLanding {
  titulo: string;
  descripcion: string;
}

export interface HorarioMisa {
  dias: string;
  horas: string[];
}

export interface HorarioOficina {
  dias: string;
  horario: string;
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
  texto_pie: string;
}

export type CambiosLanding = Partial<Pick<ContenidoLanding,
  'lema' | 'titulo_principal' | 'descripcion_principal' | 'cantidad_grupos' | 'cantidad_espacios' |
  'valores' | 'horarios_misa' | 'horarios_oficina'
>> & {
  quienes_somos?: Partial<ContenidoLanding['quienes_somos']>;
  valores_encabezado?: Partial<ContenidoLanding['valores_encabezado']>;
  contacto?: Partial<ContenidoLanding['contacto']>;
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
