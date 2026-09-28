import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Sidebar from '../Sidebar';
import { AuthProvider } from '../../../context/AuthContext';
import { ROLES } from '../../../utils/roles';

// Mocks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderWithRouterAndAuth = (rolId?: number) => {
    if (rolId) {
      localStorage.setItem('usuario', JSON.stringify({ rol_id: rolId }));
    }
    return render(
      <BrowserRouter>
        <AuthProvider>
          <Sidebar />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renderiza enlaces básicos permitidos sin rol específico', () => {
    renderWithRouterAndAuth();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
  });

  it('renderiza botón "Nuevo Registro" si el usuario tiene rol para reservas y navega al hacer click', () => {
    renderWithRouterAndAuth(ROLES.ADMIN);
    const btn = screen.getByText('Nuevo Registro');
    expect(btn).toBeInTheDocument();
    
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/reservas');
  });

  it('NO renderiza botón "Nuevo Registro" si el usuario es ministro', () => {
    renderWithRouterAndAuth(ROLES.MINISTRO);
    expect(screen.queryByText('Nuevo Registro')).not.toBeInTheDocument();
  });
});
