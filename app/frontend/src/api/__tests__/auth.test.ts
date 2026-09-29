import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import apiClient from '../client';
import { loginApi, logoutApi } from '../auth';

vi.mock('axios');
vi.mock('../client', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loginApi', () => {
    it('debe enviar una petición POST a /api/auth/login', async () => {
      const mockResponse = { data: { token: '123', usuario: { id: 1, nombre: 'Test', correo: 'test@test.com', rol_id: 1 }, mensaje: 'Login' } };
      vi.mocked(axios.post).mockResolvedValue(mockResponse);

      const result = await loginApi('test@test.com', 'password');

      expect(axios.post).toHaveBeenCalledWith(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        { correo: 'test@test.com', password: 'password' },
        { withCredentials: true }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('logoutApi', () => {
    it('debe enviar una petición POST a /api/auth/logout', async () => {
      await logoutApi();
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout');
    });
  });
});
