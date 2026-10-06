export const ESTADOS_CUENTA = {
  PENDIENTE: 'pendiente',
  ACTIVA: 'activa',
  RECHAZADA: 'rechazada',
} as const;

export type EstadoCuenta = typeof ESTADOS_CUENTA[keyof typeof ESTADOS_CUENTA];

export function esEstadoCuenta(valor: unknown): valor is EstadoCuenta {
  return Object.values(ESTADOS_CUENTA).includes(valor as EstadoCuenta);
}

const MENSAJES_CUENTA_NO_ACTIVA: Record<string, string> = {
  [ESTADOS_CUENTA.PENDIENTE]: 'Tu cuenta está pendiente de aprobación. Un administrador o el sacerdote la revisará.',
  [ESTADOS_CUENTA.RECHAZADA]: 'Tu cuenta no fue aprobada. Contacta al administrador parroquial.',
};

/** Cuerpo de la respuesta 403 para una cuenta que aún no puede entrar al sistema. */
export function respuestaCuentaNoActiva(estado: string) {
  return {
    mensaje: MENSAJES_CUENTA_NO_ACTIVA[estado] ?? 'Tu cuenta no está activa. Contacta al administrador parroquial.',
    codigo: `CUENTA_${estado.toUpperCase()}`,
  };
}
