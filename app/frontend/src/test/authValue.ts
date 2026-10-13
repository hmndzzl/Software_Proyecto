import { vi } from 'vitest';
import type { AuthContextType, Usuario } from '../context/AuthContext';
import { rolTieneAcceso } from '../utils/roles';

/** Valor completo de useAuth() para pruebas que mockean el contexto. */
export function authValue(usuario: Usuario | null, overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    usuario,
    estado: usuario ? 'autenticado' : 'anonimo',
    setAuth: vi.fn(),
    actualizarUsuario: vi.fn(),
    refrescarUsuario: vi.fn(),
    terminarValidacion: vi.fn(),
    tieneRol: (roles) => rolTieneAcceso(usuario?.rol_id, roles),
    logout: vi.fn(),
    ...overrides,
  };
}
