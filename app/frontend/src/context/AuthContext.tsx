import { createContext, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutApi } from '../api/auth';

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

  const setAuth = (token: string, user: Usuario) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(user));
    setUsuario(user);
  };

  const logout = async () => {
    try { await logoutApi(); } catch { /* si falla el logout de red, limpiamos igual */ }
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
    navigate('/login');
  };

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
