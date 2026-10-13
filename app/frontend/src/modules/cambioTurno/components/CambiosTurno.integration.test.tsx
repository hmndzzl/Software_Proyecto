import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../../api/client';
import { useAuth } from '../../../context/AuthContext';
import { ToastProvider } from '../../../context/ToastContext';
import { authValue } from '../../../test/authValue';
import SolicitarCambioTurnoForm from './SolicitarCambioTurnoForm';
import ListaCambiosTurno from './ListaCambiosTurno';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const wrapper = ({ children }: { children: React.ReactNode }) => <ToastProvider>{children}</ToastProvider>;
const usuario = { id: 4, nombre: 'María', correo: 'maria@test.com', rol_id: 4 };
const tarea = {
  id: 8, titulo: 'Lectura', descripcion: 'Primera lectura', fecha: '2099-10-20',
  hora_inicio: '08:00:00', hora_fin: '09:00:00',
};
const cambios = [
  { id: 1, tarea_id: 8, solicitante_id: 7, destinatario_id: 4, estado: 'pendiente', solicitante_nombre: 'Ana', destinatario_nombre: 'María', tarea_titulo: 'Lectura', tarea_descripcion: '', tarea_fecha: '2099-10-20', tarea_hora_inicio: '08:00:00', tarea_hora_fin: '09:00:00' },
  { id: 2, tarea_id: 9, solicitante_id: 4, destinatario_id: 9, estado: 'aceptado', solicitante_nombre: 'María', destinatario_nombre: 'Zoe', tarea_titulo: 'Cantos', tarea_descripcion: '', tarea_fecha: '2099-10-21', tarea_hora_inicio: '10:00:00', tarea_hora_fin: '11:00:00' },
  { id: 3, tarea_id: 10, solicitante_id: 4, destinatario_id: 10, estado: 'rechazado', solicitante_nombre: 'María', destinatario_nombre: 'Luis', tarea_titulo: 'Ofrendas', tarea_descripcion: '', tarea_fecha: '2099-10-22', tarea_hora_inicio: '12:00:00', tarea_hora_fin: '13:00:00' },
  { id: 4, tarea_id: 11, solicitante_id: 8, destinatario_id: 4, estado: 'aceptado', solicitante_nombre: 'Bruno', destinatario_nombre: 'María', tarea_titulo: 'Comunión', tarea_descripcion: '', tarea_fecha: '2099-10-19', tarea_hora_inicio: '07:00:00', tarea_hora_fin: '08:00:00' },
] as const;

describe('integración de cambios de turno', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(authValue(usuario));
    vi.mocked(apiClient.post).mockResolvedValue({ data: { mensaje: 'Enviada correctamente' } });
    vi.mocked(apiClient.put).mockResolvedValue({ data: { mensaje: 'Respuesta guardada' } });
  });

  it('carga tareas y ministros, excluye al usuario y envía una solicitud', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({
      data: String(url) === '/api/tareas' ? [tarea] : [usuario, { id: 7, nombre: 'Ana' }],
    }));
    const enviada = vi.fn();
    render(<SolicitarCambioTurnoForm onSolicitudEnviada={enviada} />, { wrapper });

    await screen.findByRole('option', { name: /Lectura/ });
    expect(screen.queryByRole('option', { name: 'María' })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Mi Tarea:'), '8');
    await userEvent.selectOptions(screen.getByLabelText('Cambiar con:'), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar Cambio' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/api/cambios-turno', { tarea_id: 8, destinatario_id: 7 }));
    expect(await screen.findByRole('status')).toHaveTextContent('Enviada correctamente');
    expect(enviada).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Mi Tarea:')).toHaveValue('');
  });

  it('valida datos y presenta el mensaje de error del servidor', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url) === '/api/tareas' ? [tarea] : [{ id: 7, nombre: 'Ana' }] }));
    render(<SolicitarCambioTurnoForm />, { wrapper });
    await screen.findByRole('option', { name: /Lectura/ });
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar Cambio' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Faltan datos');

    vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { data: { mensaje: 'La tarea ya fue solicitada' } } });
    await userEvent.selectOptions(screen.getByLabelText('Mi Tarea:'), '8');
    await userEvent.selectOptions(screen.getByLabelText('Cambiar con:'), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar Cambio' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La tarea ya fue solicitada');
  });

  it('tolera fallos de carga, usuario ausente y muestra el estado vacío', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue(null));
    vi.mocked(apiClient.get).mockRejectedValue(new Error('red'));
    render(<SolicitarCambioTurnoForm />, { wrapper });
    expect(await screen.findByText(/No tienes tareas asignadas/)).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('usa mensajes de respaldo y funciona sin callback opcional', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url) === '/api/tareas' ? [tarea] : [{ id: 7, nombre: 'Ana' }] }));
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce(new Error('red'));
    render(<SolicitarCambioTurnoForm />, { wrapper });
    await screen.findByRole('option', { name: /Lectura/ });
    await userEvent.selectOptions(screen.getByLabelText('Mi Tarea:'), '8');
    await userEvent.selectOptions(screen.getByLabelText('Cambiar con:'), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar Cambio' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Tu solicitud de cambio de turno fue enviada');

    await userEvent.selectOptions(screen.getByLabelText('Mi Tarea:'), '8');
    await userEvent.selectOptions(screen.getByLabelText('Cambiar con:'), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar Cambio' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de red al solicitar el cambio de turno');
  });

  it('separa recibidas y enviadas, ordena y acepta una solicitud pendiente', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: cambios });
    render(<ListaCambiosTurno />, { wrapper });
    await screen.findByText('Ana');
    expect(screen.getByText('Zoe')).toBeInTheDocument();
    expect(screen.getByText('Luis')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getAllByText('Aceptado')).toHaveLength(2);
    expect(screen.getByText('Rechazado')).toBeInTheDocument();

    for (const label of ['Tarea', 'Fecha', 'Horario', 'Solicitante', 'Destinatario', 'Estado']) {
      for (const header of screen.getAllByRole('columnheader', { name: label })) {
        await userEvent.click(header);
        await userEvent.click(header);
      }
    }
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/cambios-turno/1/responder', { aceptar: true }));
    expect(await screen.findByRole('status')).toHaveTextContent('Cambio aceptado');
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it('rechaza solicitudes y muestra el error devuelto al responder', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: cambios });
    vi.mocked(apiClient.put)
      .mockResolvedValueOnce({ data: { mensaje: 'Rechazada' } })
      .mockRejectedValueOnce({ response: { data: { mensaje: 'Ya fue respondida' } } });
    render(<ListaCambiosTurno />, { wrapper });
    await screen.findByText('Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/cambios-turno/1/responder', { aceptar: false }));
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya fue respondida');
  });

  it('recupera un error de listado y cubre ambas listas vacías sin usuario', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue(null));
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ data: cambios });
    render(<ListaCambiosTurno refreshKey={1} />, { wrapper });
    expect(await screen.findByText(/Error al cargar las solicitudes/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('No has recibido solicitudes de cambio de turno.')).toBeInTheDocument();
    expect(screen.getByText('No has solicitado ningún cambio de turno.')).toBeInTheDocument();
  });
});
