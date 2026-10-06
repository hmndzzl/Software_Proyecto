import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// CLERK_ENABLED se calcula al importar el módulo: la key se define antes de los imports.
vi.hoisted(() => {
  vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_123');
});

const clerkAuth = vi.hoisted(() => ({ isLoaded: true, isSignedIn: false }));
vi.mock('@clerk/react', () => ({
  SignIn: () => <div data-testid="clerk-signin">Formulario de Clerk</div>,
  useAuth: () => clerkAuth,
}));

const sesion = vi.hoisted(() => ({ usuario: null as null | { id: number }, setAuth: vi.fn() }));
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ usuario: sesion.usuario, setAuth: sesion.setAuth, logout: vi.fn() }),
}));

vi.mock('../../../api/auth', () => ({ loginApi: vi.fn() }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => navigate,
}));

import LoginPage from '../LoginPage';
import { loginApi } from '../../../api/auth';
import { getLoginError, setLoginError } from '../../../auth/clerkSession';

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

describe('LoginPage con Clerk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clerkAuth.isLoaded = true;
    clerkAuth.isSignedIn = false;
    sesion.usuario = null;
    setLoginError(null);
  });

  afterEach(() => setLoginError(null));

  it('muestra el formulario de Clerk sin mensaje de error por defecto', () => {
    renderLogin();

    expect(screen.getByTestId('clerk-signin')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('muestra de forma persistente el error guardado por el intento de entrada', () => {
    setLoginError('Tu cuenta está pendiente de aprobación.');

    renderLogin();

    expect(screen.getByRole('alert')).toHaveTextContent('Tu cuenta está pendiente de aprobación.');
    expect(screen.getByTestId('clerk-signin')).toBeInTheDocument();
  });

  it('muestra el error cuando llega con la pantalla ya abierta', async () => {
    renderLogin();

    act(() => setLoginError('Tu cuenta no fue aprobada.'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu cuenta no fue aprobada.');
  });

  it('el error se puede cerrar', async () => {
    setLoginError('Tu cuenta está pendiente de aprobación.');
    renderLogin();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar mensaje' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(getLoginError()).toBeNull();
  });

  it('con sesión de Clerk activa muestra "Validando" en lugar del formulario', () => {
    clerkAuth.isSignedIn = true;

    renderLogin();

    expect(screen.queryByTestId('clerk-signin')).not.toBeInTheDocument();
    expect(screen.getByText('Validando tu sesión…')).toBeInTheDocument();
  });

  it('si Clerk aún no carga, muestra su formulario', () => {
    clerkAuth.isLoaded = false;
    clerkAuth.isSignedIn = true;

    renderLogin();

    expect(screen.getByTestId('clerk-signin')).toBeInTheDocument();
  });

  it('entra al dashboard cuando la sesión de Clerk ya fue validada (hay usuario)', () => {
    sesion.usuario = { id: 1 };

    renderLogin();

    expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  describe('acceso anterior', () => {
    const abrirAccesoAnterior = async () => {
      renderLogin();
      await userEvent.click(screen.getByRole('button', { name: 'Usar el acceso anterior' }));
    };

    it('se puede cambiar al acceso anterior y volver al de Clerk', async () => {
      await abrirAccesoAnterior();

      expect(screen.queryByTestId('clerk-signin')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('usuario@parroquia.com')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Usar el nuevo acceso' }));

      expect(screen.getByTestId('clerk-signin')).toBeInTheDocument();
    });

    it('inicia sesión con correo y contraseña y entra al dashboard', async () => {
      vi.mocked(loginApi).mockResolvedValue({ token: 't', mensaje: 'ok', usuario: { id: 3, nombre: 'Ana', correo: 'a@a.com', rol_id: 4 } });
      await abrirAccesoAnterior();

      await userEvent.type(screen.getByPlaceholderText('usuario@parroquia.com'), 'a@a.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'clave');
      await userEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

      expect(loginApi).toHaveBeenCalledWith('a@a.com', 'clave');
      expect(sesion.setAuth).toHaveBeenCalledWith('t', expect.objectContaining({ id: 3 }));
      expect(navigate).toHaveBeenCalledWith('/dashboard');
    });

    it('muestra el mensaje del servidor si las credenciales fallan', async () => {
      vi.mocked(loginApi).mockRejectedValue({ response: { data: { mensaje: 'Tu cuenta está pendiente de aprobación.' } } });
      await abrirAccesoAnterior();

      await userEvent.type(screen.getByPlaceholderText('usuario@parroquia.com'), 'a@a.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'clave');
      await userEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

      expect(await screen.findByText('Tu cuenta está pendiente de aprobación.')).toBeInTheDocument();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('muestra un mensaje genérico si el servidor no responde', async () => {
      vi.mocked(loginApi).mockRejectedValue(new Error('red'));
      await abrirAccesoAnterior();

      await userEvent.type(screen.getByPlaceholderText('usuario@parroquia.com'), 'a@a.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'clave');
      await userEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

      expect(await screen.findByText('Credenciales inválidas. Intenta de nuevo.')).toBeInTheDocument();
    });

    it('permite mostrar y ocultar la contraseña', async () => {
      await abrirAccesoAnterior();
      const campo = screen.getByPlaceholderText('••••••••');
      expect(campo).toHaveAttribute('type', 'password');

      await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
      expect(campo).toHaveAttribute('type', 'text');

      await userEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
      expect(campo).toHaveAttribute('type', 'password');
    });
  });
});
