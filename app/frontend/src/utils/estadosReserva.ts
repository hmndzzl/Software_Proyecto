// Coincide con app/backend/src/config/estadosReserva.ts y la tabla estado_reserva del schema
export const ESTADOS_RESERVA = {
  PENDIENTE: 1,
  CONFIRMADA: 2,
  RECHAZADA: 3,
  CANCELADA: 4,
} as const;
