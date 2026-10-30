import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectorSemanaEspacio from './SelectorSemanaEspacio';
import { getMonday, formatYYYYMMDD } from '../../../utils/date';
import type { Reserva } from '../../../types';

const HOY = new Date(2026, 9, 14); // miércoles
const LUNES = getMonday(HOY);

function fechaDelDia(offset: number): string {
  const d = new Date(LUNES);
  d.setDate(LUNES.getDate() + offset);
  return formatYYYYMMDD(d);
}

function reserva(overrides: Partial<Reserva>): Reserva {
  return {
    id: 1, fecha: fechaDelDia(0), hora_inicio: '09:00:00', hora_fin: '10:00:00',
    estado_reserva_id: 2, solicitante_nombre: 'Alguien', evento_id: null,
    evento_titulo: null, evento_descripcion: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HOY);
});

afterEach(() => vi.useRealTimers());

describe('SelectorSemanaEspacio', () => {
  it('un día sin reservas Pendiente/Confirmada se marca "Libre"', () => {
    render(<SelectorSemanaEspacio reservas={[]} fechaSeleccionada="" onSeleccionarDia={vi.fn()} />);
    expect(screen.getAllByText('Libre')).toHaveLength(7);
  });

  it('un día con reservas muestra la cantidad, contando Pendiente y Confirmada pero no Rechazada/Cancelada', () => {
    const reservas = [
      reserva({ id: 1, fecha: fechaDelDia(0), estado_reserva_id: 2 }),
      reserva({ id: 2, fecha: fechaDelDia(0), estado_reserva_id: 1 }),
      reserva({ id: 3, fecha: fechaDelDia(0), estado_reserva_id: 3 }),
      reserva({ id: 4, fecha: fechaDelDia(0), estado_reserva_id: 4 }),
    ];
    render(<SelectorSemanaEspacio reservas={reservas} fechaSeleccionada="" onSeleccionarDia={vi.fn()} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('permite seleccionar un día aunque ya tenga reservas', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSeleccionarDia = vi.fn();
    const reservas = [reserva({ id: 1, fecha: fechaDelDia(0), estado_reserva_id: 2 })];
    render(<SelectorSemanaEspacio reservas={reservas} fechaSeleccionada="" onSeleccionarDia={onSeleccionarDia} />);

    await user.click(screen.getByText('1').closest('button')!);
    expect(onSeleccionarDia).toHaveBeenCalledWith(fechaDelDia(0));
  });

  it('navega a la semana anterior/siguiente y vuelve a la actual con Hoy', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SelectorSemanaEspacio reservas={[]} fechaSeleccionada="" onSeleccionarDia={vi.fn()} />);

    const rangoInicial = screen.getByText(/\(.*\)/).textContent;
    await user.click(screen.getByLabelText('Semana anterior'));
    expect(screen.getByText(/\(.*\)/).textContent).not.toBe(rangoInicial);

    await user.click(screen.getByText('Hoy'));
    expect(screen.getByText(/\(.*\)/).textContent).toBe(rangoInicial);
  });
});
