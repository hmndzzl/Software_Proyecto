import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DetalleConDecisiones, { fechaDecision, type Decision } from './DetalleConDecisiones';
import apiClient from '../../api/client';

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
const props = { titulo: 'Detalle de reserva #1', endpoint: '/api/reservas/1/decisiones', campos: [{ etiqueta: 'Actividad', valor: 'Misa' }], onClose: vi.fn() };
const registro: Decision = { id: 1, resultado: 'aprobada', actor_id: 2, actor_nombre: 'Padre Luis', fecha: '2026-10-25T14:05:06.123000Z' };

describe('detalle con historial', () => {
  it('muestra quién decidió, cuándo y cada resultado sin sobrescribir el anterior', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: ['aprobada', 'rechazada', 'pendiente', 'cancelada'].map((resultado, i) => ({ ...registro, id: i, resultado })) });
    render(<DetalleConDecisiones {...props} />);
    expect(screen.getByText('Cargando decisiones...')).toBeInTheDocument();
    const lista = await screen.findByRole('list', { name: 'Decisiones registradas' });
    expect(screen.queryByText(/Fechas y horas de Guatemala/)).not.toBeInTheDocument();
    for (const resultado of ['aprobada', 'rechazada', 'pendiente', 'cancelada']) {
      expect(lista.querySelector(`li[data-resultado="${resultado}"]`)).toBeInTheDocument();
    }
    expect(within(lista).getAllByRole('listitem')).toHaveLength(4);
    expect(within(lista).getByText('Aprobada')).toBeInTheDocument();
    expect(within(lista).getByText('Rechazada')).toBeInTheDocument();
    expect(within(lista).getByText('Devuelta a pendiente')).toBeInTheDocument();
    expect(within(lista).getByText('Cancelada')).toBeInTheDocument();
    expect(within(lista).getAllByText('Por Padre Luis')).toHaveLength(4);
    expect(fechaDecision(registro.fecha)).toContain('08:05');
    expect(fechaDecision('2026-10-25T02:00:00Z')).toContain('24 de octubre');
    expect(lista.querySelector('time')).toHaveAttribute('datetime', registro.fecha);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(props.onClose).toHaveBeenCalled();
  });
  it('no atribuye autor ni fecha a datos antiguos sin historial', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    render(<DetalleConDecisiones {...props} />);
    expect(await screen.findByText(/No hay decisiones registradas/)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
  it('comunica errores sin confundirlos con un historial vacío y permite reintentar', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ data: [registro] });
    render(<DetalleConDecisiones {...props} />);
    expect(await screen.findByText('No se pudo cargar el historial de decisiones.')).toBeInTheDocument();
    expect(screen.queryByText(/No hay decisiones/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    expect(await screen.findByText('Por Padre Luis')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
  it.each([true, false])('ignora respuestas tardías tras cerrar (%s)', async exito => {
    let resolver!: (res: { data: Decision[] }) => void;
    let rechazar!: (error: Error) => void;
    vi.mocked(apiClient.get).mockReturnValue(new Promise((resolve, reject) => { resolver = resolve; rechazar = reject; }));
    const { unmount } = render(<DetalleConDecisiones {...props} />);
    unmount();
    if (exito) resolver({ data: [] }); else rechazar(new Error('red'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
