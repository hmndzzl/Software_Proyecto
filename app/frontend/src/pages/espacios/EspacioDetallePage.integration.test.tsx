import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { authValue } from '../../test/authValue';
import { ROLES } from '../../utils/roles';
import EspacioDetallePage from './EspacioDetallePage';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const espacio = { id: 5, nombre: 'Salón Mayor', capacidad: 120, disponible: true };
const reservas = [
  { id: 1, fecha: '2099-10-20', hora_inicio: '08:00:00', hora_fin: '09:00:00', estado_reserva_id: 1, evento_titulo: 'Catequesis', evento_descripcion: 'Grupo juvenil' },
  { id: 2, fecha: '2099-10-21', hora_inicio: '10:00:00', hora_fin: '11:00:00', estado_reserva_id: 2, evento_titulo: null, evento_descripcion: null },
  { id: 3, fecha: '2099-10-22', hora_inicio: '12:00:00', hora_fin: '13:00:00', estado_reserva_id: 3, evento_titulo: 'Reunión', evento_descripcion: null },
  { id: 4, fecha: '2099-10-23', hora_inicio: '14:00:00', hora_fin: '15:00:00', estado_reserva_id: 99, evento_titulo: null, evento_descripcion: 'Descripción sola' },
];

function Destino() { return <p>Destino {useLocation().pathname}</p>; }
function mostrar() {
  return render(
    <ToastProvider><MemoryRouter initialEntries={['/espacios/5']}><Routes>
      <Route path="/espacios/:id" element={<EspacioDetallePage />} />
      <Route path="*" element={<Destino />} />
    </Routes></MemoryRouter></ToastProvider>
  );
}

describe('integración del detalle de un espacio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin', correo: 'a@test.com', rol_id: ROLES.ADMIN }));
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacio : reservas }));
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
  });

  it('muestra información, todos los estados y navega desde sus acciones', async () => {
    mostrar();
    await screen.findByRole('heading', { name: 'Salón Mayor' });
    expect(screen.getByText('120 personas')).toBeInTheDocument();
    expect(screen.getByText('Catequesis')).toBeInTheDocument();
    expect(screen.getByText('Reserva #2')).toBeInTheDocument();
    expect(screen.getByText('Descripción sola')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
    expect(screen.getByText('Rechazada')).toBeInTheDocument();
    expect(screen.getByText('Desconocido')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reservar' }));
    expect(await screen.findByText('Destino /reservas')).toBeInTheDocument();
  });

  it('aprueba y rechaza una reserva, notifica y vuelve a consultar', async () => {
    mostrar();
    await screen.findByText('Catequesis');
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/reservas/1/estado', { estado_id: 2 }));
    expect(await screen.findByRole('status')).toHaveTextContent('Reserva aprobada');
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/api/reservas/1/estado', { estado_id: 3 }));
    expect(await screen.findByRole('status')).toHaveTextContent('Reserva rechazada');
  });

  it('muestra el error del servidor al cambiar estado y oculta acciones sin permiso', async () => {
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { message: 'Conflicto de horario' } } });
    const vista = mostrar();
    await screen.findByText('Catequesis');
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto de horario');

    vista.unmount();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 4, nombre: 'Ministro', correo: 'm@test.com', rol_id: ROLES.MINISTRO }));
    mostrar();
    await screen.findByText('Catequesis');
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
  });

  it('presenta capacidad no definida y una lista vacía', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? { ...espacio, capacidad: null } : [] }));
    mostrar();
    expect(await screen.findByText('No definida')).toBeInTheDocument();
    expect(screen.getByText('No hay reservas para este espacio.')).toBeInTheDocument();
  });

  it('presenta errores, permite volver y reintenta la carga', async () => {
    vi.mocked(apiClient.get)
      .mockRejectedValueOnce({ response: { data: { message: 'Espacio eliminado' } } })
      .mockResolvedValueOnce({ data: [] })
      .mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacio : reservas }));
    mostrar();
    expect(await screen.findByText('Espacio eliminado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    await screen.findByRole('heading', { name: 'Salón Mayor' });
    await userEvent.click(screen.getByRole('button', { name: 'Espacios' }));
    expect(await screen.findByText('Destino /espacios')).toBeInTheDocument();
  });

  it('usa mensajes de red de respaldo al cargar y cambiar estado', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ data: [] });
    const vista = mostrar();
    expect(await screen.findByText('Espacio no encontrado')).toBeInTheDocument();
    vista.unmount();

    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).startsWith('/api/espacios/') ? espacio : reservas }));
    vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('red'));
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error al cambiar el estado de la reserva');
  });
});
