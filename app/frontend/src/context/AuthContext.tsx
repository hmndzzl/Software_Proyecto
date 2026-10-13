import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutApi, meApi } from '../api/auth';
import { CLERK_ENABLED, signOutClerk } from '../auth/clerkSession';
import {
  clearSession,
  esClaveDeSesion,
  readUsuario,
  saveSession,
  saveUsuario,
  type Usuario,
} from '../auth/sessionStore';
import { rolTieneAcceso } from '../utils/roles';

export type { Usuario };

/**
 * cargando: Clerk aún está validando la sesión, todavía no se sabe si hay usuario.
 * autenticado / anonimo: estado definitivo.
 */
export type EstadoAuth = 'cargando' | 'autenticado' | 'anonimo';

export interface AuthContextType {
  usuario: Usuario | null;
  estado: EstadoAuth;
  setAuth: (token: string, usuario: Usuario) => void;
  /** Reemplaza los datos del usuario (p. ej. tras editar el perfil) conservando el token. */
  actualizarUsuario: (usuario: Usuario) => void;
  /** Vuelve a pedir el usuario al servidor (rol, nombre…) y actualiza la sesión. */
  refrescarUsuario: () => Promise<Usuario>;
  /** Indica que terminó la validación inicial de la sesión (la llama ClerkSessionSync). */
  terminarValidacion: () => void;
  tieneRol: (rolesPermitidos: number[]) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Si la validación inicial nunca termina, no se deja la app cargando para siempre.
const VALIDACION_TIMEOUT_MS = 8_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(readUsuario);
  const [validando, setValidando] = useState(() => CLERK_ENABLED && readUsuario() === null);
  const navigate = useNavigate();

  const setAuth = useCallback((token: string, user: Usuario) => {
    saveSession(token, user);
    setUsuario(user);
    setValidando(false);
  }, []);

  const actualizarUsuario = useCallback((user: Usuario) => {
    saveUsuario(user);
    setUsuario(user);
  }, []);

  const refrescarUsuario = useCallback(async () => {
    const user = await meApi();
    saveUsuario(user);
    setUsuario(user);
    return user;
  }, []);

  const terminarValidacion = useCallback(() => setValidando(false), []);

  const logout = useCallback(async () => {
    try { await logoutApi(); } catch { /* si falla el logout de red, limpiamos igual */ }
    await signOutClerk();
    clearSession();
    setUsuario(null);
    setValidando(false);
    navigate('/login');
  }, [navigate]);

  // La sesión cambió en otra pestaña (login, logout o cambio de usuario): se refleja aquí.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (esClaveDeSesion(e.key)) setUsuario(readUsuario());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!validando) return;
    const id = setTimeout(() => setValidando(false), VALIDACION_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [validando]);

  const estado: EstadoAuth = usuario ? 'autenticado' : validando ? 'cargando' : 'anonimo';

  const value = useMemo<AuthContextType>(() => ({
    usuario,
    estado,
    setAuth,
    actualizarUsuario,
    refrescarUsuario,
    terminarValidacion,
    tieneRol: (rolesPermitidos) => rolTieneAcceso(usuario?.rol_id, rolesPermitidos),
    logout,
  }), [usuario, estado, setAuth, actualizarUsuario, refrescarUsuario, terminarValidacion, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
