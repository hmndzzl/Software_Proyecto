import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';
import ausenciaRoutes from '../../routes/ausencia.routes';

vi.mock('../../config/db', () => ({ default: { getConnection: vi.fn() } }));
const app = express();
app.use(express.json());
app.use('/api/ausencias', ausenciaRoutes);
const body = { ministro_id: 9, fecha_inicio: '2026-10-01', fecha_fin: '2026-10-05', titulo: 'Ausencia por viaje', justificacion: 'Estaré fuera de la ciudad por un compromiso familiar.' };
const ministro = { id: 9, nombre: 'Ministro Test', correo: 'ministro@parroquia.com' };
const conn = {
  beginTransaction: vi.fn(), execute: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
};
function enviar(payload: object = body, id = 9, rol_id = 4) {
  const token = jwt.sign({ id, rol_id }, process.env.JWT_SECRET || 'llave_secreta_super_segura');
  return request(app).post('/api/ausencias').set('Authorization', `Bearer ${token}`).send(payload);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(pool.getConnection).mockResolvedValue(conn as any);
  conn.execute.mockResolvedValueOnce([[ministro]])
    .mockResolvedValueOnce([[{ id: 6 }, { id: 7 }, { id: 13 }]])
    .mockResolvedValueOnce([{ insertId: 80 }])
    .mockResolvedValueOnce([{}]).mockResolvedValueOnce([{}]).mockResolvedValueOnce([{}])
    .mockResolvedValueOnce([{ insertId: 21 }]);
});

describe('POST /api/ausencias (HU-31)', () => {
  it('guarda fechas y notifica a ambos coordinadores y al sacerdote usando identidad de BD', async () => {
    const res = await enviar({ ...body, nombre: 'Nombre falsificado', correo: 'falso@example.com' });
    expect(res.status).toBe(201);
    expect(res.body.ausencia).toEqual({ ...body, id: 21, ministro, notificacion_id: 80 });
    expect(conn.execute).toHaveBeenNthCalledWith(2, 'SELECT id FROM persona WHERE rol_id IN (?, ?)', [2, 1]);
    for (const id of [6, 7, 13]) {
      expect(conn.execute).toHaveBeenCalledWith(
        'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)', [id, 80]);
    }
    expect(conn.execute).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO periodo_ausencia'),
      [9, body.fecha_inicio, body.fecha_fin, 80, body.titulo, body.justificacion]);
    expect(conn.execute.mock.calls[2][1][0]).toContain('Ministro Test');
    expect(conn.execute.mock.calls[2][1][0]).toContain(body.titulo);
    expect(conn.execute.mock.calls[2][1][0]).toContain(body.justificacion);
    expect(conn.commit).toHaveBeenCalledOnce();
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it.each(['2026-10-01', '2028-02-29'])('acepta ausencia de un día y fecha válida %s', async fecha => {
    expect((await enviar({ ...body, fecha_inicio: fecha, fecha_fin: fecha })).status).toBe(201);
  });

  it.each(['titulo', 'justificacion'])('rechaza %s ausente, vacío, inválido o demasiado largo', async campo => {
    for (const valor of [undefined, null, 123, {}, [], '', ' \n\t ', 'a'.repeat(campo === 'titulo' ? 256 : 5001)]) {
      expect((await enviar({ ...body, [campo]: valor })).status).toBe(400);
    }
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('recorta espacios exteriores antes de guardar y notificar', async () => {
    const res = await enviar({ ...body, titulo: `  ${body.titulo}  `, justificacion: `\n${body.justificacion}\n` });
    expect(res.status).toBe(201);
    expect(res.body.ausencia.titulo).toBe(body.titulo);
    expect(res.body.ausencia.justificacion).toBe(body.justificacion);
    expect(conn.execute).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO periodo_ausencia'),
      [9, body.fecha_inicio, body.fecha_fin, 80, body.titulo, body.justificacion]);
  });

  it('acepta las longitudes máximas', async () => {
    expect((await enviar({ ...body, titulo: 'a'.repeat(255), justificacion: 'b'.repeat(5000) })).status).toBe(201);
  });

  it.each([
    {}, { ...body, ministro_id: '9' }, { ...body, ministro_id: -1 }, { ...body, ministro_id: 9.5 },
    { ...body, fecha_inicio: '2026-02-29' }, { ...body, fecha_inicio: '2026-04-31' },
    { ...body, fecha_inicio: '01/10/2026' }, { ...body, fecha_inicio: '2026-10-01T00:00:00Z' },
    { ...body, fecha_inicio: null }, { ...body, fecha_inicio: '0000-01-01' },
    { ...body, fecha_fin: '2026-09-30' }, { ...body, fecha_fin: '2026-13-01' },
  ])('rechaza entradas inválidas sin acceder a BD: %j', async payload => {
    expect((await enviar(payload)).status).toBe(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('requiere un token válido', async () => {
    expect((await request(app).post('/api/ausencias').send(body)).status).toBe(401);
    expect((await request(app).post('/api/ausencias').set('Authorization', 'Bearer invalido').send(body)).status).toBe(401);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it.each([1, 2, 3, 5])('impide registrar ausencia a rol %s', async rol => {
    expect((await enviar(body, 9, rol)).status).toBe(403);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('impide suplantar a otro ministro', async () => {
    expect((await enviar({ ...body, ministro_id: 10 })).status).toBe(403);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el ministro ya no existe o cambió de rol', async () => {
    conn.execute.mockReset().mockResolvedValueOnce([[]]);
    expect((await enviar()).status).toBe(404);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it('no guarda una ausencia sin destinatarios', async () => {
    conn.execute.mockReset().mockResolvedValueOnce([[ministro]]).mockResolvedValueOnce([[]]);
    expect((await enviar()).status).toBe(409);
    expect(conn.execute).toHaveBeenCalledTimes(2);
    expect(conn.rollback).toHaveBeenCalledOnce();
  });

  it.each([3, 4, 5, 6, 7])('revierte todo si falla la escritura %s', async fallo => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    conn.execute.mockReset();
    const resultados = [[[ministro]], [[{ id: 6 }, { id: 7 }, { id: 13 }]], [{ insertId: 80 }], [{}], [{}], [{}], [{ insertId: 21 }]];
    for (let i = 0; i < fallo - 1; i++) conn.execute.mockResolvedValueOnce(resultados[i]);
    conn.execute.mockRejectedValueOnce(new Error('DB failure'));
    expect((await enviar()).status).toBe(500);
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});
