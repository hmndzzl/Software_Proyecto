import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';
import { logoutApi } from '../../api/auth';

vi.mock('../../api/auth', () => ({
  logoutApi: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const TestComponent = () => {
  const { usuario, setAuth, logout } = useAuth();
  return (
    <div>
      <span data-testid="user">{usuario ? usuario.nombre : 'No User'}</span>
      <button onClick={() => setAuth('token-123', { id: 1, nombre: 'Juan', correo: 'juan@test.com', rol_id: 1 })}>Set Auth</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

const NoAuthComponent = () => {
  useAuth();
  return <div />;
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('debería inicializar sin usuario', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
  });

  it('debería setear el usuario, guardar en localStorage y actualizar el estado', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );
    fireEvent.click(screen.getByText('Set Auth'));
    expect(screen.getByTestId('user')).toHaveTextContent('Juan');
    expect(localStorage.getItem('token')).toBe('token-123');
    expect(localStorage.getItem('usuario')).toContain('Juan');
  });

  it('debería hacer logout, limpiar localStorage y navegar al login', async () => {
    localStorage.setItem('usuario', JSON.stringify({ nombre: 'Juan' }));
    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByTestId('user')).toHaveTextContent('Juan');
    
    await act(async () => {
      fireEvent.click(screen.getByText('Logout'));
    });
    
    expect(logoutApi).toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('usuario')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
  });

  it('debería hacer logout igual si la API falla', async () => {
    vi.mocked(logoutApi).mockRejectedValueOnce(new Error('Network error'));
    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );
    await act(async () => {
      fireEvent.click(screen.getByText('Logout'));
    });
    
    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('debería cargar usuario desde localStorage inicial si es válido JSON', () => {
    localStorage.setItem('usuario', JSON.stringify({ nombre: 'Pedro' }));
    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByTestId('user')).toHaveTextContent('Pedro');
  });

  it('NO debería cargar usuario desde localStorage inicial si no es JSON válido', () => {
    localStorage.setItem('usuario', 'no es json');
    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
  });

  it('debería tirar error si se usa outside of AuthProvider', () => {
    // Para que no explote la consola de jest
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<NoAuthComponent />)).toThrow('useAuth debe usarse dentro de AuthProvider');
    consoleError.mockRestore();
  });
});
