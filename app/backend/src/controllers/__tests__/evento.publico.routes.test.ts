import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';
import eventoRoutes from '../../routes/evento.routes';
import { ROLES } from '../../config/roles';
import { JWT_SECRET } from '../../config/env';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn() } }));
const app = express();
app.use(express.json());
app.use('/api/eventos', eventoRoutes);
const endpoint = '/api/eventos/8/publico';
const token = (rol_id: number) => jwt.sign({ id: 1, rol_id }, JWT_SECRET);

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(pool.execute).mockResolvedValue([{ affectedRows: 1 } as any, []]);
});

describe('visibilidad de eventos', () => {
  it('requiere autenticación para publicar', async () => {
    await request(app).patch(endpoint).send({ publico: true }).expect(401);
    expect(pool.execute).not.toHaveBeenCalled();
  });

  it.each([ROLES.MINISTRO, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS])(
    'rechaza el rol %s sin modificar el evento', async (rol) => {
      await request(app).patch(endpoint).auth(token(rol), { type: 'bearer' }).send({ publico: true }).expect(403);
      expect(pool.execute).not.toHaveBeenCalled();
    }
  );

  it.each([ROLES.ADMIN, ROLES.SACERDOTE])('permite publicar al rol %s', async (rol) => {
    const response = await request(app).patch(endpoint).auth(token(rol), { type: 'bearer' }).send({ publico: true }).expect(200);
    expect(response.body.evento).toEqual({ id: 8, publico: true });
    expect(pool.execute).toHaveBeenCalledWith('UPDATE evento SET publico = ? WHERE id = ?', [1, 8]);
  });

  it('permite retirar un evento de la agenda', async () => {
    await request(app).patch(endpoint).auth(token(ROLES.ADMIN), { type: 'bearer' }).send({ publico: false }).expect(200);
    expect(pool.execute).toHaveBeenCalledWith(expect.any(String), [0, 8]);
  });

  it.each([{}, { publico: 'false' }, { publico: 1 }, { publico: null }])('rechaza valores ambiguos: %j', async (body) => {
    await request(app).patch(endpoint).auth(token(ROLES.ADMIN), { type: 'bearer' }).send(body).expect(400);
    expect(pool.execute).not.toHaveBeenCalled();
  });

  it('rechaza identificadores inválidos', async () => {
    await request(app).patch('/api/eventos/0/publico').auth(token(ROLES.ADMIN), { type: 'bearer' }).send({ publico: true }).expect(400);
    expect(pool.execute).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el evento no existe', async () => {
    vi.mocked(pool.execute).mockResolvedValueOnce([{ affectedRows: 0 } as any, []]);
    await request(app).patch(endpoint).auth(token(ROLES.ADMIN), { type: 'bearer' }).send({ publico: true }).expect(404);
  });

  it('no expone errores internos de la base de datos', async () => {
    vi.mocked(pool.execute).mockRejectedValueOnce(new Error('datos internos'));
    const response = await request(app).patch(endpoint).auth(token(ROLES.ADMIN), { type: 'bearer' }).send({ publico: true }).expect(500);
    expect(JSON.stringify(response.body)).not.toContain('datos internos');
  });
});
