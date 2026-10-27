import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import router from '../../routes/espacio.routes';
import { JWT_SECRET } from '../../config/env';
import { ROLES } from '../../config/roles';
import { crearEspacio } from '../espacio.controller';

vi.mock('../espacio.controller', () => ({
  obtenerEspacios: vi.fn((_req, res) => res.sendStatus(204)),
  obtenerEspacioPorId: vi.fn((_req, res) => res.sendStatus(204)),
  crearEspacio: vi.fn((_req, res) => res.sendStatus(204)),
  actualizarEspacio: vi.fn((_req, res) => res.sendStatus(204)),
  eliminarEspacio: vi.fn((_req, res) => res.sendStatus(204)),
}));
const app = express().use(express.json()).use('/api/espacios', router);
const token = (rol_id: number) => `Bearer ${jwt.sign({ id: 7, rol_id }, JWT_SECRET)}`;
beforeEach(() => vi.clearAllMocks());

describe('gestión de espacios por rol y carga de imágenes', () => {
  it('exige autenticación', async () => {
    await request(app).post('/api/espacios').expect(401);
  });
  it.each([ROLES.MINISTRO, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS])('rechaza mutaciones del rol %s', async rol => {
    for (const metodo of ['post', 'put', 'delete'] as const) {
      await request(app)[metodo](`/api/espacios${metodo === 'post' ? '' : '/1'}`).set('Authorization', token(rol)).expect(403);
    }
    expect(crearEspacio).not.toHaveBeenCalled();
  });
  it.each([ROLES.ADMIN, ROLES.SACERDOTE])('permite gestión al rol %s y mantiene JSON', async rol => {
    await request(app).post('/api/espacios').set('Authorization', token(rol)).send({ nombre: 'Patio' }).expect(204);
    await request(app).put('/api/espacios/1').set('Authorization', token(rol)).send({ nombre: 'Patio' }).expect(204);
    await request(app).delete('/api/espacios/1').set('Authorization', token(rol)).expect(204);
  });
  it('rechaza SVG y cargas mayores a 10 MB antes del controlador', async () => {
    await request(app).post('/api/espacios').set('Authorization', token(ROLES.ADMIN))
      .attach('imagen', Buffer.from('<svg/>'), { filename: 'foto.svg', contentType: 'image/svg+xml' }).expect(400);
    await request(app).post('/api/espacios').set('Authorization', token(ROLES.ADMIN))
      .attach('imagen', Buffer.alloc(10 * 1024 * 1024 + 1), { filename: 'foto.png', contentType: 'image/png' }).expect(413);
    expect(crearEspacio).not.toHaveBeenCalled();
  });
});
