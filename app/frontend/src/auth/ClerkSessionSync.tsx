import { useCallback, useEffect, useRef } from 'react';
import { useAuth as useClerkAuth } from '@clerk/react';
import { useAuth } from '../context/AuthContext';
import { meApi } from '../api/auth';
import { clearClerkSession, registerClerkSession, setLoginError } from './clerkSession';
import { readAuthProvider, saveAuthProvider } from './sessionStore';

/**
 * Sincroniza la sesión de Clerk con el AuthContext, que es la única fuente del estado
 * de autenticación: al iniciar sesión en Clerk consulta /api/auth/me y guarda el usuario
 * (con su rol_id de la BD); si Clerk cierra la sesión, la cierra también en la app, y al
 * volver a la pestaña refresca el usuario para reflejar cambios de rol.
 */
export default function ClerkSessionSync() {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useClerkAuth();
  const { usuario, setAuth, logout, refrescarUsuario, terminarValidacion } = useAuth();
  const syncedFor = useRef<string | null>(null);
  const cerrando = useRef(false);
  const autenticado = Boolean(usuario);

  // logout() desencadena un cambio en Clerk que re-ejecuta los efectos; sin esta guarda se cerraría dos veces.
  const cerrarSesion = useCallback(() => {
    if (cerrando.current) return;
    cerrando.current = true;
    void logout().finally(() => { cerrando.current = false; });
  }, [logout]);

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
      if (usuario && readAuthProvider() === 'clerk') cerrarSesion();
      terminarValidacion();
      return;
    }

    if (usuario || syncedFor.current === userId) return;
    syncedFor.current = userId;
    setLoginError(null);

    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          terminarValidacion();
          return;
        }
        const user = await meApi();
        saveAuthProvider('clerk');
        setAuth(token, user);
      } catch (err: any) {
        // Se guarda antes de cerrar la sesión: al redirigir al login, ese mensaje es el que se muestra.
        setLoginError(err.response?.data?.mensaje || 'No se pudo validar tu sesión. Intenta de nuevo.');
        await signOut();
        terminarValidacion();
      }
    })();
  }, [isLoaded, isSignedIn, userId, usuario, getToken, signOut, setAuth, cerrarSesion, terminarValidacion]);

  // Al volver a la pestaña se vuelve a pedir el usuario: así un cambio de rol hecho por
  // un administrador se refleja sin cerrar sesión, y una cuenta desactivada deja de tener acceso.
  useEffect(() => {
    if (!isSignedIn || !autenticado) return;

    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        await refrescarUsuario();
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          setLoginError(err.response?.data?.mensaje || null);
          cerrarSesion();
        }
        // Otros errores (red, 5xx) no cierran la sesión: se reintenta la próxima vez.
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isSignedIn, autenticado, refrescarUsuario, cerrarSesion]);

  return null;
}
