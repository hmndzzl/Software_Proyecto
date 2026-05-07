import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL as string;

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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

    if (error.response?.status !== 401 || original._retry) {
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
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
