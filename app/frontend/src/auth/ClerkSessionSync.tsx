import { useEffect, useRef } from 'react';
import { useAuth as useClerkAuth } from '@clerk/react';
import { useAuth } from '../context/AuthContext';
import { meApi } from '../api/auth';
import { AUTH_PROVIDER_KEY, clearClerkSession, registerClerkSession, setLoginError } from './clerkSession';

/**
 * Sincroniza la sesión de Clerk con el AuthContext existente: al iniciar sesión
 * en Clerk consulta /api/auth/me y guarda el usuario (con su rol_id de la BD)
 * igual que el login anterior, así ProtectedRoute y el resto de la app no cambian.
 */
export default function ClerkSessionSync() {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useClerkAuth();
  const { usuario, setAuth, logout } = useAuth();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      registerClerkSession(() => getToken(), () => signOut());
    } else {
      clearClerkSession();
    }
  }, [isLoaded, isSignedIn, getToken, signOut]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      syncedFor.current = null;
      // La sesión de Clerk terminó (expiró o se cerró en otra pestaña).
      if (usuario && localStorage.getItem(AUTH_PROVIDER_KEY) === 'clerk') {
        void logout();
      }
      return;
    }

    if (usuario || syncedFor.current === userId) return;
    syncedFor.current = userId;
    setLoginError(null);

    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const user = await meApi();
        localStorage.setItem(AUTH_PROVIDER_KEY, 'clerk');
        setAuth(token, user);
      } catch (err: any) {
        // Se guarda antes de cerrar la sesión: al redirigir al login, ese mensaje es el que se muestra.
        setLoginError(err.response?.data?.mensaje || 'No se pudo validar tu sesión. Intenta de nuevo.');
        await signOut();
      }
    })();
  }, [isLoaded, isSignedIn, userId, usuario, getToken, signOut, setAuth, logout]);

  return null;
}
