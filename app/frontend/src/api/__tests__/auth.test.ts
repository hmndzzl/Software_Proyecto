import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../client';
import { logoutApi, meApi } from '../auth';

vi.mock('../client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logoutApi', () => {
    it('debe enviar una petición POST a /api/auth/logout', async () => {
      await logoutApi();
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout');
    });
  });

  describe('meApi', () => {
    it('debe obtener el usuario autenticado desde /api/auth/me', async () => {
      const usuario = { id: 6, nombre: 'Padre Test', correo: 'sacerdote@parroquia.com', rol_id: 1 };
      vi.mocked(apiClient.get).mockResolvedValue({ data: { usuario } });

      const result = await meApi();

      expect(apiClient.get).toHaveBeenCalledWith('/api/auth/me');
      expect(result).toEqual(usuario);
    });
  });
});
