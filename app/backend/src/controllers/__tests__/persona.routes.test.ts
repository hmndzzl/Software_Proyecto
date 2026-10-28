import { obtenerPersonaSesion } from '../../services/sesion.service';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import router from '../../routes/persona.routes';
import { JWT_SECRET } from '../../config/env';
import { ROLES } from '../../config/roles';
import { getMinistros, getPersonaById } from '../persona.controller';

vi.mock('../../services/sesion.service', () => ({ obtenerPersonaSesion: vi.fn() }));

vi.mock('../persona.controller', () => ({
  getMinistros: vi.fn((_req, res) => res.sendStatus(204)),
  getCoordinadoresGrupo: vi.fn((_req, res) => res.sendStatus(204)),
  getEncargadosEvento: vi.fn((_req, res) => res.sendStatus(204)),
  getPersonaById: vi.fn((_req, res) => res.sendStatus(204)),
  editarPerfil: vi.fn((_req, res) => res.sendStatus(204)),
  actualizarDisponibilidad: vi.fn((_req, res) => res.sendStatus(204)),
}));

const app = express().use('/api/personas', router);
const token = (rol_id: number, id = 7) => {
  vi.mocked(obtenerPersonaSesion).mockResolvedValue({ id, rol_id, estado_cuenta: 'activa' });
  return `Bearer ${jwt.sign({ id, rol_id }, JWT_SECRET)}`;
};

beforeEach(() => vi.clearAllMocks());

describe('lectura de personas según rol', () => {
  it('bloquea al ministro los directorios y perfiles ajenos', async () => {
    const authorization = token(ROLES.MINISTRO);
    await request(app).get('/api/personas').set('Authorization', authorization).expect(403);
    await request(app).get('/api/personas/coordinadores-grupo').set('Authorization', authorization).expect(403);
    await request(app).get('/api/personas/encargados-evento').set('Authorization', authorization).expect(403);
    await request(app).get('/api/personas/8').set('Authorization', authorization).expect(403);
    expect(getMinistros).not.toHaveBeenCalled();
    expect(getPersonaById).not.toHaveBeenCalled();
  });

  it('conserva el acceso del ministro a su propio perfil', async () => {
    await request(app).get('/api/personas/7').set('Authorization', token(ROLES.MINISTRO)).expect(204);
  });

  it.each([ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.ADMIN])(
    'permite consultar el directorio de ministros al rol %s', async rol_id => {
      await request(app).get('/api/personas').set('Authorization', token(rol_id)).expect(204);
    }
  );

  it('permite al coordinador de grupos consultar solo los coordinadores de grupo', async () => {
    const authorization = token(ROLES.COORDINADOR_GRUPOS);
    await request(app).get('/api/personas/coordinadores-grupo').set('Authorization', authorization).expect(204);
    await request(app).get('/api/personas').set('Authorization', authorization).expect(403);
  });
});
