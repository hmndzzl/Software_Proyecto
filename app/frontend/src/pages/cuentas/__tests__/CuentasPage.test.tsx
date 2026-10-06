import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CuentasPage from '../CuentasPage';
import { ToastProvider } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { aprobarCuentaApi, crearCuentaApi, listarCuentasApi, rechazarCuentaApi, type Cuenta } from '../../../api/cuentas';
import { ROLES } from '../../../utils/roles';

vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../../api/cuentas', () => ({
  listarCuentasApi: vi.fn(),
  crearCuentaApi: vi.fn(),
  aprobarCuentaApi: vi.fn(),
  rechazarCuentaApi: vi.fn(),
}));

const pendiente = { id: 12, nombre: 'Ana López', correo: 'ana@gmail.com', rol_id: ROLES.MINISTRO, estado_cuenta: 'pendiente' as const };

function comoUsuario(rol_id: number) {
  vi.mocked(useAuth).mockReturnValue({
    usuario: { id: 1, nombre: 'Aprobador', correo: 'a@parroquia.com', rol_id },
    setAuth: vi.fn(),
    logout: vi.fn(),
  });
}

describe('CuentasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    comoUsuario(ROLES.ADMIN);
    vi.mocked(listarCuentasApi).mockResolvedValue([pendiente]);
  });

  it('lista las cuentas pendientes', async () => {
    render(<CuentasPage />, { wrapper: ToastProvider });

    expect(await screen.findByText('Ana López')).toBeInTheDocument();
    expect(screen.getByText('ana@gmail.com')).toBeInTheDocument();
    expect(listarCuentasApi).toHaveBeenCalledWith('pendiente');
  });

  it('muestra un estado vacío si no hay cuentas pendientes', async () => {
    vi.mocked(listarCuentasApi).mockResolvedValue([]);

    render(<CuentasPage />, { wrapper: ToastProvider });

    expect(await screen.findByText('No hay cuentas pendientes de aprobación.')).toBeInTheDocument();
  });

  it('aprueba con Ministro por defecto y quita la cuenta de la lista', async () => {
    vi.mocked(aprobarCuentaApi).mockResolvedValue();
    render(<CuentasPage />, { wrapper: ToastProvider });

    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));

    expect(aprobarCuentaApi).toHaveBeenCalledWith(12, ROLES.MINISTRO);
    expect(await screen.findByRole('status')).toHaveTextContent('Cuenta aprobadaAna López ya puede iniciar sesión como Ministro.');
    expect(screen.queryByText('ana@gmail.com')).not.toBeInTheDocument();
  });

  it('aprueba con el rol elegido por quien aprueba', async () => {
    vi.mocked(aprobarCuentaApi).mockResolvedValue();
    render(<CuentasPage />, { wrapper: ToastProvider });

    await userEvent.selectOptions(await screen.findByLabelText('Rol para Ana López'), String(ROLES.COORDINADOR_GRUPOS));
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }));

    expect(aprobarCuentaApi).toHaveBeenCalledWith(12, ROLES.COORDINADOR_GRUPOS);
  });

  it('el Sacerdote no puede elegir el rol de Administrador, el Admin sí', async () => {
    comoUsuario(ROLES.SACERDOTE);
    const { unmount } = render(<CuentasPage />, { wrapper: ToastProvider });
    const selectSacerdote = await screen.findByLabelText('Rol para Ana López');
    expect(within(selectSacerdote).queryByRole('option', { name: 'Administrador' })).not.toBeInTheDocument();
    unmount();

    comoUsuario(ROLES.ADMIN);
    render(<CuentasPage />, { wrapper: ToastProvider });
    const selectAdmin = await screen.findByLabelText('Rol para Ana López');
    expect(within(selectAdmin).getByRole('option', { name: 'Administrador' })).toBeInTheDocument();
  });

  it('pide confirmación antes de rechazar y luego quita la cuenta', async () => {
    vi.mocked(rechazarCuentaApi).mockResolvedValue();
    render(<CuentasPage />, { wrapper: ToastProvider });

    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    expect(rechazarCuentaApi).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Rechazar cuenta' }));

    await waitFor(() => expect(rechazarCuentaApi).toHaveBeenCalledWith(12));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cuenta rechazadaAna López no podrá entrar al sistema. Puedes volver a aprobarla desde la pestaña Rechazadas.'
    );
    expect(screen.queryByText('ana@gmail.com')).not.toBeInTheDocument();
  });

  it('cancelar el rechazo no cambia nada', async () => {
    render(<CuentasPage />, { wrapper: ToastProvider });

    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(rechazarCuentaApi).not.toHaveBeenCalled();
    expect(screen.getByText('ana@gmail.com')).toBeInTheDocument();
  });

  it('muestra el mensaje del servidor si la acción falla y conserva la cuenta', async () => {
    vi.mocked(aprobarCuentaApi).mockRejectedValue({ response: { data: { mensaje: 'La cuenta ya está activa' } } });
    render(<CuentasPage />, { wrapper: ToastProvider });

    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo aprobar la cuenta');
    expect(screen.getByRole('alert')).toHaveTextContent('La cuenta ya está activa');
    expect(screen.getByText('ana@gmail.com')).toBeInTheDocument();
  });

  it('la pestaña Rechazadas carga las rechazadas y solo ofrece aprobar', async () => {
    vi.mocked(listarCuentasApi).mockImplementation(async (estado) =>
      estado === 'rechazada' ? [{ ...pendiente, estado_cuenta: 'rechazada' }] : [pendiente]
    );
    render(<CuentasPage />, { wrapper: ToastProvider });
    await screen.findByText('Ana López');

    await userEvent.click(screen.getByRole('tab', { name: 'Rechazadas' }));

    await waitFor(() => expect(listarCuentasApi).toHaveBeenCalledWith('rechazada'));
    expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
  });

  describe('nueva cuenta', () => {
    const abrirFormulario = async () => {
      await screen.findByText('Ana López');
      await userEvent.click(screen.getByRole('button', { name: 'Nueva cuenta' }));
    };

    const llenar = async (password = 'clave-segura') => {
      await userEvent.type(screen.getByLabelText('Nombre completo'), 'Luis Pérez');
      await userEvent.type(screen.getByLabelText('Correo electrónico'), 'luis@parroquia.com');
      await userEvent.type(screen.getByLabelText('Contraseña inicial'), password);
    };

    it('crea la cuenta con el rol elegido y avisa que ya puede iniciar sesión', async () => {
      vi.mocked(crearCuentaApi).mockResolvedValue({});
      render(<CuentasPage />, { wrapper: ToastProvider });
      await abrirFormulario();

      await llenar();
      await userEvent.selectOptions(screen.getByLabelText('Rol de la nueva cuenta'), String(ROLES.COORDINADOR_MINISTROS));
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

      await waitFor(() => expect(crearCuentaApi).toHaveBeenCalledWith({
        nombre: 'Luis Pérez',
        correo: 'luis@parroquia.com',
        password: 'clave-segura',
        rol_id: ROLES.COORDINADOR_MINISTROS,
      }));
      expect(await screen.findByRole('status')).toHaveTextContent('Cuenta creadaLuis Pérez ya puede iniciar sesión como Coord. de Ministros con su correo y la contraseña inicial.');
      expect(screen.queryByRole('button', { name: 'Crear cuenta' })).not.toBeInTheDocument();
      // Se pasa a la pestaña Activas para que se vea la cuenta recién creada.
      await waitFor(() => expect(listarCuentasApi).toHaveBeenLastCalledWith('activa'));
      expect(screen.getByRole('tab', { name: 'Activas' })).toHaveAttribute('aria-selected', 'true');
    });

    it('avisa con una advertencia (no como éxito) si la cuenta se creó pero Clerk la rechazó', async () => {
      vi.mocked(crearCuentaApi).mockResolvedValue({ advertencia: 'No se pudo crear el usuario en Clerk (That external id is taken).' });
      render(<CuentasPage />, { wrapper: ToastProvider });
      await abrirFormulario();

      await llenar();
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

      const aviso = await screen.findByRole('status');
      expect(aviso).toHaveTextContent('Cuenta creada con una advertencia');
      expect(aviso).toHaveTextContent('Luis Pérez quedó registrado como Ministro.');
      expect(aviso).toHaveTextContent('No se pudo crear el usuario en Clerk');
      expect(aviso).not.toHaveTextContent('ya puede iniciar sesión como Ministro con su correo');
    });

    it('exige una contraseña de al menos 8 caracteres sin llamar al servidor', async () => {
      render(<CuentasPage />, { wrapper: ToastProvider });
      await abrirFormulario();

      await llenar('corta');
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('al menos 8 caracteres');
      expect(crearCuentaApi).not.toHaveBeenCalled();
    });

    it('muestra el mensaje del servidor (p. ej. correo duplicado) y deja el formulario abierto', async () => {
      vi.mocked(crearCuentaApi).mockRejectedValue({ response: { data: { mensaje: 'El correo ya está registrado' } } });
      render(<CuentasPage />, { wrapper: ToastProvider });
      await abrirFormulario();

      await llenar();
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('El correo ya está registrado');
      expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument();
    });

    it('el Sacerdote no ve el rol Administrador al crear una cuenta', async () => {
      comoUsuario(ROLES.SACERDOTE);
      render(<CuentasPage />, { wrapper: ToastProvider });
      await abrirFormulario();

      expect(within(screen.getByLabelText('Rol de la nueva cuenta')).queryByRole('option', { name: 'Administrador' })).not.toBeInTheDocument();
    });
  });

  describe('pestaña Activas', () => {
    const luis = { id: 20, nombre: 'Luis Pérez', correo: 'luis@parroquia.com', rol_id: ROLES.COORDINADOR_MINISTROS, estado_cuenta: 'activa' as const };

    const abrirActivas = async (activas: Cuenta[]) => {
      vi.mocked(listarCuentasApi).mockImplementation(async (estado) => (estado === 'activa' ? activas : [pendiente]));
      render(<CuentasPage />, { wrapper: ToastProvider });
      await screen.findByText('Ana López');
      await userEvent.click(screen.getByRole('tab', { name: 'Activas' }));
    };

    it('lista las cuentas activas con su rol y solo ofrece rechazar', async () => {
      await abrirActivas([luis]);

      expect(await screen.findByText('Luis Pérez')).toBeInTheDocument();
      expect(screen.getByText('Coord. de Ministros')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
    });

    it('rechaza una cuenta activa tras confirmar, explicando que dejará de poder entrar', async () => {
      vi.mocked(rechazarCuentaApi).mockResolvedValue();
      await abrirActivas([luis]);

      await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
      expect(screen.getByText(/ya no pertenece a la parroquia/)).toBeInTheDocument();
      expect(rechazarCuentaApi).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Rechazar cuenta' }));

      await waitFor(() => expect(rechazarCuentaApi).toHaveBeenCalledWith(20));
      expect(await screen.findByRole('status')).toHaveTextContent('Cuenta rechazadaLuis Pérez ya no tiene acceso al sistema.');
      expect(screen.queryByText('luis@parroquia.com')).not.toBeInTheDocument();
    });

    it('no ofrece rechazar la propia cuenta', async () => {
      await abrirActivas([luis, { ...luis, id: 1, nombre: 'Aprobador', correo: 'a@parroquia.com' }]);

      await screen.findByText('Aprobador');
      expect(screen.getAllByRole('button', { name: 'Rechazar' })).toHaveLength(1);
    });

    it('el Sacerdote no puede rechazar a un Administrador, el Admin sí', async () => {
      const admin = { ...luis, id: 30, nombre: 'Admin Dos', correo: 'admin2@parroquia.com', rol_id: ROLES.ADMIN };

      comoUsuario(ROLES.SACERDOTE);
      vi.mocked(listarCuentasApi).mockImplementation(async (estado) => (estado === 'activa' ? [admin, luis] : []));
      render(<CuentasPage />, { wrapper: ToastProvider });
      await userEvent.click(screen.getByRole('tab', { name: 'Activas' }));
      await screen.findByText('Admin Dos');
      expect(screen.getAllByRole('button', { name: 'Rechazar' })).toHaveLength(1); // solo la de Luis
    });

    it('un Admin puede rechazar a otro Administrador', async () => {
      const admin = { ...luis, id: 30, nombre: 'Admin Dos', correo: 'admin2@parroquia.com', rol_id: ROLES.ADMIN };
      await abrirActivas([admin, luis]);

      await screen.findByText('Admin Dos');
      expect(screen.getAllByRole('button', { name: 'Rechazar' })).toHaveLength(2);
    });
  });

  it('el aviso se puede cerrar y se cierra solo', async () => {
    vi.mocked(aprobarCuentaApi).mockResolvedValue();
    render(<CuentasPage />, { wrapper: ToastProvider });
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    await screen.findByRole('status');

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('muestra error con opción de reintentar si falla la carga', async () => {
    vi.mocked(listarCuentasApi).mockRejectedValueOnce(new Error('red'));
    render(<CuentasPage />, { wrapper: ToastProvider });

    expect(await screen.findByText('Error al obtener las cuentas')).toBeInTheDocument();
  });
});
