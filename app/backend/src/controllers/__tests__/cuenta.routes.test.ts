import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';
import cuentaRoutes from '../../routes/cuenta.routes';
import { ROLES } from '../../config/roles';
import { JWT_SECRET } from '../../config/env';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn() } }));

const app = express();
app.use(express.json());
app.use('/api/cuentas', cuentaRoutes);

function token(rol_id: number) {
  return jwt.sign({ id: 1, rol_id }, JWT_SECRET);
}

const auth = (rol: number) => ({ Authorization: `Bearer ${token(rol)}` });

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('RBAC en rutas de aprobación de cuentas', () => {
  it('exige autenticación (401)', async () => {
    const res = await request(app).get('/api/cuentas');
    expect(res.status).toBe(401);
  });

  it.each([ROLES.MINISTRO, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS])(
    'bloquea con 403 a rol %s en todas las rutas',
    async (rol) => {
      const lista = await request(app).get('/api/cuentas').set(auth(rol));
      const aprobar = await request(app).patch('/api/cuentas/5/aprobar').set(auth(rol)).send({ rol_id: ROLES.MINISTRO });
      const rechazar = await request(app).patch('/api/cuentas/5/rechazar').set(auth(rol));

      expect([lista.status, aprobar.status, rechazar.status]).toEqual([403, 403, 403]);
      expect(pool.execute).not.toHaveBeenCalled();
    }
  );

  describe.each([
    ['Admin', ROLES.ADMIN],
    ['Sacerdote', ROLES.SACERDOTE],
  ])('flujo completo como %s', (_nombre, rol) => {
    it('lista las cuentas pendientes', async () => {
      const filas = [{ id: 5, nombre: 'Ana', correo: 'ana@gmail.com', rol_id: ROLES.MINISTRO, estado_cuenta: 'pendiente' }];
      (pool.execute as any).mockResolvedValueOnce([filas]);

      const res = await request(app).get('/api/cuentas').set(auth(rol));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(filas);
    });

    it('aprueba una cuenta asignando el rol', async () => {
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .patch('/api/cuentas/5/aprobar')
        .set(auth(rol))
        .send({ rol_id: ROLES.COORDINADOR_GRUPOS });

      expect(res.status).toBe(200);
      expect((pool.execute as any).mock.calls[0][1]).toEqual(['activa', ROLES.COORDINADOR_GRUPOS, 5, 'activa']);
    });

    it('rechaza una cuenta (pendiente o activa)', async () => {
      (pool.execute as any)
        .mockResolvedValueOnce([[{ rol_id: ROLES.MINISTRO, estado_cuenta: 'activa' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app).patch('/api/cuentas/5/rechazar').set(auth(rol));

      expect(res.status).toBe(200);
    });
  });

  it('solo Admin puede otorgar el rol de Administrador', async () => {
    const sacerdote = await request(app)
      .patch('/api/cuentas/5/aprobar')
      .set(auth(ROLES.SACERDOTE))
      .send({ rol_id: ROLES.ADMIN });
    expect(sacerdote.status).toBe(403);
    expect(pool.execute).not.toHaveBeenCalled();

    (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);
    const admin = await request(app)
      .patch('/api/cuentas/5/aprobar')
      .set(auth(ROLES.ADMIN))
      .send({ rol_id: ROLES.ADMIN });
    expect(admin.status).toBe(200);
  });
});
