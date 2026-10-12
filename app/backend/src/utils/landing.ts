import { CambiosLanding, ContenidoLanding } from '../types/landing.types';

type Regla =
  | { tipo: 'texto'; max: number; vacio?: boolean; formato?: RegExp }
  | { tipo: 'cantidad' }
  | { tipo: 'objeto'; campos: Record<string, Regla> };

const texto = (max: number, vacio = false): Regla => ({ tipo: 'texto', max, vacio });
const objeto = (campos: Record<string, Regla>): Regla => ({ tipo: 'objeto', campos });
const esquema = objeto({
  quienes_somos: objeto({ titulo: texto(255), descripcion: texto(5000), mision: texto(5000), comunidad: texto(5000), servicio: texto(5000) }),
  cantidad_grupos: { tipo: 'cantidad' }, cantidad_espacios: { tipo: 'cantidad' },
  contacto: objeto({
    titulo: texto(255), direccion: texto(1000, true),
    correo: { tipo: 'texto', max: 255, vacio: true, formato: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    telefono: { tipo: 'texto', max: 50, vacio: true, formato: /^\+?[\d ()-]{7,50}$/ },
  }),
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

// Solo se editan Quiénes somos, cantidades mostradas y contacto. Los demás campos se conservan.
export function combinarContenidoLanding(actual: ContenidoLanding, cambios: CambiosLanding): ContenidoLanding {
  return {
    ...actual, ...cambios,
    quienes_somos: { ...actual.quienes_somos, ...cambios.quienes_somos },
    contacto: { ...actual.contacto, ...cambios.contacto },
  };
}
