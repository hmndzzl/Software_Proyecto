import { render, screen, waitFor, within } from '@testing-library/react';
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

const grupo = { id: 3, nombre: 'Coro', coordinadores: [{ id: 7, nombre: 'Ana' }] };
const wrapper = ({ children }: { children: React.ReactNode }) => <ToastProvider>{children}</ToastProvider>;

describe('integración de grupos y permisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin', correo: 'a@a.com', rol_id: ROLES.ADMIN }));
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).includes('coordinadores') ? [{ id: 7, nombre: 'Ana' }] : [grupo] }));
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
  });

  it('lista, ordena y abre/edita/vuelve al detalle dentro del mismo modal', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).includes('coordinadores') ? [{ id: 7, nombre: 'Ana' }] : [grupo, { id: 4, nombre: 'Acólitos', coordinadores: [] }] }));
    render(<GruposPage />, { wrapper });
    await screen.findByText('Coro');
    for (const label of ['#', 'Nombre', 'Coordinador']) {
      const header = screen.getByRole('columnheader', { name: new RegExp(label) });
      await userEvent.click(header);
      await userEvent.click(header);
    }
    const filaCoro = screen.getByText('Coro').closest('tr')!;
    await userEvent.click(within(filaCoro).getByRole('button', { name: 'Editar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Editar Coro' });
    expect(within(dialogo).getByLabelText('Nombre del Grupo:')).toHaveValue('Coro');
    expect(within(dialogo).getByRole('button', { name: 'Volver a la tarjeta anterior' })).toBeInTheDocument();

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    const dialogoDetalle = screen.getByRole('dialog', { name: 'Coro' }); // vuelve al detalle, no cierra el modal
    expect(within(dialogoDetalle).queryByLabelText('Nombre del Grupo:')).not.toBeInTheDocument();
  });

  it('guarda cambios de nombre y coordinadores, y muestra errores de validación o del servidor', async () => {
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { mensaje: 'Duplicado' } } });
    const cambiado = vi.fn();
    render(<EditarGrupoForm grupo={grupo as any} onGrupoActualizado={cambiado} />, { wrapper });
    await screen.findByRole('checkbox', { name: 'Ana' });

    await userEvent.clear(screen.getByLabelText('Nombre del Grupo:'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Faltan datos');
    expect(cambiado).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Nombre del Grupo:'), 'Coro juvenil');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' })); // falla (Duplicado)
    expect(await screen.findByRole('alert')).toHaveTextContent('Duplicado');
    expect(cambiado).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' })); // reintento exitoso
    expect(apiClient.put).toHaveBeenLastCalledWith('/api/grupos/3', { nombre: 'Coro juvenil', coordinador_ids: [7] });
    expect(cambiado).toHaveBeenCalledOnce();
  });

  it('elimina un grupo tras confirmar, reintenta si falla, y se puede cancelar sin cerrar el modal', async () => {
    vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('red'));
    render(<ListaGrupos />, { wrapper });
    await screen.findByText('Coro');
    await userEvent.click(screen.getByText('Coro'));
    const dialogoDetalle = await screen.findByRole('dialog', { name: 'Coro' });
    await userEvent.click(within(dialogoDetalle).getByRole('button', { name: 'Eliminar grupo' }));

    const confirmacion = screen.getByRole('dialog', { name: 'Eliminar grupo' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1); // un solo diálogo, no uno anidado dentro de otro

    await userEvent.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }));
    expect(apiClient.delete).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Coro' })).toBeInTheDocument(); // vuelve al detalle, no cierra

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar grupo' }));
    await userEvent.click(within(confirmacion).getByRole('button', { name: 'Eliminar grupo' })); // falla la primera vez
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo eliminar el grupo');
    expect(screen.getByRole('dialog', { name: 'Eliminar grupo' })).toBeInTheDocument();

    await userEvent.click(within(confirmacion).getByRole('button', { name: 'Eliminar grupo' })); // reintento exitoso
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/api/grupos/3'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('recupera error, muestra vacío y oculta acciones sin permiso', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 9, nombre: 'Ministro', correo: 'm@m.com', rol_id: ROLES.MINISTRO }));
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValue({ data: [] });
    render(<ListaGrupos />, { wrapper });
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

  it('no duplica filas por varios coordinadores, y permite ver el detalle completo de los que no caben en la celda', async () => {
    const grupoVarios = { id: 5, nombre: 'Pastoral Juvenil', coordinadores: [
      { id: 7, nombre: 'Ana' }, { id: 8, nombre: 'Luis' }, { id: 9, nombre: 'Marta' },
    ] };
    vi.mocked(apiClient.get).mockImplementation(async url => ({
      data: String(url).includes('coordinadores') ? [{ id: 7, nombre: 'Ana' }] : [grupoVarios],
    }));
    render(<ListaGrupos />, { wrapper });

    await screen.findByText('Pastoral Juvenil');
    expect(screen.getAllByText('Pastoral Juvenil')).toHaveLength(1); // una sola fila, no una por coordinador

    const fila = screen.getByText('Pastoral Juvenil').closest('tr')!;
    expect(within(fila).getByText('Ana, Luis')).toBeInTheDocument(); // solo los primeros 2 en la celda
    expect(within(fila).queryByText('Marta', { exact: true })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver los 3 coordinadores de Pastoral Juvenil' }));
    const dialogo = screen.getByRole('dialog', { name: 'Pastoral Juvenil' });
    expect(within(dialogo).getByText('Ana')).toBeInTheDocument();
    expect(within(dialogo).getByText('Luis')).toBeInTheDocument();
    expect(within(dialogo).getByText('Marta')).toBeInTheDocument();
  });

  it('un grupo con 2 o menos coordinadores no muestra el botón "más"', async () => {
    render(<ListaGrupos />, { wrapper });
    await screen.findByText('Coro');
    expect(screen.queryByText(/\+\d+ más/)).not.toBeInTheDocument();
  });

  it('clickear la fila (no solo el nombre) abre el detalle con los coordinadores asignados', async () => {
    render(<ListaGrupos />, { wrapper });
    await screen.findByText('Coro');

    const celdaId = screen.getByRole('cell', { name: '3' });
    await userEvent.click(celdaId);

    const dialogo = await screen.findByRole('dialog', { name: 'Coro' });
    expect(within(dialogo).getByText('Coordinadores asignados (1)')).toBeInTheDocument();
    expect(within(dialogo).getByText('Ana')).toBeInTheDocument();
  });

  it('el botón de volver regresa de edición al detalle sin guardar', async () => {
    render(<ListaGrupos />, { wrapper });
    await screen.findByText('Coro');
    const fila = screen.getByText('Coro').closest('tr')!;
    await userEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    await screen.findByRole('dialog', { name: 'Editar Coro' });
    await userEvent.click(screen.getByRole('button', { name: 'Volver a la tarjeta anterior' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Coro' });
    expect(within(dialogo).queryByLabelText('Nombre del Grupo:')).not.toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it('guardar desde la tarjeta de edición refresca el listado y cierra el modal', async () => {
    render(<ListaGrupos />, { wrapper });
    await screen.findByText('Coro');
    const fila = screen.getByText('Coro').closest('tr')!;
    await userEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Editar Coro' });
    await userEvent.clear(within(dialogo).getByLabelText('Nombre del Grupo:'));
    await userEvent.type(within(dialogo).getByLabelText('Nombre del Grupo:'), 'Coro renovado');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(apiClient.get).toHaveBeenCalledWith('/api/grupos');
  });

  it('clickear el botón "Editar grupo" dentro del detalle cambia a edición sin cerrar el modal', async () => {
    render(<GruposPage />, { wrapper });
    await screen.findByText('Coro');

    await userEvent.click(screen.getByText('Coro'));
    const dialogo = await screen.findByRole('dialog', { name: 'Coro' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Editar grupo' }));

    const mismoDialogo = screen.getByRole('dialog', { name: 'Editar Coro' }); // mismo modal, ahora en edición
    expect(within(mismoDialogo).getByLabelText('Nombre del Grupo:')).toHaveValue('Coro');
  });
});
