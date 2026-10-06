// Coincide con app/backend/src/config/estadosReserva.ts y la tabla estado_reserva del schema
export const ESTADOS_RESERVA = {
  PENDIENTE: 1,
  CONFIRMADA: 2,
  RECHAZADA: 3,
  CANCELADA: 4,
} as const;

/** Texto del aviso al cambiar el estado de una reserva (aprobar, rechazar o cancelar). */
export function avisoCambioEstadoReserva(estadoId: number): { titulo: string; mensaje: string } {
  switch (estadoId) {
    case ESTADOS_RESERVA.CONFIRMADA:
      return { titulo: 'Reserva aprobada', mensaje: 'La reserva quedó confirmada.' };
    case ESTADOS_RESERVA.RECHAZADA:
      return { titulo: 'Reserva rechazada', mensaje: 'La reserva fue rechazada.' };
    case ESTADOS_RESERVA.CANCELADA:
      return { titulo: 'Reserva cancelada', mensaje: 'La reserva fue cancelada.' };
    default:
      return { titulo: 'Reserva actualizada', mensaje: 'El estado de la reserva se actualizó.' };
  }
}
