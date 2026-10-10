import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../client';
import { aprobarCuentaApi, crearCuentaApi, listarCuentasApi, rechazarCuentaApi } from '../cuentas';

vi.mock('../client', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

describe('API de cuentas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('crea una cuenta y conserva la advertencia opcional', async () => {
    const cuenta = { nombre: 'Ana', correo: 'ana@test.com', password: 'secreto123', rol_id: 4 };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { advertencia: 'Clerk no disponible' } });
    await expect(crearCuentaApi(cuenta)).resolves.toEqual({ advertencia: 'Clerk no disponible' });
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/register', cuenta);

    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: null });
    await expect(crearCuentaApi(cuenta)).resolves.toEqual({});
  });

  it('lista, aprueba y rechaza cuentas con las rutas correctas', async () => {
    const cuentas = [{ id: 2, nombre: 'Luis', correo: 'l@test.com', rol_id: 4, estado_cuenta: 'pendiente' as const }];
    vi.mocked(apiClient.get).mockResolvedValue({ data: cuentas });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });

    await expect(listarCuentasApi('pendiente')).resolves.toEqual(cuentas);
    expect(apiClient.get).toHaveBeenCalledWith('/api/cuentas', { params: { estado: 'pendiente' } });
    await aprobarCuentaApi(2, 3);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/cuentas/2/aprobar', { rol_id: 3 });
    await rechazarCuentaApi(2);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/cuentas/2/rechazar');
  });
});
