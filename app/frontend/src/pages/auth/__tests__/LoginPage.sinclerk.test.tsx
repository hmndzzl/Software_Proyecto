import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Sin VITE_CLERK_PUBLISHABLE_KEY no hay forma de iniciar sesión: la página lo avisa en vez de fallar.
vi.mock('@clerk/react', () => ({
  SignIn: () => <div data-testid="clerk-signin" />,
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
}));
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ usuario: null, setAuth: vi.fn(), logout: vi.fn() }),
}));

import LoginPage from '../LoginPage';

describe('LoginPage sin Clerk', () => {
  it('avisa que el inicio de sesión no está disponible y no muestra formularios', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('El inicio de sesión no está disponible');
    expect(screen.queryByTestId('clerk-signin')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('usuario@parroquia.com')).not.toBeInTheDocument();
  });
});
