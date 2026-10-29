import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EspacioCalendarioReservas from './EspacioCalendarioReservas';
import { getMonday, formatYYYYMMDD } from '../../../utils/date';

const HOY = new Date(2026, 9, 14); // miércoles, semana de referencia para las pruebas
const LUNES = getMonday(HOY);

function fechaDelDia(offsetDesdeHoy: number): string {
  const d = new Date(LUNES);
  d.setDate(LUNES.getDate() + offsetDesdeHoy);
  return formatYYYYMMDD(d);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HOY);
});

afterEach(() => vi.useRealTimers());

describe('EspacioCalendarioReservas', () => {
  it('muestra "Libre" en todos los días cuando no hay reservas confirmadas', () => {
    render(<EspacioCalendarioReservas reservas={[]} />);
    expect(screen.getAllByText('Libre')).toHaveLength(7);
  });

  it('muestra solo las reservas confirmadas de la semana activa, ignora otros estados y otras semanas', () => {
    const reservas = [
      { id: 1, fecha: fechaDelDia(1), hora_inicio: '09:00:00', hora_fin: '10:00:00', estado_reserva_id: 2, evento_titulo: 'Misa de mitad de semana', evento_descripcion: null, solicitante_nombre: 'Ana' },
      { id: 2, fecha: fechaDelDia(1), hora_inicio: '08:00:00', hora_fin: '09:00:00', estado_reserva_id: 1, evento_titulo: 'Pendiente, no debe salir', evento_descripcion: null, solicitante_nombre: 'Ana' },
      { id: 3, fecha: fechaDelDia(2), hora_inicio: '08:00:00', hora_fin: '09:00:00', estado_reserva_id: 3, evento_titulo: 'Rechazada, no debe salir', evento_descripcion: null, solicitante_nombre: 'Ana' },
      { id: 4, fecha: fechaDelDia(30), hora_inicio: '08:00:00', hora_fin: '09:00:00', estado_reserva_id: 2, evento_titulo: 'Confirmada pero otra semana', evento_descripcion: null, solicitante_nombre: 'Ana' },
    ];

    render(<EspacioCalendarioReservas reservas={reservas} />);

    expect(screen.getByText('Misa de mitad de semana')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente, no debe salir')).not.toBeInTheDocument();
    expect(screen.queryByText('Rechazada, no debe salir')).not.toBeInTheDocument();
    expect(screen.queryByText('Confirmada pero otra semana')).not.toBeInTheDocument();
  });

  it('ordena por hora de inicio las reservas confirmadas de un mismo día', () => {
    const reservas = [
      { id: 1, fecha: fechaDelDia(0), hora_inicio: '15:00:00', hora_fin: '16:00:00', estado_reserva_id: 2, evento_titulo: 'Tarde', evento_descripcion: null, solicitante_nombre: 'Ana' },
      { id: 2, fecha: fechaDelDia(0), hora_inicio: '08:00:00', hora_fin: '09:00:00', estado_reserva_id: 2, evento_titulo: 'Mañana', evento_descripcion: null, solicitante_nombre: 'Ana' },
    ];

    render(<EspacioCalendarioReservas reservas={reservas} />);

    const textos = screen.getAllByText(/Mañana|Tarde/).map(el => el.textContent);
    expect(textos).toEqual(['Mañana', 'Tarde']);
  });

  it('usa "Reserva #id" cuando no hay título de evento', () => {
    const reservas = [
      { id: 7, fecha: fechaDelDia(0), hora_inicio: '08:00:00', hora_fin: '09:00:00', estado_reserva_id: 2, evento_titulo: null, evento_descripcion: null, solicitante_nombre: 'Ana' },
    ];

    render(<EspacioCalendarioReservas reservas={reservas} />);
    expect(screen.getByText('Reserva #7')).toBeInTheDocument();
  });

  it('navega a la semana anterior/siguiente y vuelve a la actual con Hoy', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<EspacioCalendarioReservas reservas={[]} />);

    const rangoInicial = screen.getByText(/\d+ (al|de) /);
    const textoInicial = rangoInicial.textContent;

    await user.click(screen.getByLabelText('Semana anterior'));
    expect(screen.getByText(/\d+ (al|de) /).textContent).not.toBe(textoInicial);

    await user.click(screen.getByText('Hoy'));
    expect(screen.getByText(/\d+ (al|de) /).textContent).toBe(textoInicial);
  });

  it('muestra el detalle de la reserva al hacer click y lo cierra', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const reservas = [
      { id: 9, fecha: fechaDelDia(0), hora_inicio: '08:00:00', hora_fin: '09:30:00', estado_reserva_id: 2, evento_titulo: 'Catequesis de confirmación', evento_descripcion: 'Clase para jóvenes del grupo de confirmación.', solicitante_nombre: 'Carlos Ramirez' },
    ];

    render(<EspacioCalendarioReservas reservas={reservas} />);

    await user.click(screen.getByText('Catequesis de confirmación'));

    expect(screen.getByRole('heading', { name: 'Catequesis de confirmación' })).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('08:00 – 09:30')).toBeInTheDocument();
    expect(screen.getByText('Clase para jóvenes del grupo de confirmación.')).toBeInTheDocument();
    expect(screen.getByText('Registrado por Carlos Ramirez')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Cerrar'));
    expect(screen.queryByText('Clase para jóvenes del grupo de confirmación.')).not.toBeInTheDocument();
  });

  it('usa "Reserva #id" como título del detalle cuando no hay evento_titulo, y "Desconocido" sin solicitante_nombre', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const reservas = [
      { id: 11, fecha: fechaDelDia(0), hora_inicio: '08:00:00', hora_fin: '09:00:00', estado_reserva_id: 2, evento_titulo: null, evento_descripcion: null, solicitante_nombre: null },
    ];

    render(<EspacioCalendarioReservas reservas={reservas} />);

    await user.click(screen.getByText('Reserva #11'));
    expect(screen.getByRole('heading', { name: 'Reserva #11' })).toBeInTheDocument();
    expect(screen.getByText('Registrado por Desconocido')).toBeInTheDocument();
  });

  it('resalta la tarjeta con check-in activo y no resalta las demás', () => {
    const reservas = [
      { id: 20, fecha: fechaDelDia(0), hora_inicio: '08:00:00', hora_fin: '09:00:00', estado_reserva_id: 2, evento_titulo: 'Con check-in', evento_descripcion: null, solicitante_nombre: 'Ana', en_uso: true },
      { id: 21, fecha: fechaDelDia(0), hora_inicio: '10:00:00', hora_fin: '11:00:00', estado_reserva_id: 2, evento_titulo: 'Sin check-in', evento_descripcion: null, solicitante_nombre: 'Ana', en_uso: false },
    ];

    render(<EspacioCalendarioReservas reservas={reservas} />);

    expect(screen.getByText('En uso ahora')).toBeInTheDocument();
    const conCheckin = screen.getByText('Con check-in').closest('button');
    const sinCheckin = screen.getByText('Sin check-in').closest('button');
    expect(conCheckin?.className).toContain('reservaCardEnUso');
    expect(sinCheckin?.className).not.toContain('reservaCardEnUso');
  });

  it('resalta la columna del día actual', () => {
    const { container } = render(<EspacioCalendarioReservas reservas={[]} />);
    const columnas = within(container).getAllByText('Libre').map(el => el.parentElement?.parentElement);
    expect(columnas.some(col => col?.className.includes('todayColumn'))).toBe(true);
  });

  it('sin onSeleccionarDia, "Libre" no es un botón clickeable', () => {
    render(<EspacioCalendarioReservas reservas={[]} />);
    expect(screen.queryAllByRole('button', { name: 'Libre' })).toHaveLength(0);
  });

  it('con onSeleccionarDia, clickear el encabezado de un día avisa la fecha de ese día', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSeleccionarDia = vi.fn();
    render(<EspacioCalendarioReservas reservas={[]} onSeleccionarDia={onSeleccionarDia} />);

    await user.click(screen.getByText('14')); // miércoles = hoy, dentro de un <button>
    expect(onSeleccionarDia).toHaveBeenCalledWith(fechaDelDia(2));
  });

  it('con onSeleccionarDia, clickear "Libre" también avisa la fecha de ese día', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSeleccionarDia = vi.fn();
    render(<EspacioCalendarioReservas reservas={[]} onSeleccionarDia={onSeleccionarDia} />);

    const libres = screen.getAllByRole('button', { name: 'Libre' });
    expect(libres).toHaveLength(7);
    await user.click(libres[0]);
    expect(onSeleccionarDia).toHaveBeenCalledWith(fechaDelDia(0));
  });
});
