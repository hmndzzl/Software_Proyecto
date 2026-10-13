import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { authValue } from '../../test/authValue';
import { ROLES } from '../../utils/roles';
import MinistrosPage from './MinistrosPage';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const wrapper = ({ children }: { children: React.ReactNode }) => <ToastProvider>{children}</ToastProvider>;
const ministros = [
  { id: 1, nombre: '  Ana María López ', correo: 'ana@test.com', rol_id: 1, disponible: true },
  { id: 2, nombre: 'Bruno', correo: 'bruno@test.com', rol_id: 99, disponible: false },
  { id: 3, nombre: 'Carla', correo: 'carla@test.com', disponible: true },
];

describe('integración del directorio de ministros', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 20, nombre: 'Coordinador', correo: 'coord@test.com', rol_id: ROLES.COORDINADOR_MINISTROS }));
    vi.mocked(apiClient.get).mockResolvedValue({ data: ministros });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
  });

  it('lista roles y disponibilidad, genera iniciales y ordena todas las columnas', async () => {
    render(<MinistrosPage />, { wrapper });
    await screen.findByText('Ana María López');
    expect(screen.getByText('AM')).toBeInTheDocument();
    expect(screen.getAllByText('Ministro')).toHaveLength(2);
    expect(screen.getAllByText('Disponible')).toHaveLength(2);
    for (const label of ['Nombre', 'Correo', 'Rol', 'Disponibilidad']) {
      const header = screen.getByRole('columnheader', { name: new RegExp(label) });
      await userEvent.click(header);
      await userEvent.click(header);
    }
  });

  it('cambia disponibilidad en ambos sentidos y refleja el resultado', async () => {
    render(<MinistrosPage />, { wrapper });
    await screen.findByText('Bruno');
    await userEvent.click(screen.getAllByRole('button', { name: 'Marcar no disponible' })[0]);
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/personas/1/disponibilidad', { disponible: false }));
    expect(await screen.findByRole('status')).toHaveTextContent('no disponible');

    await userEvent.click(screen.getAllByRole('button', { name: 'Marcar disponible' })[0]);
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/personas/1/disponibilidad', { disponible: true }));
  });

  it('mantiene el valor y muestra aviso cuando falla la actualización', async () => {
    vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error('red'));
    render(<MinistrosPage />, { wrapper });
    await screen.findByText('Bruno');
    await userEvent.click(screen.getAllByRole('button', { name: 'Marcar disponible' })[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo actualizar la disponibilidad');
    expect(screen.getAllByRole('button', { name: 'Marcar disponible' })).toHaveLength(1);
  });

  it('recupera errores de carga y presenta el directorio vacío', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ data: [] });
    render(<MinistrosPage />, { wrapper });
    expect(await screen.findByText('Error al obtener ministros')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('No hay ministros registrados.')).toBeInTheDocument();
  });

  it('oculta la gestión de disponibilidad a un ministro sin permiso', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 30, nombre: 'Ministro', correo: 'm@test.com', rol_id: ROLES.MINISTRO }));
    render(<MinistrosPage />, { wrapper });
    await screen.findByText('Bruno');
    expect(screen.queryByRole('button', { name: /Marcar/ })).not.toBeInTheDocument();
  });
});
