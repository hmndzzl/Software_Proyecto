import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ListaReservas from './ListaReservas';
import apiClient from '../../../api/client';
import { ToastProvider } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { authValue } from '../../../test/authValue';
import { ROLES } from '../../../utils/roles';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const base = { fecha: '2099-10-20T00:00:00.000Z', hora_inicio: '14:00:00', hora_fin: '15:00:00', espacio_id: 2, espacio_nombre: 'Salón', solicitante_id: 1, evento_titulo: 'Reunión', evento_descripcion: 'Planificación' };
const reservas = [1, 2, 3, 4, 99].map((estado, i) => ({ ...base, id: i + 1, estado_reserva_id: estado, solicitante_id: i === 1 ? 8 : 1, espacio_nombre: i === 4 ? null : 'Salón', evento_titulo: i === 4 ? null : 'Reunión', evento_descripcion: i === 4 ? null : 'Planificación' }));

function preparar(datos = reservas) {
  vi.mocked(apiClient.get).mockImplementation(async (url) => ({ data: url === '/api/espacios' ? [{ id: 2, nombre: 'Salón' }] : datos }));
  vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
  vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, rol_id: ROLES.ADMIN }));
}

function mostrar() { return render(<ToastProvider><ListaReservas /></ToastProvider>); }

describe('integración de reservas, estados y edición', () => {
  beforeEach(() => { vi.clearAllMocks(); preparar(); });

  it('lista todos los estados, valores faltantes y permite ordenar', async () => {
    mostrar();
    await screen.findByText('Confirmada');
    for (const texto of ['Pendiente', 'Rechazada', 'Cancelada', 'Desconocido', '—']) expect(screen.getAllByText(texto).length).toBeGreaterThan(0);
    for (const nombre of ['#', 'Espacio', 'Fecha', 'Estado']) fireEvent.click(screen.getByRole('columnheader', { name: new RegExp(nombre === '#' ? '#' : nombre) }));
  });

  it('aprueba, cancela la propia y rechaza la reserva ajena', async () => {
    mostrar();
    await screen.findByText('Confirmada');
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]);
    preparar();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 99, rol_id: ROLES.ADMIN }));
    const { unmount } = mostrar();
    await screen.findAllByText('Pendiente');
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(apiClient.put).toHaveBeenCalledWith('/api/reservas/1/estado', { estado_id: 3 });
    unmount();
  });

  it('muestra el error del servidor al cambiar estado', async () => {
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { message: 'Conflicto de horario' } } });
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto de horario');
  });

  it('edita una reserva confirmada y advierte que volverá a pendiente', async () => {
    mostrar();
    const fila = (await screen.findByText('Confirmada')).closest('tr')!;
    await userEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    expect(screen.getByText(/volverá a estado/)).toBeInTheDocument();
    const titulo = screen.getByDisplayValue('Reunión');
    await userEvent.clear(titulo);
    await userEvent.type(titulo, 'Reunión actualizada');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/reservas/2', expect.objectContaining({ titulo: 'Reunión actualizada', espacio_id: 2 })));
  });

  it('valida campos y horario de la edición y permite cerrarla', async () => {
    mostrar();
    const fila = (await screen.findByText('Pendiente')).closest('tr')!;
    await userEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    const titulo = screen.getByDisplayValue('Reunión');
    await userEvent.clear(titulo);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText('Por favor completa todos los campos.')).toBeInTheDocument();
    await userEvent.type(titulo, 'Reunión');
    fireEvent.change(document.querySelectorAll<HTMLInputElement>('input[type="time"]')[0], { target: { value: '16:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText(/hora de inicio debe ser menor/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]);
    expect(screen.queryByText('Editar Reserva #1')).not.toBeInTheDocument();
  });

  it('cancela desde el modal solo con confirmación y conserva errores', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    mostrar();
    const fila = (await screen.findByText('Pendiente')).closest('tr')!;
    await userEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar Reserva' }));
    expect(apiClient.put).not.toHaveBeenCalled();
    vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('red'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar Reserva' }));
    expect(await screen.findByText('Error al cancelar la reserva.')).toBeInTheDocument();
  });

  it('muestra vacío y recupera un error de carga', async () => {
    vi.mocked(apiClient.get).mockImplementationOnce(() => Promise.reject(new Error('red'))).mockResolvedValue({ data: [] });
    mostrar();
    expect(await screen.findByText('Error de red al obtener las reservas.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('No hay reservas registradas.')).toBeInTheDocument();
  });
});
