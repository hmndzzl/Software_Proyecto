import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EspacioEliminarModal from './EspacioEliminarModal';
import apiClient from '../../../api/client';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), delete: vi.fn() } }));
const espacio = { id: 7, nombre: 'Salón parroquial', capacidad: 30 };
const reserva = (id: number) => ({ id, titulo: `Actividad ${id}`, solicitante_nombre: 'Solicitante', fecha: '2099-01-01', hora_inicio: '10:00:00', hora_fin: '12:00:00', estado_reserva_id: 2 });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockResolvedValue({ data: { reservas: [] } });
  vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
});

describe('confirmación de eliminación de espacios', () => {
  it('cancelar no envía una eliminación', async () => {
    const cerrar = vi.fn();
    render(<EspacioEliminarModal espacio={espacio} onClose={cerrar} onDeleted={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(cerrar).toHaveBeenCalledOnce(); expect(apiClient.delete).not.toHaveBeenCalled();
  });
  it('elimina sin reservas tras confirmar', async () => {
    const eliminado = vi.fn();
    render(<EspacioEliminarModal espacio={espacio} onClose={vi.fn()} onDeleted={eliminado} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar espacio' }));
    await waitFor(() => expect(eliminado).toHaveBeenCalledOnce());
    expect(apiClient.delete).toHaveBeenCalledWith('/api/espacios/7', { data: { cancelar_reservas: false, reserva_ids: [] } });
  });
  it('pagina 100 reservas y confirma el conjunto completo', async () => {
    const reservas = Array.from({ length: 100 }, (_, i) => reserva(i + 1));
    vi.mocked(apiClient.get).mockResolvedValue({ data: { reservas } });
    render(<EspacioEliminarModal espacio={espacio} onClose={vi.fn()} onDeleted={vi.fn()} />);
    expect(await screen.findByText('Reservas afectadas (100)')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.queryByText('Actividad 6')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Actividad 6')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 20')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar reservas y eliminar espacio' }));
    expect(apiClient.delete).toHaveBeenCalledWith('/api/espacios/7', { data: { cancelar_reservas: true, reserva_ids: reservas.map(r => r.id) } });
  });
  it('muestra las reservas nuevas después de un conflicto y exige otra confirmación', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { reservas: [reserva(1)] } });
    vi.mocked(apiClient.delete).mockRejectedValueOnce({ response: { status: 409, data: { message: 'Revisa las nuevas reservas', reservas: [reserva(1), reserva(2)] } } });
    const eliminado = vi.fn();
    render(<EspacioEliminarModal espacio={espacio} onClose={vi.fn()} onDeleted={eliminado} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar reservas y eliminar espacio' }));
    expect(await screen.findByText('Actividad 2')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa las nuevas reservas');
    expect(eliminado).not.toHaveBeenCalled();
    expect(apiClient.delete).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar reservas y eliminar espacio' }));
    await waitFor(() => expect(eliminado).toHaveBeenCalledOnce());
    expect(apiClient.delete).toHaveBeenLastCalledWith('/api/espacios/7', { data: { cancelar_reservas: true, reserva_ids: [1, 2] } });
  });
  it('impide eliminar si falla la consulta y permite reintentar', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red'));
    render(<EspacioEliminarModal espacio={espacio} onClose={vi.fn()} onDeleted={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron consultar');
    expect(screen.queryByRole('button', { name: 'Eliminar espacio' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Volver a consultar reservas' }));
    expect(await screen.findByRole('button', { name: 'Eliminar espacio' })).toBeInTheDocument();
  });
});
