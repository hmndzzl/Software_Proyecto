import { act, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { meApi } from '../../api/auth';
import { readToken, readUsuario, saveSession } from '../../auth/sessionStore';
import { ROLES } from '../../utils/roles';

vi.mock('../../api/auth', () => ({ logoutApi: vi.fn(), meApi: vi.fn() }));

const ministro = { id: 9, nombre: 'Ministro', correo: 'm@test.com', rol_id: ROLES.MINISTRO };

let auth: ReturnType<typeof useAuth>;
function Espia() {
  auth = useAuth();
  return (
    <div>
      <span data-testid="estado">{auth.estado}</span>
      <span data-testid="rol">{auth.usuario?.rol_id ?? 'sin rol'}</span>
    </div>
  );
}

function mostrar() {
  render(<BrowserRouter><AuthProvider><Espia /></AuthProvider></BrowserRouter>);
}

describe('AuthContext — actualización de sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('estado: anónimo sin sesión y autenticado con sesión', () => {
    mostrar();
    expect(screen.getByTestId('estado')).toHaveTextContent('anonimo');
  });

  it('estado: autenticado cuando hay sesión guardada', () => {
    saveSession('tok', ministro);
    mostrar();
    expect(screen.getByTestId('estado')).toHaveTextContent('autenticado');
  });

  it('actualizarUsuario cambia el usuario en pantalla y en el almacén, sin tocar el token', () => {
    saveSession('tok', ministro);
    mostrar();

    act(() => auth.actualizarUsuario({ ...ministro, nombre: 'Nuevo nombre' }));

    expect(auth.usuario?.nombre).toBe('Nuevo nombre');
    expect(readUsuario()?.nombre).toBe('Nuevo nombre');
    expect(readToken()).toBe('tok');
  });

  it('refrescarUsuario vuelve a pedir el usuario al servidor y refleja el nuevo rol', async () => {
    saveSession('tok', ministro);
    mostrar();
    expect(screen.getByTestId('rol')).toHaveTextContent(String(ROLES.MINISTRO));
    vi.mocked(meApi).mockResolvedValue({ ...ministro, rol_id: ROLES.SACERDOTE });

    await act(async () => { await auth.refrescarUsuario(); });

    expect(screen.getByTestId('rol')).toHaveTextContent(String(ROLES.SACERDOTE));
    expect(readUsuario()?.rol_id).toBe(ROLES.SACERDOTE);
    expect(auth.tieneRol([ROLES.SACERDOTE])).toBe(true);
  });

  it('refrescarUsuario conserva la sesión actual si el servidor falla', async () => {
    saveSession('tok', ministro);
    mostrar();
    vi.mocked(meApi).mockRejectedValue(new Error('sin red'));

    await act(async () => {
      await expect(auth.refrescarUsuario()).rejects.toThrow('sin red');
    });

    expect(auth.usuario).toEqual(ministro);
    expect(readUsuario()).toEqual(ministro);
  });

  it('tieneRol respeta la jerarquía y es false sin sesión', () => {
    mostrar();
    expect(auth.tieneRol([ROLES.MINISTRO])).toBe(false);

    act(() => auth.setAuth('tok', { ...ministro, rol_id: ROLES.ADMIN }));

    expect(auth.tieneRol([ROLES.MINISTRO])).toBe(true);
  });

  it('refleja un login hecho en otra pestaña (evento storage)', () => {
    mostrar();
    expect(screen.getByTestId('estado')).toHaveTextContent('anonimo');

    act(() => {
      saveSession('tok', ministro);
      window.dispatchEvent(new StorageEvent('storage', { key: 'usuario' }));
    });

    expect(screen.getByTestId('estado')).toHaveTextContent('autenticado');
  });

  it('refleja un logout hecho en otra pestaña (evento storage)', () => {
    saveSession('tok', ministro);
    mostrar();

    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });

    expect(screen.getByTestId('estado')).toHaveTextContent('anonimo');
  });

  it('ignora cambios de claves que no son de sesión', () => {
    saveSession('tok', ministro);
    mostrar();

    act(() => {
      localStorage.removeItem('usuario');
      window.dispatchEvent(new StorageEvent('storage', { key: 'otra-clave' }));
    });

    expect(screen.getByTestId('estado')).toHaveTextContent('autenticado');
  });
});
