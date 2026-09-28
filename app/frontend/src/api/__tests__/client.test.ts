import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

let requestInterceptor: any;
let responseInterceptorSuccess: any;
let responseInterceptorError: any;

const mockApiClient = vi.fn().mockResolvedValue({ data: 'reintentado' });

vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => {
        const instance: any = mockApiClient;
        instance.interceptors = {
          request: {
            use: vi.fn((fulfilled, rejected) => {
              requestInterceptor = fulfilled;
            }),
          },
          response: {
            use: vi.fn((fulfilled, rejected) => {
              responseInterceptorSuccess = fulfilled;
              responseInterceptorError = rejected;
            }),
          },
        };
        return instance;
      }),
      post: vi.fn(),
    }
  };
});

describe('apiClient', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
    // Forzar la reevaluación del módulo para que llame a axios.create con nuestro mock actual
    await import('../client');
  });

  describe('Request Interceptor', () => {
    it('debería agregar token de autorización si existe en localStorage', () => {
      localStorage.setItem('token', 'mi-token');
      const config = { headers: {} as any };
      const newConfig = requestInterceptor(config);
      
      expect(newConfig.headers.Authorization).toBe('Bearer mi-token');
    });

    it('no debería agregar autorización si no hay token', () => {
      const config = { headers: {} as any };
      const newConfig = requestInterceptor(config);
      
      expect(newConfig.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor', () => {
    it('debería retornar res directo si hay éxito', () => {
      const res = { data: 'ok' };
      expect(responseInterceptorSuccess(res)).toBe(res);
    });

    it('debería rechazar si el error no es 401', async () => {
      const error = { response: { status: 500 }, config: {} };
      await expect(responseInterceptorError(error)).rejects.toBe(error);
    });

    it('debería rechazar si ya fue reintentado (_retry es true)', async () => {
      const error = { response: { status: 401 }, config: { _retry: true } };
      await expect(responseInterceptorError(error)).rejects.toBe(error);
    });

    it('debería hacer refresh, setear nuevo token y reintentar si es 401 y no retry', async () => {
      const error = { response: { status: 401 }, config: { headers: {} as any } };
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { token: 'nuevo-token' } });
      
      const res = await responseInterceptorError(error);
      
      expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/api/auth/refresh'), {}, expect.any(Object));
      expect(localStorage.getItem('token')).toBe('nuevo-token');
      expect(error.config.headers.Authorization).toBe('Bearer nuevo-token');
      expect(res.data).toBe('reintentado');
    });

    it('debería encolar si ya está refrescando', async () => {
      const error = { response: { status: 401 }, config: { headers: {} as any } };
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { token: 'nuevo-token' } });
      
      const p1 = responseInterceptorError(error);
      const p2 = responseInterceptorError({ response: { status: 401 }, config: { headers: {} as any } });
      
      await Promise.all([p1, p2]);
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('debería hacer redirect al login si el refresh falla', async () => {
      const error = { response: { status: 401 }, config: { headers: {} as any } };
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('refresh failed'));
      localStorage.setItem('usuario', 'algo');
      localStorage.setItem('token', 'algo');
      
      await expect(responseInterceptorError(error)).rejects.toThrow('refresh failed');
      
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('usuario')).toBeNull();
      expect(window.location.href).toBe('/login');
    });

    it('debería rechazar todas las promesas encoladas si el refresh falla', async () => {
      const error = { response: { status: 401 }, config: { headers: {} as any } };
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('refresh failed'));
      
      const p1 = responseInterceptorError(error);
      const p2 = responseInterceptorError({ response: { status: 401 }, config: { headers: {} as any } });
      
      await expect(p1).rejects.toThrow('refresh failed');
      await expect(p2).rejects.toThrow('refresh failed');
    });
  });
});
