import { describe, expect, it, vi } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import { registrarDecision } from '../decisiones.service';

describe('registro de decisiones', () => {
  it('obtiene el autor y la hora en el servidor', async () => {
    const execute = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
    await registrarDecision({ execute } as unknown as PoolConnection, 'reserva', 8, 'aprobada', 1);
    expect(execute).toHaveBeenCalledWith(expect.stringContaining('UTC_TIMESTAMP(3)'), [8, 'aprobada', 1]);
  });
  it('impide confirmar un cambio si no se pudo guardar su autor', async () => {
    const execute = vi.fn().mockResolvedValue([{ affectedRows: 0 }]);
    await expect(registrarDecision({ execute } as unknown as PoolConnection, 'cuenta', 8, 'rechazada', 1)).rejects.toThrow('autor');
  });
});
