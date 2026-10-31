import { describe, expect, it } from 'vitest';
import {
  ESTADOS_RESERVA,
  ESTADOS_RESERVA_ORDENADOS,
  avisoCambioEstadoReserva,
  etiquetaEstadoReserva,
  obtenerEstadoReserva,
  puedeCancelarReserva,
} from '../estadosReserva';

describe('avisoCambioEstadoReserva', () => {
  it.each([
    [ESTADOS_RESERVA.CONFIRMADA, 'Reserva aprobada'],
    [ESTADOS_RESERVA.RECHAZADA, 'Reserva rechazada'],
    [ESTADOS_RESERVA.CANCELADA, 'Reserva cancelada'],
    [ESTADOS_RESERVA.PENDIENTE, 'Solicitud reabierta'],
  ])('el estado %s se anuncia como "%s"', (estado, titulo) => {
    const aviso = avisoCambioEstadoReserva(estado);

    expect(aviso.titulo).toBe(titulo);
    expect(aviso.mensaje.length).toBeGreaterThan(0);
  });
});

describe('metadatos de estado de reserva', () => {
  it.each([
    [ESTADOS_RESERVA.PENDIENTE, 'Pendiente', 'Pendientes', 'pendiente'],
    [ESTADOS_RESERVA.CONFIRMADA, 'Confirmada', 'Confirmadas', 'confirmada'],
    [ESTADOS_RESERVA.RECHAZADA, 'Rechazada', 'Rechazadas', 'rechazada'],
    [ESTADOS_RESERVA.CANCELADA, 'Cancelada', 'Canceladas', 'cancelada'],
  ] as const)('resuelve el estado %s desde una única definición', (id, label, labelPlural, kind) => {
    expect(obtenerEstadoReserva(id)).toMatchObject({ label, labelPlural, kind });
  });

  it('devuelve una representación segura para estados que la API no reconoce', () => {
    expect(obtenerEstadoReserva(99)).toMatchObject({ label: 'Desconocido', kind: 'neutral' });
  });

  it('conserva la cadena vacía al ordenar estados desconocidos', () => {
    expect(etiquetaEstadoReserva(ESTADOS_RESERVA.CONFIRMADA)).toBe('Confirmada');
    expect(etiquetaEstadoReserva(99)).toBe('');
  });

  it('solo permite cancelar reservas pendientes o confirmadas', () => {
    expect(puedeCancelarReserva(ESTADOS_RESERVA.PENDIENTE)).toBe(true);
    expect(puedeCancelarReserva(ESTADOS_RESERVA.CONFIRMADA)).toBe(true);
    expect(puedeCancelarReserva(ESTADOS_RESERVA.RECHAZADA)).toBe(false);
    expect(puedeCancelarReserva(ESTADOS_RESERVA.CANCELADA)).toBe(false);
  });

  it('mantiene el orden de los estados para resúmenes y filtros', () => {
    expect(ESTADOS_RESERVA_ORDENADOS).toEqual([
      ESTADOS_RESERVA.PENDIENTE,
      ESTADOS_RESERVA.CONFIRMADA,
      ESTADOS_RESERVA.RECHAZADA,
      ESTADOS_RESERVA.CANCELADA,
    ]);
  });
});
