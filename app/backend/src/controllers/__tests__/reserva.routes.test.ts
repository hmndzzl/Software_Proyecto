import { obtenerPersonaSesion } from '../../services/sesion.service';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import router from '../../routes/reserva.routes';
import { JWT_SECRET } from '../../config/env';
import { ROLES } from '../../config/roles';
import { crearReserva, editarReserva, obtenerMisReservas, obtenerReservas, obtenerReservaPorId, cambiarEstadoReserva, checkinReserva } from '../reserva.controller';

vi.mock('../../services/sesion.service', () => ({ obtenerPersonaSesion: vi.fn() }));

vi.mock('../reserva.controller', () => ({
  crearReserva: vi.fn((_req, res) => res.sendStatus(204)),
  editarReserva: vi.fn((_req, res) => res.sendStatus(204)),
  obtenerMisReservas: vi.fn((_req, res) => res.sendStatus(204)),
  obtenerReservas: vi.fn((_req, res) => res.sendStatus(204)),
  obtenerReservaPorId: vi.fn((_req, res) => res.sendStatus(204)),
  cambiarEstadoReserva: vi.fn((_req, res) => res.sendStatus(204)),
  checkinReserva: vi.fn((_req, res) => res.sendStatus(204)),
}));

const app = express().use('/api/reservas', router);
const token = (rol_id: number) => {
  vi.mocked(obtenerPersonaSesion).mockResolvedValue({ id: 7, rol_id, estado_cuenta: 'activa' });
  return `Bearer ${jwt.sign({ id: 7, rol_id }, JWT_SECRET)}`;
};

beforeEach(() => vi.clearAllMocks());

describe('acceso a reservas según rol', () => {
  it('impide al ministro crear, editar y consultar reservas incluso por API', async () => {
    const authorization = token(ROLES.MINISTRO);
    await request(app).post('/api/reservas').set('Authorization', authorization).expect(403);
    await request(app).put('/api/reservas/7').set('Authorization', authorization).expect(403);
    await request(app).get('/api/reservas/mis-reservas').set('Authorization', authorization).expect(403);
    await request(app).get('/api/reservas').set('Authorization', authorization).expect(403);
    await request(app).get('/api/reservas/7').set('Authorization', authorization).expect(403);
    await request(app).put('/api/reservas/7/estado').set('Authorization', authorization).expect(403);
    await request(app).put('/api/reservas/7/checkin').set('Authorization', authorization).expect(403);
    expect(crearReserva).not.toHaveBeenCalled();
    expect(editarReserva).not.toHaveBeenCalled();
    expect(obtenerMisReservas).not.toHaveBeenCalled();
    expect(obtenerReservas).not.toHaveBeenCalled();
    expect(obtenerReservaPorId).not.toHaveBeenCalled();
    expect(cambiarEstadoReserva).not.toHaveBeenCalled();
    expect(checkinReserva).not.toHaveBeenCalled();
  });

  it.each([ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN])(
    'permite al rol %s acceder a la gestión de sus reservas', async rol_id => {
      const authorization = token(rol_id);
      await request(app).post('/api/reservas').set('Authorization', authorization).expect(204);
      await request(app).put('/api/reservas/7').set('Authorization', authorization).expect(204);
      await request(app).get('/api/reservas/mis-reservas').set('Authorization', authorization).expect(204);
      await request(app).get('/api/reservas').set('Authorization', authorization).expect(204);
      await request(app).get('/api/reservas/7').set('Authorization', authorization).expect(204);
      await request(app).put('/api/reservas/7/estado').set('Authorization', authorization).expect(204);
      await request(app).put('/api/reservas/7/checkin').set('Authorization', authorization).expect(204);
    }
  );
});
