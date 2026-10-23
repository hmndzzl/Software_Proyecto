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

  const renderWithRouterAndAuth = (rolId?: number, colapsado = false, onAlternar = vi.fn()) => {
    if (rolId) {
      localStorage.setItem('usuario', JSON.stringify({ rol_id: rolId }));
    }
    return render(
      <BrowserRouter>
        <AuthProvider>
          <Sidebar colapsado={colapsado} onAlternar={onAlternar} />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renderiza enlaces básicos permitidos sin rol específico', () => {
    renderWithRouterAndAuth();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configuración' })).toHaveAttribute('href', '/configuracion');
    expect(screen.queryByText('Ayuda y Soporte')).not.toBeInTheDocument();
  });

  it('renderiza botón "Nueva Reserva" si el usuario tiene rol para reservas y navega al hacer click', () => {
    renderWithRouterAndAuth(ROLES.ADMIN);
    const btn = screen.getByText('Nueva Reserva');
    expect(btn).toBeInTheDocument();
    
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/reservas');
  });

  it.each([ROLES.ADMIN, ROLES.SACERDOTE])('muestra el enlace "Cuentas" al rol %s', (rol) => {
    renderWithRouterAndAuth(rol);
    expect(screen.getByText('Cuentas')).toBeInTheDocument();
    expect(screen.getByText('Contenido público')).toBeInTheDocument();
  });

  it.each([ROLES.MINISTRO, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS])('oculta el enlace "Cuentas" al rol %s', (rol) => {
    renderWithRouterAndAuth(rol);
    expect(screen.queryByText('Cuentas')).not.toBeInTheDocument();
    expect(screen.queryByText('Contenido público')).not.toBeInTheDocument();
  });

  it.each([ROLES.ADMIN, ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS])('muestra reportes al rol %s', (rol) => {
    renderWithRouterAndAuth(rol);
    expect(screen.getByRole('link', { name: 'Reportes' })).toHaveAttribute('href', '/reportes');
  });

  it.each([ROLES.MINISTRO, ROLES.COORDINADOR_GRUPOS])('oculta reportes al rol %s', (rol) => {
    renderWithRouterAndAuth(rol);
    expect(screen.queryByRole('link', { name: 'Reportes' })).not.toBeInTheDocument();
  });

  it('NO renderiza botón "Nueva Reserva" si el usuario es ministro', () => {
    renderWithRouterAndAuth(ROLES.MINISTRO);
    expect(screen.queryByText('Nueva Reserva')).not.toBeInTheDocument();
  });

  it('llama a onAlternar al hacer click en el botón de colapsar', () => {
    const onAlternar = vi.fn();
    renderWithRouterAndAuth(undefined, false, onAlternar);

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar menú' }));
    expect(onAlternar).toHaveBeenCalledOnce();
  });

  it('oculta los textos y usa tooltips en los enlaces cuando está colapsado', () => {
    renderWithRouterAndAuth(ROLES.ADMIN, true);

    expect(screen.queryByText('San Pedro Nolasco')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Nueva Reserva')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('title', 'Dashboard');
    expect(screen.getByRole('button', { name: 'Mostrar menú' })).toBeInTheDocument();
  });
});
