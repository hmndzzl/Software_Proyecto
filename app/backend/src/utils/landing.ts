import { CambiosLanding, CLAVES_IMAGENES_LANDING, ContenidoLanding, URL_IMAGEN_LANDING } from '../types/landing.types';

type Regla =
  | { tipo: 'texto'; max: number; vacio?: boolean; opcional?: boolean; formato?: RegExp }
  | { tipo: 'cantidad' }
  | { tipo: 'lista'; max: number; min?: number; elemento: Regla }
  | { tipo: 'objeto'; campos: Record<string, Regla> };

const texto = (max: number, vacio = false): Regla => ({ tipo: 'texto', max, vacio });
const objeto = (campos: Record<string, Regla>): Regla => ({ tipo: 'objeto', campos });
// Solo acepta fotos subidas desde el panel; vacío significa «usar la foto predeterminada».
const imagen: Regla = { tipo: 'texto', max: 255, vacio: true, opcional: true, formato: URL_IMAGEN_LANDING };
const esquema = objeto({
  lema: texto(255), titulo_principal: texto(255), descripcion_principal: texto(5000),
  quienes_somos: objeto({ titulo: texto(255), descripcion: texto(5000), mision: texto(5000), comunidad: texto(5000), servicio: texto(5000) }),
  cantidad_grupos: { tipo: 'cantidad' }, cantidad_espacios: { tipo: 'cantidad' },
  valores_encabezado: objeto({ titulo: texto(255), descripcion: texto(5000) }),
  valores: { tipo: 'lista', max: 20, elemento: objeto({ titulo: texto(255), descripcion: texto(2000), imagen }) },
  horarios_misa: { tipo: 'lista', max: 30, elemento: objeto({
    dias: texto(255), horas: { tipo: 'lista', min: 1, max: 24, elemento: { tipo: 'texto', max: 5, formato: /^(?:[01]\d|2[0-3]):[0-5]\d$/ } },
  }) },
  horarios_oficina: { tipo: 'lista', max: 30, elemento: objeto({ dias: texto(255), horario: texto(500) }) },
  historia: objeto({
    titulo: texto(255), descripcion: texto(5000),
    tarjetas: { tipo: 'lista', max: 6, elemento: objeto({ titulo: texto(255), lema: texto(255, true), resumen: texto(1000), detalle: texto(10000) }) },
  }),
  fechas: objeto({
    titulo: texto(255), descripcion: texto(5000),
    tarjetas: { tipo: 'lista', max: 12, elemento: objeto({ fecha: texto(255), titulo: texto(255), descripcion: texto(2000), imagen }) },
  }),
  devocion: objeto({
    titulo: texto(255), descripcion: texto(5000),
    oracion: objeto({ titulo: texto(255), texto: texto(10000) }),
    tarjetas: { tipo: 'lista', max: 20, elemento: objeto({ titulo: texto(255), descripcion: texto(2000), imagen }) },
  }),
  contacto: objeto({
    titulo: texto(255), direccion: texto(1000, true),
    correo: { tipo: 'texto', max: 255, vacio: true, formato: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    telefono: { tipo: 'texto', max: 50, vacio: true, formato: /^\+?[\d ()-]{7,50}$/ },
  }),
  imagenes: objeto(Object.fromEntries(CLAVES_IMAGENES_LANDING.map(clave => [clave, imagen]))),
});

function validar(valor: unknown, regla: Regla, ruta: string, parcial: boolean): unknown {
  const invalido = () => { throw new Error(`Campo inválido: ${ruta}`); };
  switch (regla.tipo) {
    case 'texto': {
      if (typeof valor !== 'string') return invalido();
      const limpio = valor.trim();
      if ((!limpio && !regla.vacio) || limpio.length > regla.max || (limpio && regla.formato && !regla.formato.test(limpio))) return invalido();
      return limpio;
    }
    case 'cantidad':
      if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0 || valor > 1_000_000) return invalido();
      return valor;
    case 'lista':
      if (!Array.isArray(valor) || valor.length > regla.max || valor.length < (regla.min ?? 0)) return invalido();
      return valor.map((item, i) => validar(item, regla.elemento, `${ruta}[${i}]`, false));
    case 'objeto': {
      if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return invalido();
      const campos = valor as Record<string, unknown>;
      if (!Object.keys(campos).length) return invalido();
      for (const key of Object.keys(campos)) {
        if (!Object.prototype.hasOwnProperty.call(regla.campos, key)) throw new Error(`Campo no permitido: ${ruta}.${key}`);
      }
      const faltante = (key: string) => !Object.prototype.hasOwnProperty.call(campos, key)
        && !(regla.campos[key].tipo === 'texto' && regla.campos[key].opcional);
      if (!parcial && Object.keys(regla.campos).some(faltante)) return invalido();
      return Object.fromEntries(Object.entries(campos).map(([key, value]) => [key, validar(value, regla.campos[key], `${ruta}.${key}`, parcial)]));
    }
  }
}

export function validarCambiosLanding(body: unknown): CambiosLanding {
  return validar(body, esquema, 'contenido', true) as CambiosLanding;
}

// Las secciones se combinan por campo; las listas se reemplazan completas.
export function combinarContenidoLanding(actual: ContenidoLanding, cambios: CambiosLanding): ContenidoLanding {
  return {
    ...actual, ...cambios,
    quienes_somos: { ...actual.quienes_somos, ...cambios.quienes_somos },
    contacto: { ...actual.contacto, ...cambios.contacto },
    valores_encabezado: { ...actual.valores_encabezado, ...cambios.valores_encabezado },
    // Un contenido anterior a estas secciones no recibe claves vacías.
    ...(actual.historia || cambios.historia) && { historia: { ...actual.historia, ...cambios.historia } },
    ...(actual.fechas || cambios.fechas) && { fechas: { ...actual.fechas, ...cambios.fechas } },
    ...(actual.imagenes || cambios.imagenes) && { imagenes: { ...actual.imagenes, ...cambios.imagenes } },
    ...(actual.devocion || cambios.devocion) && {
      devocion: { ...actual.devocion, ...cambios.devocion, oracion: { ...actual.devocion?.oracion, ...cambios.devocion?.oracion } },
    },
  };
}

// Fotos subidas que el contenido referencia; sirve para borrar del disco las que dejan de usarse.
export function recopilarImagenesLanding(contenido: Partial<ContenidoLanding>): Set<string> {
  const urls = [
    ...Object.values(contenido.imagenes ?? {}),
    ...(contenido.valores ?? []).map(valor => valor.imagen),
    ...(contenido.devocion?.tarjetas ?? []).map(tarjeta => tarjeta.imagen),
    ...(contenido.fechas?.tarjetas ?? []).map(tarjeta => tarjeta.imagen),
  ];
  return new Set(urls.filter((url): url is string => Boolean(url)));
}
