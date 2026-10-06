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
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ usuario: null, setAuth: vi.fn(), logout: vi.fn() }),
}));

import LoginPage from '../LoginPage';
import { getLoginError, setLoginError } from '../../../auth/clerkSession';

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

describe('LoginPage con Clerk', () => {
  beforeEach(() => {
    clerkAuth.isLoaded = true;
    clerkAuth.isSignedIn = false;
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
});
