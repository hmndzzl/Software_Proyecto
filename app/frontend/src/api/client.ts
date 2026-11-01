import axios, { type InternalAxiosRequestConfig } from 'axios';
import { CLERK_ENABLED, getClerkToken, setLoginError, signOutClerk } from '../auth/clerkSession';
import { clearSession, readToken, saveToken } from '../auth/sessionStore';

const BASE_URL = import.meta.env.VITE_API_URL as string;

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

function withToken<T extends InternalAxiosRequestConfig>(config: T, token: string | null): T {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

apiClient.interceptors.request.use((config) => {
  if (!CLERK_ENABLED) {
    return withToken(config, readToken());
  }

  // Con Clerk activo se prefiere su token de sesión (se renueva solo); si no hay
  // sesión de Clerk se usa el JWT propio, para quienes aún entran con el acceso anterior.
  return getClerkToken().then((clerkToken) => {
    if (clerkToken) {
      (config as InternalAxiosRequestConfig & { _clerk?: boolean })._clerk = true;
    }
    return withToken(config, clerkToken ?? readToken());
  });
});

let isRefreshing = false;
let queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const drainQueue = (err: unknown, token: string | null) => {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  queue = [];
};

async function renovarTokenCompartido(tokenFallido: string | null): Promise<string> {
  const renovar = async () => {
    const actual = readToken();
    // Otra pestaña ya renovó la cookie compartida: reutilizar su access token.
    if (actual && actual !== tokenFallido) return actual;
    if (tokenFallido && !actual) throw new Error('La sesión fue cerrada en otra pestaña');
    const { data } = await axios.post<{ token: string }>(
      `${BASE_URL}/api/auth/refresh`, {}, { withCredentials: true }
    );
    // No restaurar una sesión cerrada o sustituida mientras la petición estaba en vuelo.
    if (readToken() !== actual) throw new Error('La sesión cambió durante la renovación');
    saveToken(data.token);
    return data.token;
  };
  // Evita consumir dos veces el mismo refresh desde pestañas del mismo origen.
  return navigator.locks
    ? navigator.locks.request('parroquia:jwt-refresh', renovar)
    : renovar();
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 403 && error.response.data?.codigo === 'CUENTA_BAJA') {
      setLoginError(error.response.data.mensaje);
      clearSession();
      await signOutClerk();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Los tokens de Clerk no pasan por /refresh: Clerk los renueva por su cuenta.
    if (error.response?.status !== 401 || original._retry || original._clerk) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    original._retry = true;
    isRefreshing = true;
    const tokenAlIniciar = readToken();

    try {
      const authorization = original.headers.Authorization;
      const tokenFallido = typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice(7) : readToken();
      const token = await renovarTokenCompartido(tokenFallido);
      drainQueue(null, token);
      original.headers.Authorization = `Bearer ${token}`;
      return apiClient(original);
    } catch (refreshError) {
      drainQueue(refreshError, null);
      if (readToken() === tokenAlIniciar) clearSession();
      if (!readToken()) window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
