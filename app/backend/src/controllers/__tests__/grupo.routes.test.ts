import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';
import grupoRoutes from '../../routes/grupo.routes';
import { ROLES } from '../../config/roles';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn() } }));

const app = express();
app.use(express.json());
app.use('/api/grupos', grupoRoutes);

const body = { nombre: 'Grupo Test', coordinador_id: 7 };

function token(rol_id: number) {
  return jwt.sign({ id: 1, rol_id }, process.env.JWT_SECRET || 'llave_secreta_super_segura');
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  (pool.execute as any)
    .mockResolvedValueOnce([[{ id: 7 }]])
    .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }]);
});

describe('RBAC en rutas de escritura de grupos (DT-05)', () => {
  it.each([ROLES.MINISTRO, ROLES.COORDINADOR_MINISTROS])(
    'bloquea con 403 a rol %s en POST /api/grupos',
    async (rol) => {
      const res = await request(app).post('/api/grupos').set('Authorization', `Bearer ${token(rol)}`).send(body);
      expect(res.status).toBe(403);
      expect(pool.execute).not.toHaveBeenCalled();
    }
  );

  it.each([ROLES.MINISTRO, ROLES.COORDINADOR_MINISTROS])(
    'bloquea con 403 a rol %s en PUT /api/grupos/:id',
    async (rol) => {
      const res = await request(app).put('/api/grupos/1').set('Authorization', `Bearer ${token(rol)}`).send(body);
      expect(res.status).toBe(403);
      expect(pool.execute).not.toHaveBeenCalled();
    }
  );

  it.each([ROLES.MINISTRO, ROLES.COORDINADOR_MINISTROS])(
    'bloquea con 403 a rol %s en DELETE /api/grupos/:id',
    async (rol) => {
      const res = await request(app).delete('/api/grupos/1').set('Authorization', `Bearer ${token(rol)}`);
      expect(res.status).toBe(403);
      expect(pool.execute).not.toHaveBeenCalled();
    }
  );

  it.each([ROLES.SACERDOTE, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN])(
    'permite a rol %s crear un grupo (201)',
    async (rol) => {
      const res = await request(app).post('/api/grupos').set('Authorization', `Bearer ${token(rol)}`).send(body);
      expect(res.status).toBe(201);
    }
  );

  it.each([ROLES.SACERDOTE, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN])(
    'permite a rol %s actualizar un grupo (200)',
    async (rol) => {
      const res = await request(app).put('/api/grupos/1').set('Authorization', `Bearer ${token(rol)}`).send(body);
      expect(res.status).toBe(200);
    }
  );

  it.each([ROLES.SACERDOTE, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN])(
    'permite a rol %s eliminar un grupo (204)',
    async (rol) => {
      const res = await request(app).delete('/api/grupos/1').set('Authorization', `Bearer ${token(rol)}`);
      expect(res.status).toBe(204);
    }
  );

  it('cualquier rol autenticado puede listar grupos (GET no exige rol)', async () => {
    (pool.execute as any).mockReset().mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/grupos').set('Authorization', `Bearer ${token(ROLES.MINISTRO)}`);
    expect(res.status).toBe(200);
  });
});
