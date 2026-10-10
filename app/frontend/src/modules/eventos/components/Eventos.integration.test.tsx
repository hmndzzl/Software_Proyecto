import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CrearEventoForm from './CrearEventoForm';
import EditarEventoForm from './EditarEventoForm';
import ListaEventos from './ListaEventos';
import apiClient from '../../../api/client';
import { ToastProvider } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { authValue } from '../../../test/authValue';
import { ROLES } from '../../../utils/roles';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const reserva = { id: 4, fecha: '2099-10-20', hora_inicio: '14:00:00', hora_fin: '15:00:00', nombre_espacio: null, nombre_solicitante: 'Ana' };
const evento = { id: 7, descripcion: 'Misa mayor', encargado_id: 2, nombre_encargado: 'Padre Luis', fecha: '2099-10-20', hora_inicio: '14:00:00', hora_fin: '15:00:00', nombre_espacio: null, reserva_id: 4 };

const conToast = (ui: React.ReactNode) => render(<ToastProvider>{ui}</ToastProvider>);

describe('integración de eventos, reservas y permisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: ROLES.ADMIN }));
    vi.mocked(apiClient.get).mockImplementation(async (url) => ({ data: String(url).includes('reservas-disponibles') ? [reserva] : String(url).includes('encargados-evento') ? [{ id: 2, nombre: 'Padre Luis' }] : [evento] }));
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
  });

  it('crea un evento desde una reserva confirmada y muestra su encargado', async () => {
    const actualizado = vi.fn();
    conToast(<CrearEventoForm onEventoCreado={actualizado} />);
    await userEvent.type(screen.getByPlaceholderText('Ej. Misa de Navidad'), 'Misa de prueba');
    await userEvent.selectOptions(await screen.findByRole('combobox'), '4');
    expect(screen.getByText('Ana')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear Evento' }));
    expect(apiClient.post).toHaveBeenCalledWith('/api/eventos', { descripcion: 'Misa de prueba', reserva_id: 4 });
    expect(await screen.findByRole('status')).toHaveTextContent('Evento creado');
    expect(actualizado).toHaveBeenCalled();
  });

  it('valida y reporta fallos de carga y creación', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red'));
    vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { data: { mensaje: 'Reserva ocupada' } } });
    conToast(<CrearEventoForm />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Error al cargar reservas');
    await userEvent.click(screen.getByRole('button', { name: 'Crear Evento' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Faltan datos');
  });

  it('lista, ordena y entrega el evento seleccionado para edición', async () => {
    const editar = vi.fn();
    vi.mocked(apiClient.get).mockResolvedValue({ data: [evento, { ...evento, id: 8, descripcion: 'Adoración', nombre_encargado: null, nombre_espacio: 'Capilla', fecha: '2099-10-19' }] });
    conToast(<ListaEventos onEditar={editar} />);
    await screen.findByText('Misa mayor');
    for (const nombre of ['#', 'Descripción', 'Encargado', 'Fecha', 'Espacio']) {
      const header = screen.getByRole('columnheader', { name: new RegExp(nombre === '#' ? '#' : nombre) });
      fireEvent.click(header);
      fireEvent.click(header);
    }
    await userEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
    expect(editar).toHaveBeenCalled();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('muestra vacío, error con reintento y oculta edición sin permiso', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValue({ data: [] });
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 4, nombre: 'Ministro', correo: 'ministro@test.com', rol_id: ROLES.MINISTRO }));
    conToast(<ListaEventos onEditar={vi.fn()} />);
    expect(await screen.findByText('Error de red al obtener los eventos.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('No hay eventos registrados.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('actualiza y elimina un evento confirmado', async () => {
    const actualizado = vi.fn();
    const cancelar = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    conToast(<EditarEventoForm evento={evento as any} onEventoActualizado={actualizado} onCancelar={cancelar} />);
    await screen.findByRole('option', { name: 'Padre Luis' });
    const descripcion = screen.getByDisplayValue('Misa mayor');
    await userEvent.clear(descripcion);
    await userEvent.type(descripcion, 'Misa actualizada');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    expect(apiClient.put).toHaveBeenCalledWith('/api/eventos/7', { descripcion: 'Misa actualizada', encargado_id: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(apiClient.delete).toHaveBeenCalledWith('/api/eventos/7');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(cancelar).toHaveBeenCalled();
  });

  it('no elimina sin confirmación y valida/expone errores al editar', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('red'));
    conToast(<EditarEventoForm evento={evento as any} />);
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(apiClient.delete).not.toHaveBeenCalled();
    const descripcion = screen.getByDisplayValue('Misa mayor');
    await userEvent.clear(descripcion);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Faltan datos');
  });
});
