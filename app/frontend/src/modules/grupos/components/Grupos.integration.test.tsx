import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GruposPage from '../../../pages/grupos/gruposPage';
import ListaGrupos from './ListaGrupos';
import EditarGrupoForm from './EditarGrupoForm';
import { ToastProvider } from '../../../context/ToastContext';
import apiClient from '../../../api/client';
import { useAuth } from '../../../context/AuthContext';
import { authValue } from '../../../test/authValue';
import { ROLES } from '../../../utils/roles';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const grupo = { id: 3, nombre: 'Coro', coordinador_id: 7, nombre_coordinador: 'Ana' };
const wrapper = ({ children }: { children: React.ReactNode }) => <ToastProvider>{children}</ToastProvider>;

describe('integración de grupos y permisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin', correo: 'a@a.com', rol_id: ROLES.ADMIN }));
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).includes('coordinadores') ? [{ id: 7, nombre: 'Ana' }] : [grupo] }));
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
  });

  it('lista, ordena y abre/cierra la edición desde la página', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).includes('coordinadores') ? [{ id: 7, nombre: 'Ana' }] : [grupo, { id: 4, nombre: 'Acólitos', coordinador_id: null, nombre_coordinador: null }] }));
    render(<GruposPage />, { wrapper });
    await screen.findByText('Coro');
    for (const label of ['#', 'Nombre', 'Coordinador']) {
      const header = screen.getByRole('columnheader', { name: new RegExp(label) });
      await userEvent.click(header);
      await userEvent.click(header);
    }
    await userEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
    expect(screen.getAllByText('Editar Grupo')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Editar Grupo')).not.toBeInTheDocument();
  });

  it('actualiza y elimina tras confirmar', async () => {
    const cambiado = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<EditarGrupoForm grupo={grupo as any} onGrupoActualizado={cambiado} />, { wrapper });
    await screen.findByRole('option', { name: 'Ana' });
    await userEvent.clear(screen.getByLabelText('Nombre del Grupo:'));
    await userEvent.type(screen.getByLabelText('Nombre del Grupo:'), 'Coro juvenil');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    expect(apiClient.put).toHaveBeenCalledWith('/api/grupos/3', { nombre: 'Coro juvenil', coordinador_id: 7 });
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(apiClient.delete).toHaveBeenCalledWith('/api/grupos/3');
    expect(cambiado).toHaveBeenCalledTimes(2);
  });

  it('valida, cancela eliminación y muestra errores del servidor', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { mensaje: 'Duplicado' } } });
    render(<EditarGrupoForm grupo={grupo as any} />, { wrapper });
    await userEvent.clear(screen.getByLabelText('Nombre del Grupo:'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Faltan datos');
    await userEvent.type(screen.getByLabelText('Nombre del Grupo:'), 'Coro');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Duplicado');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('recupera error, muestra vacío y oculta acciones sin permiso', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 9, nombre: 'Ministro', correo: 'm@m.com', rol_id: ROLES.MINISTRO }));
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValue({ data: [] });
    render(<ListaGrupos onEditar={vi.fn()} />, { wrapper });
    expect(await screen.findByText('Error de red al obtener los grupos.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('No hay grupos registrados.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('oculta el formulario de creación a quien no tiene permiso', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 9, nombre: 'Ministro', correo: 'm@m.com', rol_id: ROLES.MINISTRO }));
    render(<GruposPage />, { wrapper });
    await screen.findByText('Coro');
    expect(screen.queryByText('Crear Nuevo Grupo')).not.toBeInTheDocument();
  });
});
