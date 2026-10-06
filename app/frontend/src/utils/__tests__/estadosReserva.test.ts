import { describe, expect, it } from 'vitest';
import { ESTADOS_RESERVA, avisoCambioEstadoReserva } from '../estadosReserva';

describe('avisoCambioEstadoReserva', () => {
  it.each([
    [ESTADOS_RESERVA.CONFIRMADA, 'Reserva aprobada'],
    [ESTADOS_RESERVA.RECHAZADA, 'Reserva rechazada'],
    [ESTADOS_RESERVA.CANCELADA, 'Reserva cancelada'],
    [ESTADOS_RESERVA.PENDIENTE, 'Reserva actualizada'],
  ])('el estado %s se anuncia como "%s"', (estado, titulo) => {
    const aviso = avisoCambioEstadoReserva(estado);

    expect(aviso.titulo).toBe(titulo);
    expect(aviso.mensaje.length).toBeGreaterThan(0);
  });
});
