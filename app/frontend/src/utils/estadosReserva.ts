import type { BadgeKind } from '../components/ui/Badge';

// Coincide con app/backend/src/config/estadosReserva.ts y la tabla estado_reserva del schema
export const ESTADOS_RESERVA = {
  PENDIENTE: 1,
  CONFIRMADA: 2,
  RECHAZADA: 3,
  CANCELADA: 4,
} as const;

export type EstadoReservaId = typeof ESTADOS_RESERVA[keyof typeof ESTADOS_RESERVA];

export interface EstadoReservaInfo {
  label: string;
  labelPlural: string;
  kind: BadgeKind;
}

/** Orden único para filtros, resúmenes y listas de estados de reserva. */
export const ESTADOS_RESERVA_ORDENADOS = [
  ESTADOS_RESERVA.PENDIENTE,
  ESTADOS_RESERVA.CONFIRMADA,
  ESTADOS_RESERVA.RECHAZADA,
  ESTADOS_RESERVA.CANCELADA,
] as const;

/** Fuente de verdad del nombre y apariencia de cada estado de reserva. */
export const ESTADOS_RESERVA_INFO: Record<EstadoReservaId, EstadoReservaInfo> = {
  [ESTADOS_RESERVA.PENDIENTE]: {
    label: 'Pendiente',
    labelPlural: 'Pendientes',
    kind: 'pendiente',
  },
  [ESTADOS_RESERVA.CONFIRMADA]: {
    label: 'Confirmada',
    labelPlural: 'Confirmadas',
    kind: 'confirmada',
  },
  [ESTADOS_RESERVA.RECHAZADA]: {
    label: 'Rechazada',
    labelPlural: 'Rechazadas',
    kind: 'rechazada',
  },
  [ESTADOS_RESERVA.CANCELADA]: {
    label: 'Cancelada',
    labelPlural: 'Canceladas',
    kind: 'cancelada',
  },
};

const ESTADO_RESERVA_DESCONOCIDO: EstadoReservaInfo = {
  label: 'Desconocido',
  labelPlural: 'Desconocidos',
  kind: 'neutral',
};

export function obtenerEstadoReserva(estadoId: number): EstadoReservaInfo {
  return ESTADOS_RESERVA_INFO[estadoId as EstadoReservaId] ?? ESTADO_RESERVA_DESCONOCIDO;
}

/** Etiqueta para ordenar: conserva el valor vacío histórico si el estado no es válido. */
export function etiquetaEstadoReserva(estadoId: number): string {
  return ESTADOS_RESERVA_INFO[estadoId as EstadoReservaId]?.label ?? '';
}

/** Solo las solicitudes activas pueden ser canceladas por quien las creó. */
export function puedeCancelarReserva(estadoId: number): boolean {
  return estadoId === ESTADOS_RESERVA.PENDIENTE || estadoId === ESTADOS_RESERVA.CONFIRMADA;
}

/** Texto del aviso al cambiar el estado de una reserva (aprobar, rechazar o cancelar). */
export function avisoCambioEstadoReserva(estadoId: number): { titulo: string; mensaje: string } {
  switch (estadoId) {
    case ESTADOS_RESERVA.CONFIRMADA:
      return { titulo: 'Reserva aprobada', mensaje: 'La reserva quedó confirmada.' };
    case ESTADOS_RESERVA.RECHAZADA:
      return { titulo: 'Reserva rechazada', mensaje: 'La reserva fue rechazada.' };
    case ESTADOS_RESERVA.CANCELADA:
      return { titulo: 'Reserva cancelada', mensaje: 'La reserva fue cancelada.' };
    case ESTADOS_RESERVA.PENDIENTE:
      return { titulo: 'Solicitud reabierta', mensaje: 'La reserva vuelve a estar pendiente de aprobación.' };
    default:
      return { titulo: 'Reserva actualizada', mensaje: 'El estado de la reserva se actualizó.' };
  }
}
