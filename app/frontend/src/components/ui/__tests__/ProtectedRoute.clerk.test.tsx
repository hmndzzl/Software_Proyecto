import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '../ProtectedRoute';
import ClerkSessionSync from '../../../auth/ClerkSessionSync';
import { AuthProvider, useAuth } from '../../../context/AuthContext';
import { meApi } from '../../../api/auth';
import { getLoginError, setLoginError } from '../../../auth/clerkSession';
import { saveSession } from '../../../auth/sessionStore';
import { ROLES } from '../../../utils/roles';

// Con Clerk activo, mientras no se sabe si hay sesión el estado es "cargando".
vi.mock('../../../auth/clerkSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../auth/clerkSession')>()),
  CLERK_ENABLED: true,
  signOutClerk: vi.fn(),
}));
vi.mock('../../../api/auth', () => ({ logoutApi: vi.fn(), meApi: vi.fn() }));

const clerk = {
  isLoaded: true,
  isSignedIn: false,
  userId: null as string | null,
  getToken: vi.fn(),
  signOut: vi.fn(),
};
vi.mock('@clerk/react', () => ({ useAuth: () => clerk }));

const ministro = { id: 9, nombre: 'Ministro', correo: 'm@test.com', rol_id: ROLES.MINISTRO };

let auth: ReturnType<typeof useAuth>;
function Espia() {
  auth = useAuth();
  return null;
}

function mostrar({ conSync = false } = {}) {
  render(
    <MemoryRouter initialEntries={['/privada']}>
      <AuthProvider>
        <Espia />
        {conSync && <ClerkSessionSync />}
        <Routes>
          <Route path="/login" element={<p>Pantalla de login</p>} />
          <Route
            path="/privada"
            element={<ProtectedRoute allowedRoles={[ROLES.MINISTRO]}><p>Contenido privado</p></ProtectedRoute>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ProtectedRoute con Clerk activo — estado "cargando"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setLoginError(null);
    Object.assign(clerk, { isLoaded: true, isSignedIn: false, userId: null });
    clerk.getToken.mockResolvedValue('token-clerk');
    clerk.signOut.mockResolvedValue(undefined);
  });

  afterEach(() => vi.useRealTimers());

  it('mientras Clerk valida la sesión muestra un spinner y no redirige al login', () => {
    mostrar();

    expect(screen.getByText('Validando tu sesión…')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla de login')).not.toBeInTheDocument();
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
    expect(auth.estado).toBe('cargando');
  });

  it('si ya hay una sesión guardada entra directo, sin esperar a Clerk', () => {
    saveSession('tok', ministro);
    mostrar();

    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
    expect(screen.queryByText('Validando tu sesión…')).not.toBeInTheDocument();
  });

  it('al terminar la validación sin usuario, redirige al login', () => {
    mostrar();

    act(() => auth.terminarValidacion());

    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });

  it('si la sesión llega mientras se valida, muestra el contenido', () => {
    mostrar();

    act(() => auth.setAuth('tok', ministro));

    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
  });

  it('si la validación nunca termina, a los 8 s deja de cargar y redirige al login', () => {
    vi.useFakeTimers();
    mostrar();
    expect(screen.getByText('Validando tu sesión…')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(7_999); });
    expect(screen.getByText('Validando tu sesión…')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });

  describe('integrado con ClerkSessionSync', () => {
    it('Clerk sin sesión: pasa de "cargando" al login sin quedarse en el spinner', async () => {
      mostrar({ conSync: true });

      await waitFor(() => expect(screen.getByText('Pantalla de login')).toBeInTheDocument());
      expect(meApi).not.toHaveBeenCalled();
    });

    it('Clerk con sesión: valida con /me y abre la ruta', async () => {
      Object.assign(clerk, { isSignedIn: true, userId: 'user_1' });
      vi.mocked(meApi).mockResolvedValue(ministro);

      mostrar({ conSync: true });
      expect(screen.getByText('Validando tu sesión…')).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText('Contenido privado')).toBeInTheDocument());
    });

    it('Clerk con sesión pero /me rechaza la cuenta: cierra Clerk, guarda el motivo y va al login', async () => {
      Object.assign(clerk, { isSignedIn: true, userId: 'user_1' });
      vi.mocked(meApi).mockRejectedValue({ response: { data: { mensaje: 'Tu cuenta está pendiente de aprobación.' } } });

      mostrar({ conSync: true });

      await waitFor(() => expect(screen.getByText('Pantalla de login')).toBeInTheDocument());
      expect(clerk.signOut).toHaveBeenCalled();
      expect(getLoginError()).toBe('Tu cuenta está pendiente de aprobación.');
    });

    it('Clerk con sesión pero sin token: no queda cargando y va al login', async () => {
      Object.assign(clerk, { isSignedIn: true, userId: 'user_1' });
      clerk.getToken.mockResolvedValue(null);

      mostrar({ conSync: true });

      await waitFor(() => expect(screen.getByText('Pantalla de login')).toBeInTheDocument());
      expect(meApi).not.toHaveBeenCalled();
    });

    it('Clerk aún sin cargar: sigue en "cargando" y no consulta /me', () => {
      Object.assign(clerk, { isLoaded: false, isSignedIn: false });

      mostrar({ conSync: true });

      expect(screen.getByText('Validando tu sesión…')).toBeInTheDocument();
      expect(meApi).not.toHaveBeenCalled();
    });
  });
});
