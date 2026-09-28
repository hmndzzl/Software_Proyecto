import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';
import tareaRoutes from '../../routes/tarea.routes';
import { ROLES } from '../../config/roles';

vi.mock('../../config/db', () => ({
  default: {
    execute: vi.fn(),
    getConnection: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/tareas', tareaRoutes);

const tareaBody = {
  fecha: '2026-10-01',
  hora_inicio: '10:00',
  hora_fin: '11:00',
  titulo: 'Tarea Test',
  descripcion: 'Descripción de prueba',
};

const conn = {
  beginTransaction: vi.fn(),
  execute: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
};

function token(rol_id: number, id = 7) {
  return jwt.sign({ id, rol_id }, process.env.JWT_SECRET || 'llave_secreta_super_segura');
}

const ROLES_BLOQUEADOS = [ROLES.MINISTRO, ROLES.COORDINADOR_GRUPOS];
const ROLES_PERMITIDOS = [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.ADMIN];

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(pool.getConnection).mockResolvedValue(conn as any);
});

describe('RBAC en mutaciones de tareas (DT-06)', () => {
  describe('POST /api/tareas (createTarea)', () => {
    it.each(ROLES_BLOQUEADOS)('bloquea con 403 a rol %s', async (rol) => {
      const res = await request(app).post('/api/tareas').set('Authorization', `Bearer ${token(rol)}`).send(tareaBody);
      expect(res.status).toBe(403);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it.each(ROLES_PERMITIDOS)('permite a rol %s crear una tarea (201)', async (rol) => {
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 1 }]);
      const res = await request(app).post('/api/tareas').set('Authorization', `Bearer ${token(rol)}`).send(tareaBody);
      expect(res.status).toBe(201);
    });
  });

  describe('DELETE /api/tareas/:id (deleteTarea)', () => {
    it.each(ROLES_BLOQUEADOS)('bloquea con 403 a rol %s', async (rol) => {
      const res = await request(app).delete('/api/tareas/1').set('Authorization', `Bearer ${token(rol)}`);
      expect(res.status).toBe(403);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it.each(ROLES_PERMITIDOS)('permite a rol %s eliminar una tarea (204)', async (rol) => {
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);
      const res = await request(app).delete('/api/tareas/1').set('Authorization', `Bearer ${token(rol)}`);
      expect(res.status).toBe(204);
    });
  });

  describe('POST /api/tareas/asignar (asignarTarea)', () => {
    const asignarBody = { tarea_id: 1, persona_id: 9 };

    it.each(ROLES_BLOQUEADOS)('bloquea con 403 a rol %s', async (rol) => {
      const res = await request(app).post('/api/tareas/asignar').set('Authorization', `Bearer ${token(rol)}`).send(asignarBody);
      expect(res.status).toBe(403);
      expect(pool.execute).not.toHaveBeenCalled();
      expect(pool.getConnection).not.toHaveBeenCalled();
    });

    it.each(ROLES_PERMITIDOS)('permite a rol %s asignar una tarea (201)', async (rol) => {
      (pool.execute as any)
        .mockResolvedValueOnce([[{ id: 1, titulo: 'T', descripcion: 'D', fecha: '2026-10-01', hora_inicio: '10:00', hora_fin: '11:00' }]])
        .mockResolvedValueOnce([[{ id: 9, disponible: 1 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[]]);
      conn.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([{}]);

      const res = await request(app).post('/api/tareas/asignar').set('Authorization', `Bearer ${token(rol)}`).send(asignarBody);
      expect(res.status).toBe(201);
    });
  });

  describe('DELETE /api/tareas/asignar (desasignarTarea)', () => {
    const desasignarBody = { tarea_id: 1, persona_id: 9 };

    it.each(ROLES_BLOQUEADOS)('bloquea con 403 a rol %s', async (rol) => {
      const res = await request(app).delete('/api/tareas/asignar').set('Authorization', `Bearer ${token(rol)}`).send(desasignarBody);
      expect(res.status).toBe(403);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it.each(ROLES_PERMITIDOS)('permite a rol %s desasignar una tarea (204)', async (rol) => {
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);
      const res = await request(app).delete('/api/tareas/asignar').set('Authorization', `Bearer ${token(rol)}`).send(desasignarBody);
      expect(res.status).toBe(204);
    });
  });

  describe('GET /api/tareas', () => {
    it('cualquier rol autenticado puede listar tareas (GET no exige rol)', async () => {
      (pool.execute as any).mockResolvedValueOnce([[]]);
      const res = await request(app).get('/api/tareas').set('Authorization', `Bearer ${token(ROLES.MINISTRO)}`);
      expect(res.status).toBe(200);
    });
  });
});
