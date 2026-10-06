import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Sin VITE_CLERK_PUBLISHABLE_KEY la app solo usa el acceso con JWT propio.
vi.mock('@clerk/react', () => ({
  SignIn: () => <div data-testid="clerk-signin" />,
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
}));
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ usuario: null, setAuth: vi.fn(), logout: vi.fn() }),
}));
vi.mock('../../../api/auth', () => ({ loginApi: vi.fn() }));

import LoginPage from '../LoginPage';

describe('LoginPage sin Clerk', () => {
  it('muestra directamente el formulario de correo y contraseña, sin opción de cambiar de acceso', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('usuario@parroquia.com')).toBeInTheDocument();
    expect(screen.queryByTestId('clerk-signin')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Usar el nuevo acceso' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Usar el acceso anterior' })).not.toBeInTheDocument();
  });
});
