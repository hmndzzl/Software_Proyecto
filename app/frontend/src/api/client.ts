import axios, { type InternalAxiosRequestConfig } from 'axios';
import { AUTH_PROVIDER_KEY, CLERK_ENABLED, getClerkToken } from '../auth/clerkSession';

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
    return withToken(config, localStorage.getItem('token'));
  }

  // Con Clerk activo se prefiere su token de sesión (se renueva solo); si no hay
  // sesión de Clerk se usa el JWT propio, para quienes aún entran con el acceso anterior.
  return getClerkToken().then((clerkToken) => {
    if (clerkToken) {
      (config as InternalAxiosRequestConfig & { _clerk?: boolean })._clerk = true;
    }
    return withToken(config, clerkToken ?? localStorage.getItem('token'));
  });
});

let isRefreshing = false;
let queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const drainQueue = (err: unknown, token: string | null) => {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  queue = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

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

    try {
      const { data } = await axios.post(
        `${BASE_URL}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );
      localStorage.setItem('token', data.token);
      drainQueue(null, data.token);
      original.headers.Authorization = `Bearer ${data.token}`;
      return apiClient(original);
    } catch (refreshError) {
      drainQueue(refreshError, null);
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem(AUTH_PROVIDER_KEY);
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
