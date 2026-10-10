import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import EventosPage from './eventos/EventosPage';
import CambiosTurnoPage from './cambios-turno/CambiosTurnoPage';
import ReservasPage from './reservas/ReservasPage';
import GruposPage from './grupos/gruposPage';
import { useAuth } from '../context/AuthContext';
import { authValue } from '../test/authValue';
import { ROLES } from '../utils/roles';

const evento = { id: 7, descripcion: 'Misa', encargado_id: 2, fecha: '2099-10-20', hora_inicio: '10:00', hora_fin: '11:00' };
const grupo = { id: 3, nombre: 'Coro', coordinador_id: 2 };

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../modules/eventos/components/ListaEventos', () => ({ default: ({ refreshKey, onEditar }: any) => <><span>eventos-{refreshKey}</span>{onEditar && <button onClick={() => onEditar(evento)}>seleccionar-evento</button>}</> }));
vi.mock('../modules/eventos/components/EditarEventoForm', () => ({ default: ({ onEventoActualizado, onCancelar }: any) => <><button onClick={onEventoActualizado}>guardar-evento</button><button onClick={onCancelar}>cancelar-evento</button></> }));
vi.mock('../modules/cambioTurno/components/SolicitarCambioTurnoForm', () => ({ default: ({ onSolicitudEnviada }: any) => <button onClick={onSolicitudEnviada}>enviar-cambio</button> }));
vi.mock('../modules/cambioTurno/components/ListaCambiosTurno', () => ({ default: ({ refreshKey }: any) => <span>cambios-{refreshKey}</span> }));
vi.mock('../modules/reservas/components/CrearReservaForm', () => ({ default: ({ autoFocus, onReservaCreada }: any) => <button data-focus={String(autoFocus)} onClick={onReservaCreada}>crear-reserva</button> }));
vi.mock('../modules/reservas/components/ListaReservas', () => ({ default: ({ refreshKey }: any) => <span>reservas-{refreshKey}</span> }));
vi.mock('../modules/grupos/components/ListaGrupos', () => ({ default: ({ refreshKey, onEditar }: any) => <><span>grupos-{refreshKey}</span><button onClick={() => onEditar(grupo)}>seleccionar-grupo</button></> }));
vi.mock('../modules/grupos/components/CrearGrupoForm', () => ({ default: ({ onGrupoCreado }: any) => <button onClick={onGrupoCreado}>crear-grupo</button> }));
vi.mock('../modules/grupos/components/EditarGrupoForm', () => ({ default: ({ onGrupoActualizado, onCancelar }: any) => <><button onClick={onGrupoActualizado}>guardar-grupo</button><button onClick={onCancelar}>cancelar-grupo</button></> }));

const mostrar = (ui: React.ReactNode, ruta = '/') => render(<MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>);

describe('callbacks de coordinación entre páginas y módulos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin', correo: 'a@test.com', rol_id: ROLES.ADMIN }));
  });

  it('eventos abre, cancela y guarda una edición actualizando la lista', async () => {
    mostrar(<EventosPage />);
    await userEvent.click(screen.getByText('seleccionar-evento'));
    await userEvent.click(screen.getByText('cancelar-evento'));
    expect(screen.queryByText('cancelar-evento')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('seleccionar-evento'));
    await userEvent.click(screen.getByText('guardar-evento'));
    expect(screen.getByText('eventos-1')).toBeInTheDocument();
  });

  it('eventos no entrega edición a un rol sin permiso', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 4, nombre: 'Ministro', correo: 'm@test.com', rol_id: ROLES.MINISTRO }));
    mostrar(<EventosPage />);
    expect(screen.queryByText('seleccionar-evento')).not.toBeInTheDocument();
  });

  it('cambios de turno y reservas incrementan su clave de refresco', async () => {
    const cambios = mostrar(<CambiosTurnoPage />);
    await userEvent.click(screen.getByText('enviar-cambio'));
    expect(screen.getByText('cambios-1')).toBeInTheDocument();
    cambios.unmount();

    mostrar(<ReservasPage />, '/reservas?nueva=1');
    expect(screen.getByText('crear-reserva')).toHaveAttribute('data-focus', 'true');
    await userEvent.click(screen.getByText('crear-reserva'));
    expect(screen.getByText('reservas-1')).toBeInTheDocument();
  });

  it('reservas no enfoca el formulario sin el parámetro nueva', () => {
    mostrar(<ReservasPage />, '/reservas');
    expect(screen.getByText('crear-reserva')).toHaveAttribute('data-focus', 'false');
  });

  it('grupos abre, cancela, crea y actualiza cerrando la edición', async () => {
    mostrar(<GruposPage />);
    await userEvent.click(screen.getByText('seleccionar-grupo'));
    await userEvent.click(screen.getByText('cancelar-grupo'));
    expect(screen.queryByText('cancelar-grupo')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('crear-grupo'));
    expect(screen.getByText('grupos-1')).toBeInTheDocument();
    await userEvent.click(screen.getByText('seleccionar-grupo'));
    await userEvent.click(screen.getByText('guardar-grupo'));
    expect(screen.getByText('grupos-2')).toBeInTheDocument();
  });
});
