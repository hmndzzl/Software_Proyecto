import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClerkSessionSync from '../ClerkSessionSync';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { logoutApi, meApi } from '../../api/auth';
import { getLoginError, setLoginError } from '../clerkSession';
import { readAuthProvider, readUsuario, saveAuthProvider, saveSession } from '../sessionStore';
import { ROLES } from '../../utils/roles';

// Sesión de Clerk controlable desde cada prueba.
const clerk = {
  isLoaded: true,
  isSignedIn: true,
  userId: 'user_1' as string | null,
  getToken: vi.fn(),
  signOut: vi.fn(),
};
vi.mock('@clerk/react', () => ({ useAuth: () => clerk }));
vi.mock('../../api/auth', () => ({ logoutApi: vi.fn(), meApi: vi.fn() }));
vi.mock('../clerkSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../clerkSession')>()),
  signOutClerk: vi.fn(),
}));

const ministro = { id: 9, nombre: 'Ministro', correo: 'm@test.com', rol_id: ROLES.MINISTRO };

let auth: ReturnType<typeof useAuth>;
function Espia() {
  auth = useAuth();
  return <span data-testid="estado">{auth.estado}:{auth.usuario?.rol_id ?? '-'}</span>;
}

function mostrar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ClerkSessionSync />
        <Espia />
      </AuthProvider>
    </MemoryRouter>
  );
}

function cambiarVisibilidad(estado: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}
const volverALaPestana = () => cambiarVisibilidad('visible');

describe('ClerkSessionSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setLoginError(null);
    Object.assign(clerk, { isLoaded: true, isSignedIn: true, userId: 'user_1' });
    clerk.getToken.mockResolvedValue('token-clerk');
    clerk.signOut.mockResolvedValue(undefined);
    vi.mocked(meApi).mockResolvedValue(ministro);
    vi.mocked(logoutApi).mockResolvedValue(undefined);
  });

  it('al haber sesión de Clerk consulta /me y deja al usuario autenticado en el contexto', async () => {
    mostrar();

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent(`autenticado:${ROLES.MINISTRO}`));
    expect(meApi).toHaveBeenCalledTimes(1);
    expect(readUsuario()).toEqual(ministro);
    expect(readAuthProvider()).toBe('clerk');
  });

  it('si /me falla guarda el mensaje de error y cierra la sesión de Clerk', async () => {
    vi.mocked(meApi).mockRejectedValue({ response: { data: { mensaje: 'Tu cuenta está pendiente de aprobación.' } } });

    mostrar();

    await waitFor(() => expect(clerk.signOut).toHaveBeenCalled());
    expect(getLoginError()).toBe('Tu cuenta está pendiente de aprobación.');
    expect(screen.getByTestId('estado')).toHaveTextContent('anonimo');
  });

  it('si Clerk termina la sesión, cierra la sesión de la app una sola vez', async () => {
    saveSession('tok', ministro);
    saveAuthProvider('clerk');
    Object.assign(clerk, { isSignedIn: false, userId: null });

    mostrar();

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('anonimo'));
    expect(logoutApi).toHaveBeenCalledTimes(1);
    expect(readUsuario()).toBeNull();
    expect(readAuthProvider()).toBeNull();
  });

  it('no cierra la sesión heredada (sin proveedor Clerk) aunque Clerk no tenga sesión', async () => {
    saveSession('tok', ministro);
    Object.assign(clerk, { isSignedIn: false, userId: null });

    mostrar();

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('autenticado'));
    expect(logoutApi).not.toHaveBeenCalled();
  });

  it('al volver a la pestaña refresca el usuario y refleja el cambio de rol', async () => {
    saveSession('tok', ministro);
    saveAuthProvider('clerk');
    mostrar();
    expect(screen.getByTestId('estado')).toHaveTextContent(`autenticado:${ROLES.MINISTRO}`);
    vi.mocked(meApi).mockResolvedValue({ ...ministro, rol_id: ROLES.SACERDOTE });

    await act(async () => { volverALaPestana(); });

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent(`autenticado:${ROLES.SACERDOTE}`));
    expect(readUsuario()?.rol_id).toBe(ROLES.SACERDOTE);
  });

  it('si al volver a la pestaña el servidor rechaza la sesión (403), la cierra con el motivo', async () => {
    saveSession('tok', ministro);
    saveAuthProvider('clerk');
    mostrar();
    vi.mocked(meApi).mockRejectedValue({ response: { status: 403, data: { mensaje: 'Cuenta desactivada.' } } });

    await act(async () => { volverALaPestana(); });

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('anonimo'));
    expect(getLoginError()).toBe('Cuenta desactivada.');
  });

  it('si al volver a la pestaña falla la red, conserva la sesión', async () => {
    saveSession('tok', ministro);
    saveAuthProvider('clerk');
    mostrar();
    vi.mocked(meApi).mockRejectedValue(new Error('sin red'));

    await act(async () => { volverALaPestana(); });

    expect(screen.getByTestId('estado')).toHaveTextContent(`autenticado:${ROLES.MINISTRO}`);
    expect(logoutApi).not.toHaveBeenCalled();
  });

  it('al salir de la pestaña (oculta) no consulta /me', async () => {
    saveSession('tok', ministro);
    saveAuthProvider('clerk');
    mostrar();

    await act(async () => { cambiarVisibilidad('hidden'); });

    expect(meApi).not.toHaveBeenCalled();
  });

  it('sin sesión de Clerk, volver a la pestaña no consulta /me', async () => {
    saveSession('tok', ministro); // sesión heredada, sin proveedor Clerk
    Object.assign(clerk, { isSignedIn: false, userId: null });
    mostrar();

    await act(async () => { volverALaPestana(); });

    expect(meApi).not.toHaveBeenCalled();
    expect(screen.getByTestId('estado')).toHaveTextContent(`autenticado:${ROLES.MINISTRO}`);
  });

  it('deja de escuchar la pestaña al desmontarse', async () => {
    saveSession('tok', ministro);
    saveAuthProvider('clerk');
    const { unmount } = mostrar();
    unmount();

    await act(async () => { volverALaPestana(); });

    expect(meApi).not.toHaveBeenCalled();
  });

  it('cada vez que se vuelve a la pestaña se refresca (no hay límite mínimo entre consultas)', async () => {
    saveSession('tok', ministro);
    saveAuthProvider('clerk');
    mostrar();

    await act(async () => { volverALaPestana(); });
    await act(async () => { volverALaPestana(); });

    expect(meApi).toHaveBeenCalledTimes(2);
  });

  it('no sincroniza mientras Clerk todavía está cargando', async () => {
    Object.assign(clerk, { isLoaded: false });
    mostrar();
    await act(async () => {});
    expect(clerk.getToken).not.toHaveBeenCalled();
    expect(meApi).not.toHaveBeenCalled();
  });

  it('termina la validación sin consultar /me si Clerk no entrega token', async () => {
    clerk.getToken.mockResolvedValue(null);
    mostrar();
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('anonimo'));
    expect(meApi).not.toHaveBeenCalled();
  });

  it('usa el mensaje de respaldo cuando /me falla sin respuesta HTTP', async () => {
    vi.mocked(meApi).mockRejectedValue(new Error('red'));
    mostrar();
    await waitFor(() => expect(clerk.signOut).toHaveBeenCalled());
    expect(getLoginError()).toBe('No se pudo validar tu sesión. Intenta de nuevo.');
  });

});
