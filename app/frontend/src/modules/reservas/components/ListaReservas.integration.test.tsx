import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ListaReservas from './ListaReservas';
import apiClient from '../../../api/client';
import { ToastProvider } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { authValue } from '../../../test/authValue';
import { ROLES } from '../../../utils/roles';
import type { Reserva } from '../../../types';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const base = { fecha: '2099-10-20T00:00:00.000Z', hora_inicio: '14:00:00', hora_fin: '15:00:00', espacio_id: 2, espacio_nombre: 'Salón', solicitante_id: 1, evento_titulo: 'Reunión', evento_descripcion: 'Planificación' };
const reservas = [1, 2, 3, 4, 99].map((estado, i) => ({ ...base, id: i + 1, estado_reserva_id: estado, solicitante_id: i === 1 ? 8 : 1, solicitante_nombre: i === 4 ? null : 'Ana Gómez', espacio_nombre: i === 4 ? null : 'Salón', evento_titulo: i === 4 ? null : 'Reunión', evento_descripcion: i === 4 ? null : 'Planificación' }));

function preparar(datos: Reserva[] = reservas) {
  vi.mocked(apiClient.get).mockImplementation(async (url) => ({ data: url === '/api/espacios' ? [{ id: 2, nombre: 'Salón' }] : datos }));
  vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
  vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: ROLES.ADMIN }));
}

function mostrar() { return render(<ToastProvider><ListaReservas /></ToastProvider>); }

describe('integración de reservas, estados y edición', () => {
  beforeEach(() => { vi.clearAllMocks(); preparar(); });

  it('muestra y ordena el aforo, valida al editarlo y guarda la cantidad numérica', async () => {
    preparar([{ ...reservas[0], cantidad_personas: 20 }, { ...reservas[1], cantidad_personas: 10 }]);
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: url === '/api/espacios' ? [{ id: 2, nombre: 'Salón', capacidad: 30 }] : [{ ...reservas[0], cantidad_personas: 20 }, { ...reservas[1], cantidad_personas: 10 }] }));
    mostrar();
    await screen.findByRole('cell', { name: '20' });
    fireEvent.click(screen.getByRole('columnheader', { name: /Personas esperadas/ }));
    fireEvent.click(screen.getByRole('columnheader', { name: /Personas esperadas/ }));
    const filas = within(screen.getByRole('table')).getAllByRole('row');
    expect(within(filas[1]).getByRole('cell', { name: '10' })).toBeInTheDocument();
    await userEvent.click(within(filas[2]).getByRole('button', { name: 'Editar' }));
    const campo = screen.getByLabelText('Cantidad de personas esperadas');
    fireEvent.change(campo, { target: { value: '31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getAllByText(/supera la capacidad/).length).toBeGreaterThan(0);
    expect(apiClient.put).not.toHaveBeenCalled();
    fireEvent.change(campo, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText(/Indica una cantidad entera/)).toBeInTheDocument();
    fireEvent.change(campo, { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/reservas/1', expect.objectContaining({ cantidad_personas: 30 })));
  });

  it('permite completar el aforo faltante en una reserva histórica', async () => {
    preparar([reservas[0]]);
    mostrar();
    expect(await screen.findByText('No registrado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Cantidad de personas esperadas'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/reservas/1', expect.objectContaining({ cantidad_personas: 10 })));
  });

  it('publica sin reiniciar la aprobación ni actualizar los datos de la reserva', async () => {
    preparar([{ ...reservas[1], evento_id: 25, evento_publico: 0 }]);
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Mostrar en la agenda pública' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/eventos/25/publico', { publico: true }));
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it('conserva el formulario al fallar la visibilidad y reintenta sin repetir la edición', async () => {
    preparar([{ ...reservas[1], evento_id: 25, evento_publico: 1 }]);
    vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({});
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByDisplayValue('Reunión'), { target: { value: 'Nueva reunión' } });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Mostrar en la agenda pública' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByText(/Los datos se guardaron/);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(2));
    expect(apiClient.put).toHaveBeenCalledTimes(1);
    expect(apiClient.patch).toHaveBeenLastCalledWith('/api/eventos/25/publico', { publico: false });
  });

  it('lista todos los estados, valores faltantes y permite ordenar', async () => {
    mostrar();
    await screen.findByRole('cell', { name: 'Confirmada' });
    for (const texto of ['Pendiente', 'Rechazada', 'Cancelada', 'Desconocido', '—']) expect(screen.getAllByText(texto).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ana Gómez').length).toBeGreaterThan(0);
    for (const nombre of ['#', 'Espacio', 'Fecha', 'Registrado por', 'Estado']) fireEvent.click(screen.getByRole('columnheader', { name: new RegExp(nombre === '#' ? '#' : nombre) }));
  });

  it('aprueba, cancela la propia y rechaza la reserva ajena', async () => {
    mostrar();
    await screen.findByRole('cell', { name: 'Confirmada' });
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]);
    preparar();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 99, nombre: 'Otro admin', correo: 'otro@test.com', rol_id: ROLES.ADMIN }));
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
    const fila = (await screen.findByRole('cell', { name: 'Confirmada' })).closest('tr')!;
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
    const fila = (await screen.findByRole('cell', { name: 'Pendiente' })).closest('tr')!;
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
    mostrar();
    const fila = (await screen.findByRole('cell', { name: 'Pendiente' })).closest('tr')!;
    await userEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar Reserva' }));
    expect(apiClient.put).not.toHaveBeenCalled();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Editar Reserva #1')).toBeInTheDocument();
    vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('red'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar Reserva' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
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
