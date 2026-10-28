import { obtenerPersonaSesion } from '../../services/sesion.service';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import router from '../../routes/cambioTurno.routes';
import { JWT_SECRET } from '../../config/env';
import { ROLES } from '../../config/roles';
import { getDestinatariosCambioTurno } from '../cambioTurno.controller';

vi.mock('../../services/sesion.service', () => ({ obtenerPersonaSesion: vi.fn() }));

vi.mock('../cambioTurno.controller', () => ({
  getCambiosTurno: vi.fn((_req, res) => res.sendStatus(204)),
  getDestinatariosCambioTurno: vi.fn((_req, res) => res.sendStatus(204)),
  solicitarCambioTurno: vi.fn((_req, res) => res.sendStatus(204)),
  responderCambioTurno: vi.fn((_req, res) => res.sendStatus(204)),
}));

const app = express().use('/api/cambios-turno', router);
const token = (rol_id: number) => {
  vi.mocked(obtenerPersonaSesion).mockResolvedValue({ id: 7, rol_id, estado_cuenta: 'activa' });
  return `Bearer ${jwt.sign({ id: 7, rol_id }, JWT_SECRET)}`;
};

describe('acceso a destinatarios de cambio de turno', () => {
  it('exige sesión y permite al ministro obtener la lista mínima', async () => {
    await request(app).get('/api/cambios-turno/destinatarios').expect(401);
    await request(app).get('/api/cambios-turno/destinatarios')
      .set('Authorization', token(ROLES.MINISTRO)).expect(204);
    expect(getDestinatariosCambioTurno).toHaveBeenCalledOnce();
  });

  it('no expone la lista a coordinadores de grupos', async () => {
    vi.mocked(getDestinatariosCambioTurno).mockClear();
    await request(app).get('/api/cambios-turno/destinatarios')
      .set('Authorization', token(ROLES.COORDINADOR_GRUPOS)).expect(403);
    expect(getDestinatariosCambioTurno).not.toHaveBeenCalled();
  });
});
