import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EnviarNotificacionForm from './EnviarNotificacionForm';
import apiClient from '../../../api/client';
import { AuthProvider } from '../../../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockDestinatarios = [
  { id: 101, rol: 'sacerdote', nombre: 'Sacerdote Test', rol_nombre: 'Sacerdotes' },
  { id: 102, rol: 'ministro', nombre: 'Ministro Test', rol_nombre: 'Ministros' },
];

const mockGrupos = [
  { id: 1, nombre: 'Grupo Alpha' },
];

const mockEventos = [
  { id: 10, descripcion: 'Misa Dominical', fecha: '2026-10-10', hora_inicio: '10:00:00', hora_fin: '11:00:00' },
];

describe('EnviarNotificacionForm', () => {
  const onEnviada = vi.fn();
  const onCancelar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('usuario', JSON.stringify({ id: 1, rol_id: 1, nombre: 'Sacerdote' }));
    
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/api/notificaciones/destinatarios') return { data: mockDestinatarios };
      if (url === '/api/grupos') return { data: mockGrupos };
      if (url === '/api/eventos') return { data: mockEventos };
      return { data: [] };
    });
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
  });

  function renderForm() {
    render(
      <MemoryRouter>
        <AuthProvider>
          <EnviarNotificacionForm onEnviada={onEnviada} onCancelar={onCancelar} />
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it('permite enviar una notificacion individual', async () => {
    renderForm();
    await waitFor(() => expect(screen.queryByText('Cargando destinatarios…')).not.toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'individual' } });

    // Seleccionamos destinatarios checkbox. El texto está dentro de un span hermano al input, o el label envuelve al input.
    // getByLabelText de un label con texto "Sacerdote Test" funciona porque es un <label> con texto y un <input>.
    fireEvent.click(screen.getByLabelText('Sacerdote Test'));
    
    fireEvent.change(screen.getByPlaceholderText(/Escribe el mensaje/i), { target: { value: 'Mensaje de prueba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar notificación' }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/notificaciones', {
        tipo: 'individual',
        destinatarios: [101],
        requiere_confirmacion: false,
        evento_id: null,
        mensaje: 'Mensaje de prueba',
      });
      expect(onEnviada).toHaveBeenCalled();
    });
  });

  it('permite enviar una notificacion global', async () => {
    renderForm();
    await waitFor(() => expect(screen.queryByText('Cargando destinatarios…')).not.toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'global' } });
    
    fireEvent.change(screen.getByPlaceholderText(/Escribe el mensaje/i), { target: { value: 'Mensaje global' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar notificación' }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/notificaciones', {
        tipo: 'global',
        destinatarios: [],
        requiere_confirmacion: false,
        evento_id: null,
        mensaje: 'Mensaje global',
      });
    });
  });

  it('valida datos incompletos antes de enviar', async () => {
    renderForm();
    await waitFor(() => expect(screen.queryByText('Cargando destinatarios…')).not.toBeInTheDocument());

    // Tipo individual por defecto. Falla por falta de mensaje primero.
    fireEvent.click(screen.getByRole('button', { name: 'Enviar notificación' }));
    
    expect(await screen.findByText(/El mensaje es obligatorio./i)).toBeInTheDocument();
    
    fireEvent.change(screen.getByPlaceholderText(/Escribe el mensaje/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar notificación' }));
    
    expect(await screen.findByText(/Selecciona al menos un destinatario./i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('permite requerir confirmacion y seleccionar evento', async () => {
    renderForm();
    await waitFor(() => expect(screen.queryByText('Cargando destinatarios…')).not.toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'global' } });
    fireEvent.change(screen.getByPlaceholderText(/Escribe el mensaje/i), { target: { value: 'Confirmar evento' } });
    
    fireEvent.click(screen.getByLabelText('Requiere confirmación de asistencia'));
    
    // Al hacer check aparece el select de evento (combobox 1 o el ultimo)
    const allSelects = screen.getAllByRole('combobox');
    fireEvent.change(allSelects[allSelects.length - 1], { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar notificación' }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/notificaciones', expect.objectContaining({
        requiere_confirmacion: true,
        evento_id: 10,
      }));
    });
  });

  it('llama onCancelar al hacer clic en Cancelar', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalled();
  });

  it('muestra mensaje de error si el envío falla', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'));
    renderForm();
    await waitFor(() => expect(screen.queryByText('Cargando destinatarios…')).not.toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'global' } });
    fireEvent.change(screen.getByPlaceholderText(/Escribe el mensaje/i), { target: { value: 'Mensaje global' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar notificación' }));

    expect(await screen.findByText('Error al enviar la notificación. Intenta de nuevo.')).toBeInTheDocument();
  });

  it('permite colapsar grupos y seleccionar todos los miembros del grupo', async () => {
    renderForm();
    await waitFor(() => expect(screen.queryByText('Cargando destinatarios…')).not.toBeInTheDocument());
    
    // Al principio los grupos están abiertos, cerramos "Sacerdotes"
    const toggleSacerdotes = screen.getByText('Sacerdotes').closest('button')!;
    fireEvent.click(toggleSacerdotes);

    // Seleccionamos todos los Sacerdotes (debería haber un botón "Seleccionar todos" en el grupo Sacerdotes)
    // El primer "Seleccionar todos" es para Sacerdotes
    const seleccionarTodosBtns = screen.getAllByRole('button', { name: 'Seleccionar todos' });
    fireEvent.click(seleccionarTodosBtns[0]);
    
    // Reabrir el grupo para verificar que se seleccionó
    fireEvent.click(toggleSacerdotes);

    // Verificamos que se seleccionó
    // Sacerdote Test checkbox está seleccionado. El input checkbox es sibling del span
    const checkboxSacerdote = await screen.findByLabelText('Sacerdote Test') as HTMLInputElement;
    expect(checkboxSacerdote.checked).toBe(true);

    // Quitar seleccion
    fireEvent.click(screen.getByRole('button', { name: 'Quitar todos' }));
    expect(checkboxSacerdote.checked).toBe(false);
  });

  it('maneja error al cargar destinatarios o eventos', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));
    renderForm();
    // It should handle the error gracefully without throwing
    await waitFor(() => expect(screen.queryByText('Cargando destinatarios…')).not.toBeInTheDocument());
  });

  it('valida evento vacio cuando requiere confirmacion', async () => {
    renderForm();
    await waitFor(() => expect(screen.queryByText('Cargando destinatarios…')).not.toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'global' } });
    fireEvent.change(screen.getByPlaceholderText(/Escribe el mensaje/i), { target: { value: 'Confirmar evento' } });
    
    // Check requiere confirmacion but leave event empty
    fireEvent.click(screen.getByLabelText('Requiere confirmación de asistencia'));
    
    fireEvent.click(screen.getByRole('button', { name: 'Enviar notificación' }));

    expect(await screen.findByText('Selecciona el evento al que aplica la confirmación de asistencia.')).toBeInTheDocument();
  });
  it('muestra no hay eventos disponibles y permite deseleccionar requiere confirmacion', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/api/notificaciones/destinatarios') return { data: [{ id: 1, nombre: 'A', rol_id: 1 }] };
      return { data: [] }; // No eventos
    });
    renderForm();
    await waitFor(() => expect(screen.queryByText('Cargando destinatarios…')).not.toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'global' } });
    
    // Check requiere confirmacion
    fireEvent.click(screen.getByLabelText('Requiere confirmación de asistencia'));
    expect(screen.getByText('No hay eventos disponibles.')).toBeInTheDocument();
    
    // Uncheck requiere confirmacion
    fireEvent.click(screen.getByLabelText('Requiere confirmación de asistencia'));
    expect(screen.queryByText('No hay eventos disponibles.')).not.toBeInTheDocument();
  });

  it('permite usar boton Ninguno y Todos', async () => {
    localStorage.setItem('usuario', JSON.stringify({ id: 1, rol_id: 3, nombre: 'Coord Grupos' }));
    renderForm();
    await waitFor(() => expect(screen.queryByText('Cargando destinatarios…')).not.toBeInTheDocument());

    // Ninguno
    fireEvent.click(screen.getByRole('button', { name: 'Ninguno' }));
    
    // Todos
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    
    // Should be checked
    const check = screen.getByLabelText('Sacerdote Test');
    expect((check as HTMLInputElement).checked).toBe(true);
  });
});
