import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { authValue } from '../../test/authValue';
import { ROLES } from '../../utils/roles';
import DashboardPage from './DashboardPage';

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const mostrar = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>);
const futuras = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, fecha: `2099-11-${String(i + 1).padStart(2, '0')}`, hora_inicio: '08:00:00', descripcion: `Tarea ${i + 1}` }));

describe('integración del dashboard por rol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin General', correo: 'admin@test.com', rol_id: ROLES.ADMIN }));
    vi.mocked(apiClient.get).mockImplementation(async url => {
      if (url === '/api/reservas') return { data: [{ estado_reserva_id: 1 }, { estado_reserva_id: 2 }, { estado_reserva_id: 1 }] };
      if (url === '/api/tareas') return { data: [{ id: 99, fecha: '2000-01-01', hora_inicio: '07:00:00', descripcion: 'Pasada' }, ...futuras].reverse() };
      return { data: [{ id: 1 }, { id: 2 }, { id: 3 }] };
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('carga indicadores, filtra reservas y presenta solo cinco tareas futuras ordenadas', async () => {
    mostrar();
    expect(screen.getByRole('heading', { name: 'Bienvenido, Admin' })).toBeInTheDocument();
    expect(await screen.findByText('Tarea 1')).toBeInTheDocument();
    expect(screen.getByText('Tarea 5')).toBeInTheDocument();
    expect(screen.queryByText('Tarea 6')).not.toBeInTheDocument();
    expect(screen.queryByText('Pasada')).not.toBeInTheDocument();
    expect(screen.getByText('5 próximas')).toBeInTheDocument();
    expect(screen.getByText('Revisar ahora →')).toHaveAttribute('href', '/reservas');
    expect(screen.getByText('Gestionar Espacios')).toBeInTheDocument();
    for (const ruta of ['/api/grupos', '/api/personas', '/api/espacios', '/api/reservas', '/api/tareas']) {
      expect(apiClient.get).toHaveBeenCalledWith(ruta);
    }
  });

  it('aísla fallos de indicadores y tareas sin bloquear el panel', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('red'));
    mostrar();
    expect(await screen.findByText('No hay tareas próximas.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4));
    expect(screen.getByText('Accesos Rápidos')).toBeInTheDocument();
  });

  it('limita un ministro a tareas y eventos y maneja una agenda vacía', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 4, nombre: 'María Pérez', correo: 'm@test.com', rol_id: ROLES.MINISTRO }));
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    mostrar();
    expect(await screen.findByText('No hay tareas próximas.')).toBeInTheDocument();
    expect(screen.getByText(/Ministro · Parroquia/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tareas/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Eventos/ })).toBeInTheDocument();
    expect(screen.queryByText('Gestionar Espacios')).not.toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it('presenta un dashboard mínimo para un usuario ausente o rol desconocido', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue(null));
    mostrar();
    expect(screen.getByRole('heading', { name: 'Bienvenido, Usuario' })).toBeInTheDocument();
    expect(screen.getByText(/Panel de administración — Usuario/)).toBeInTheDocument();
    expect(screen.queryByText('Accesos Rápidos')).not.toBeInTheDocument();
    expect(screen.queryByText('Próximas Tareas')).not.toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
