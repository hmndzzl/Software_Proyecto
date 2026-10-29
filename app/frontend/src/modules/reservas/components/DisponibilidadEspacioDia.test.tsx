import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DisponibilidadEspacioDia from './DisponibilidadEspacioDia';
import type { Reserva } from '../../../types';

function reserva(overrides: Partial<Reserva>): Reserva {
  return {
    id: 1, fecha: '2026-11-03', hora_inicio: '09:00:00', hora_fin: '10:00:00',
    estado_reserva_id: 2, solicitante_nombre: 'Alguien', evento_id: null,
    evento_titulo: null, evento_descripcion: null,
    ...overrides,
  };
}

describe('DisponibilidadEspacioDia', () => {
  it('muestra solo las reservas confirmadas de ese día como ocupadas', () => {
    const reservas = [
      reserva({ id: 1, fecha: '2026-11-03', estado_reserva_id: 2 }),
      reserva({ id: 2, fecha: '2026-11-03', estado_reserva_id: 1 }), // pendiente, no cuenta
      reserva({ id: 3, fecha: '2026-11-04', estado_reserva_id: 2 }), // otro día, no cuenta
    ];
    render(<DisponibilidadEspacioDia fecha="2026-11-03" reservas={reservas} horaInicio="" horaFin="" hayConflicto={false} />);
    expect(screen.getByRole('img', { name: '1 horario(s) ya confirmado(s) ese día' })).toBeInTheDocument();
  });

  it('indica que no hay reservas confirmadas cuando la lista está vacía', () => {
    render(<DisponibilidadEspacioDia fecha="2026-11-03" reservas={[]} horaInicio="" horaFin="" hayConflicto={false} />);
    expect(screen.getByRole('img', { name: 'Sin reservas confirmadas ese día' })).toBeInTheDocument();
  });

  it('muestra la fecha en formato dd/mm/aaaa', () => {
    render(<DisponibilidadEspacioDia fecha="2026-11-03" reservas={[]} horaInicio="" horaFin="" hayConflicto={false} />);
    expect(screen.getByText('Disponibilidad del 03/11/2026')).toBeInTheDocument();
  });

  it('no dibuja el borrador si falta una hora o el rango es inválido', () => {
    const { rerender } = render(<DisponibilidadEspacioDia fecha="2026-11-03" reservas={[]} horaInicio="09:00" horaFin="" hayConflicto={false} />);
    expect(document.querySelectorAll('[class*="borrador"]')).toHaveLength(0);
    rerender(<DisponibilidadEspacioDia fecha="2026-11-03" reservas={[]} horaInicio="10:00" horaFin="09:00" hayConflicto={false} />);
    expect(document.querySelectorAll('[class*="borrador"]')).toHaveLength(0);
  });
});
