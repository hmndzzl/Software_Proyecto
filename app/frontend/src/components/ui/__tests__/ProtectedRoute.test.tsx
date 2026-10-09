import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '../ProtectedRoute';
import { AuthProvider, useAuth } from '../../../context/AuthContext';
import { saveSession, saveUsuario } from '../../../auth/sessionStore';
import { ROLES } from '../../../utils/roles';

vi.mock('../../../api/auth', () => ({ logoutApi: vi.fn(), meApi: vi.fn() }));

const ministro = { id: 9, nombre: 'Ministro', correo: 'm@test.com', rol_id: ROLES.MINISTRO };
const admin = { id: 1, nombre: 'Admin', correo: 'a@test.com', rol_id: ROLES.ADMIN };

// Expone las acciones del contexto para simular cambios de sesión en vivo.
let auth: ReturnType<typeof useAuth>;
function Espia() {
  auth = useAuth();
  return null;
}

function mostrar(allowedRoles: number[]) {
  render(
    <MemoryRouter initialEntries={['/privada']}>
      <AuthProvider>
        <Espia />
        <Routes>
          <Route path="/login" element={<p>Pantalla de login</p>} />
          <Route path="/dashboard" element={<p>Pantalla de dashboard</p>} />
          <Route
            path="/privada"
            element={<ProtectedRoute allowedRoles={allowedRoles}><p>Contenido privado</p></ProtectedRoute>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => localStorage.clear());

  it('sin sesión redirige al login', () => {
    mostrar([ROLES.MINISTRO]);
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });

  it('con sesión y rol permitido muestra el contenido', () => {
    saveSession('tok', ministro);
    mostrar([ROLES.MINISTRO]);
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
  });

  it('con un rol sin acceso redirige al dashboard', () => {
    saveSession('tok', ministro);
    mostrar([ROLES.ADMIN]);
    expect(screen.getByText('Pantalla de dashboard')).toBeInTheDocument();
  });

  it('respeta la jerarquía de roles', () => {
    saveSession('tok', admin);
    mostrar([ROLES.MINISTRO]);
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
  });

  it('un usuario sin rol válido no tiene sesión utilizable', () => {
    saveSession('tok', { ...ministro, rol_id: 0 });
    mostrar([ROLES.MINISTRO]);
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });

  // La sesión ya no se valida por la presencia del token en localStorage: la fuente de
  // verdad es el usuario del contexto, y el servidor rechaza (401) un token inválido.
  it('un usuario guardado sin token en localStorage sigue teniendo acceso', () => {
    saveUsuario(ministro);
    expect(localStorage.getItem('token')).toBeNull();
    mostrar([ROLES.MINISTRO]);
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
  });

  it('un token suelto sin usuario no basta para entrar', () => {
    localStorage.setItem('token', 'tok');
    mostrar([ROLES.MINISTRO]);
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });

  it('sin Clerk, sin sesión no hay estado "cargando": redirige de inmediato', () => {
    mostrar([ROLES.MINISTRO]);
    expect(auth.estado).toBe('anonimo');
    expect(screen.queryByText('Validando tu sesión…')).not.toBeInTheDocument();
  });

  it('al cambiar el rol en vivo, la ruta pierde el acceso', () => {
    saveSession('tok', admin);
    mostrar([ROLES.ADMIN]);
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();

    act(() => auth.actualizarUsuario({ ...admin, rol_id: ROLES.MINISTRO }));

    expect(screen.getByText('Pantalla de dashboard')).toBeInTheDocument();
  });

  it('al cerrarse la sesión en otra pestaña, la ruta redirige al login', () => {
    saveSession('tok', ministro);
    mostrar([ROLES.MINISTRO]);
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();

    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: 'usuario', newValue: null }));
    });

    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });
});
