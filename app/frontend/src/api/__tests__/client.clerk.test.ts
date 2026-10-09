import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { getClerkToken } from '../../auth/clerkSession';

let requestInterceptor: any;
let responseInterceptorError: any;

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => {
      const instance: any = vi.fn();
      instance.interceptors = {
        request: { use: vi.fn((fulfilled) => { requestInterceptor = fulfilled; }) },
        response: { use: vi.fn((_fulfilled, rejected) => { responseInterceptorError = rejected; }) },
      };
      return instance;
    }),
    post: vi.fn(),
  },
}));

vi.mock('../../auth/clerkSession', () => ({
  CLERK_ENABLED: true,
  getClerkToken: vi.fn(),
}));

describe('apiClient con Clerk activo', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await import('../client');
  });

  it('usa el token de la sesión de Clerk', async () => {
    vi.mocked(getClerkToken).mockResolvedValue('token-clerk');
    localStorage.setItem('token', 'token-propio');

    const config = await requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer token-clerk');
    expect(config._clerk).toBe(true);
  });

  it('usa el JWT propio si no hay sesión de Clerk (acceso anterior)', async () => {
    vi.mocked(getClerkToken).mockResolvedValue(null);
    localStorage.setItem('token', 'token-propio');

    const config = await requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer token-propio');
    expect(config._clerk).toBeUndefined();
  });

  it('no intenta /refresh cuando un token de Clerk recibe 401', async () => {
    const error = { response: { status: 401 }, config: { _clerk: true, headers: {} } };

    await expect(responseInterceptorError(error)).rejects.toBe(error);
    expect(axios.post).not.toHaveBeenCalled();
  });
});
