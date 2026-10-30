import { obtenerPersonaSesion } from '../../services/sesion.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';
import grupoRoutes from '../../routes/grupo.routes';
import { ROLES } from '../../config/roles';
import { JWT_SECRET } from '../../config/env';

vi.mock('../../services/sesion.service', () => ({ obtenerPersonaSesion: vi.fn() }));

vi.mock('../../config/db', () => ({ default: { execute: vi.fn(), getConnection: vi.fn() } }));

const app = express();
app.use(express.json());
app.use('/api/grupos', grupoRoutes);

const body = { nombre: 'Grupo Test', coordinador_ids: [7] };

function token(rol_id: number) {
  vi.mocked(obtenerPersonaSesion).mockResolvedValue({ id: 1, rol_id, estado_cuenta: 'activa' });
  return jwt.sign({ id: 1, rol_id }, JWT_SECRET);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // Estas pruebas solo verifican el status code por rol (RBAC), no el cuerpo de la
  // respuesta — un mock genérico que siempre resuelve una fila sirve para los 3 flujos
  // (validar coordinador, el grupo existe, selects finales) sin tener que encolar una
  // secuencia distinta por cada endpoint.
  (pool.execute as any).mockResolvedValue([[{ id: 7 }]]);
  vi.mocked(pool.getConnection).mockResolvedValue({
    execute: pool.execute, beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
  } as never);
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
