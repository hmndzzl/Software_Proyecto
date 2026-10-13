import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReservaEstadoBadge from '../ReservaEstadoBadge';
import ResumenEstadosReserva from '../ResumenEstadosReserva';
import { ESTADOS_RESERVA } from '../../../utils/estadosReserva';

describe('componentes compartidos de estado de reserva', () => {
  it.each([
    [ESTADOS_RESERVA.PENDIENTE, 'Pendiente'],
    [ESTADOS_RESERVA.CONFIRMADA, 'Confirmada'],
    [ESTADOS_RESERVA.RECHAZADA, 'Rechazada'],
    [ESTADOS_RESERVA.CANCELADA, 'Cancelada'],
  ])('muestra el badge unificado para el estado %s', (estadoId, etiqueta) => {
    render(<ReservaEstadoBadge estadoId={estadoId} />);

    expect(screen.getByText(etiqueta)).toBeInTheDocument();
  });

  it('muestra un estado seguro cuando recibe un identificador desconocido', () => {
    render(<ReservaEstadoBadge estadoId={99} />);

    expect(screen.getByText('Desconocido')).toBeInTheDocument();
  });

  it('resume todos los estados con los mismos nombres que los badges', () => {
    render(
      <ResumenEstadosReserva
        estadoIds={[
          ESTADOS_RESERVA.PENDIENTE,
          ESTADOS_RESERVA.PENDIENTE,
          ESTADOS_RESERVA.CONFIRMADA,
          ESTADOS_RESERVA.CANCELADA,
          99,
        ]}
      />,
    );

    const resumen = screen.getByLabelText('Resumen de reservas por estado');
    expect(within(resumen).getByText('Pendientes').previousElementSibling).toHaveTextContent('2');
    expect(within(resumen).getByText('Confirmadas').previousElementSibling).toHaveTextContent('1');
    expect(within(resumen).getByText('Rechazadas').previousElementSibling).toHaveTextContent('0');
    expect(within(resumen).getByText('Canceladas').previousElementSibling).toHaveTextContent('1');
  });
});
