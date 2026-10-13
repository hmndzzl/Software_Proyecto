import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import pool from '../../config/db';
import { app } from '../../app';
import { ESTADOS_RESERVA } from '../../config/estadosReserva';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn() }, checkDbConnection: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/public/agenda', () => {
  it('está montado en la API y funciona sin token, con datos públicos solamente', async () => {
    const evento = {
      id: 8, titulo: 'Encuentro parroquial', descripcion: 'Abierto a todos',
      fecha: '2099-10-20', hora_inicio: '09:00:00', hora_fin: '11:00:00', nombre_espacio: 'Salón 1',
    };
    vi.mocked(pool.execute).mockResolvedValueOnce([[{
      ...evento, encargado_id: 1, reserva_id: 2, correo: 'privado@example.com',
    }] as any, []]);
    const response = await request(app).get('/api/public/agenda').expect(200);
    expect(response.body).toEqual([evento]);
    expect(pool.execute).toHaveBeenCalledWith(expect.any(String), [ESTADOS_RESERVA.CONFIRMADA, 100, 0]);
  });

  it('devuelve un array vacío cuando no hay eventos publicados', async () => {
    vi.mocked(pool.execute).mockResolvedValueOnce([[], []]);
    const response = await request(app).get('/api/public/agenda').expect(200);
    expect(response.body).toEqual([]);
  });

  it('pagina con límites parametrizados', async () => {
    vi.mocked(pool.execute).mockResolvedValueOnce([[], []]);
    await request(app).get('/api/public/agenda?pagina=3&limite=10').expect(200);
    expect(pool.execute).toHaveBeenCalledWith(expect.any(String), [ESTADOS_RESERVA.CONFIRMADA, 10, 20]);
  });

  it.each(['limite=101', 'limite=0', 'limite=-1', 'limite=1.5', 'limite=abc', 'pagina=0',
    'pagina=9007199254740992', 'pagina=9007199254740991&limite=100', 'limite=1&limite=2', 'pagina[]=1'])
  ('rechaza paginación inválida: %s', async (query) => {
    await request(app).get(`/api/public/agenda?${query}`).expect(400);
    expect(pool.execute).not.toHaveBeenCalled();
  });

  it('devuelve un error controlado sin filtrar detalles internos', async () => {
    vi.mocked(pool.execute).mockRejectedValueOnce(new Error('SQL con datos internos'));
    const response = await request(app).get('/api/public/agenda').expect(500);
    expect(response.body).toEqual({ mensaje: 'Error al obtener la agenda pública' });
  });

  it('conserva la autenticación de los endpoints internos', async () => {
    await request(app).get('/api/eventos').expect(401);
    expect(pool.execute).not.toHaveBeenCalled();
  });
});
