import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutApi } from '../api/auth';
import { AUTH_PROVIDER_KEY, signOutClerk } from '../auth/clerkSession';

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol_id: number;
}

interface AuthContextType {
  usuario: Usuario | null;
  setAuth: (token: string, usuario: Usuario) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const stored = localStorage.getItem('usuario');
    try { return stored ? JSON.parse(stored) : null; } catch { return null; }
  });
  const navigate = useNavigate();

  const setAuth = useCallback((token: string, user: Usuario) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(user));
    setUsuario(user);
  }, []);

  const logout = useCallback(async () => {
    try { await logoutApi(); } catch { /* si falla el logout de red, limpiamos igual */ }
    await signOutClerk();
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem(AUTH_PROVIDER_KEY);
    setUsuario(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ usuario, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
