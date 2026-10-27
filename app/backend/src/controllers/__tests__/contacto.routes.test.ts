import { obtenerPersonaSesion } from '../../services/sesion.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';
import contactoRoutes from '../../routes/contacto.routes';
import { ROLES } from '../../config/roles';
import { JWT_SECRET } from '../../config/env';

vi.mock('../../services/sesion.service', () => ({ obtenerPersonaSesion: vi.fn() }));
vi.mock('../../config/db', () => ({ default: { execute: vi.fn(), getConnection: vi.fn() } }));

const app = express();
app.use(express.json());
app.use('/api/contacto', contactoRoutes);

function auth(rol_id: number) {
  vi.mocked(obtenerPersonaSesion).mockResolvedValue({ id: 1, rol_id, estado_cuenta: 'activa' });
  return { Authorization: `Bearer ${jwt.sign({ id: 1, rol_id }, JWT_SECRET)}` };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/contacto', () => {
  it('exige autenticación (401)', async () => {
    const res = await request(app).get('/api/contacto');
    expect(res.status).toBe(401);
    expect(pool.execute).not.toHaveBeenCalled();
  });

  it.each([ROLES.MINISTRO, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS])(
    'bloquea con 403 al rol %s',
    async (rol) => {
      const res = await request(app).get('/api/contacto').set(auth(rol));
      expect(res.status).toBe(403);
      expect(pool.execute).not.toHaveBeenCalled();
    }
  );

  it.each([ROLES.SACERDOTE, ROLES.ADMIN])('lista los mensajes recibidos para el rol %s', async (rol) => {
    const filas = [{ id: 7, nombre: 'María', correo: 'maria@example.com', telefono: null, motivo: 'Información', mensaje: 'Hola', fecha: '2026-10-26' }];
    vi.mocked(pool.execute).mockResolvedValueOnce([filas] as never);

    const res = await request(app).get('/api/contacto').set(auth(rol));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(filas);
  });

  it('responde 500 si la consulta falla', async () => {
    vi.mocked(pool.execute).mockRejectedValueOnce(new Error('db'));
    const res = await request(app).get('/api/contacto').set(auth(ROLES.ADMIN));
    expect(res.status).toBe(500);
  });
});
