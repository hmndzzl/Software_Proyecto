import { CambiosLanding, ContenidoLanding } from '../types/landing.types';

type Regla =
  | { tipo: 'texto'; max: number; vacio?: boolean; formato?: RegExp }
  | { tipo: 'cantidad' }
  | { tipo: 'lista'; max: number; elemento: Regla }
  | { tipo: 'objeto'; campos: Record<string, Regla> };

const texto = (max: number, vacio = false): Regla => ({ tipo: 'texto', max, vacio });
const objeto = (campos: Record<string, Regla>): Regla => ({ tipo: 'objeto', campos });
const esquema = objeto({
  nombre_parroquia: texto(255), lema: texto(255), titulo_principal: texto(255), descripcion_principal: texto(5000),
  quienes_somos: objeto({ titulo: texto(255), descripcion: texto(5000), mision: texto(5000), comunidad: texto(5000), servicio: texto(5000) }),
  cantidad_grupos: { tipo: 'cantidad' }, cantidad_espacios: { tipo: 'cantidad' },
  valores_encabezado: objeto({ titulo: texto(255), descripcion: texto(5000) }),
  valores: { tipo: 'lista', max: 20, elemento: objeto({ titulo: texto(255), descripcion: texto(2000) }) },
  horarios_misa: { tipo: 'lista', max: 30, elemento: objeto({
    dias: texto(255), horas: { tipo: 'lista', max: 24, elemento: { tipo: 'texto', max: 5, formato: /^(?:[01]\d|2[0-3]):[0-5]\d$/ } },
  }) },
  horarios_oficina: { tipo: 'lista', max: 30, elemento: objeto({ dias: texto(255), horario: texto(500) }) },
  contacto: objeto({
    titulo: texto(255), direccion: texto(1000, true),
    correo: { tipo: 'texto', max: 255, vacio: true, formato: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    telefono: { tipo: 'texto', max: 50, vacio: true, formato: /^\+?[\d ()-]{7,50}$/ },
  }),
  texto_pie: texto(2000, true),
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
      if (!Array.isArray(valor) || valor.length > regla.max) return invalido();
      return valor.map((item, i) => validar(item, regla.elemento, `${ruta}[${i}]`, false));
    case 'objeto': {
      if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return invalido();
      const campos = valor as Record<string, unknown>;
      if (!Object.keys(campos).length) return invalido();
      for (const key of Object.keys(campos)) {
        if (!Object.prototype.hasOwnProperty.call(regla.campos, key)) throw new Error(`Campo no permitido: ${ruta}.${key}`);
      }
      if (!parcial && Object.keys(regla.campos).some(key => !Object.prototype.hasOwnProperty.call(campos, key))) return invalido();
      return Object.fromEntries(Object.entries(campos).map(([key, value]) => [key, validar(value, regla.campos[key], `${ruta}.${key}`, parcial)]));
    }
  }
}

export function validarCambiosLanding(body: unknown): CambiosLanding {
  return validar(body, esquema, 'contenido', true) as CambiosLanding;
}

// Las secciones se combinan por campo; las listas se reemplazan completas, incluso con [].
export function combinarContenidoLanding(actual: ContenidoLanding, cambios: CambiosLanding): ContenidoLanding {
  return {
    ...actual, ...cambios,
    quienes_somos: { ...actual.quienes_somos, ...cambios.quienes_somos },
    valores_encabezado: { ...actual.valores_encabezado, ...cambios.valores_encabezado },
    contacto: { ...actual.contacto, ...cambios.contacto },
  };
}
