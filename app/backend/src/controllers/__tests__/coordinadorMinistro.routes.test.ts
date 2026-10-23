import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';
import routes from '../../routes/coordinadorMinistro.routes';
import { JWT_SECRET } from '../../config/env';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn(), getConnection: vi.fn() } }));
const app = express();
app.use(express.json());
app.use('/api/coordinadores-ministros', routes);
const base = '/api/coordinadores-ministros';
const token = (rol_id = 5) => jwt.sign({ id: 1, rol_id }, JWT_SECRET);
const personas = [
  { id: 7, rol_id: 2, estado_cuenta: 'activa' },
  { id: 9, rol_id: 4, estado_cuenta: 'activa' },
];
const conn = { beginTransaction: vi.fn(), execute: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(pool.getConnection).mockResolvedValue(conn as never);
  conn.execute.mockResolvedValue([personas, []]);
  vi.mocked(pool.execute).mockResolvedValue([[], []] as never);
});

describe('gestión de coordinadores y ministros', () => {
  const operaciones = [
    ['get', ''], ['get', '/7/ministros'], ['put', '/7/ministros/9'], ['delete', '/7/ministros/9'],
  ] as const;
  it.each(operaciones)('%s %s requiere sesión', async (method, path) => {
    await request(app)[method](base + path).expect(401);
    expect(pool.execute).not.toHaveBeenCalled();
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
  it.each([2, 3, 4])('rechaza todas las operaciones del rol %s', async (rol) => {
    for (const [method, path] of operaciones) {
      await request(app)[method](base + path).auth(token(rol), { type: 'bearer' }).expect(403);
    }
    expect(pool.getConnection).not.toHaveBeenCalled();
    expect(pool.execute).not.toHaveBeenCalled();
  });
  it.each([1, 5])('permite listar, asignar y retirar al rol %s', async (rol) => {
    vi.mocked(pool.execute).mockResolvedValue([[{ id: 7 }], []] as never);
    for (const [method, path] of operaciones) {
      await request(app)[method](base + path).auth(token(rol), { type: 'bearer' }).expect(200);
    }
    expect(conn.commit).toHaveBeenCalledTimes(2);
    expect(conn.release).toHaveBeenCalledTimes(2);
  });
  it.each(['0', '-1', '1.5', 'abc', '9007199254740992'])('rechaza el identificador %s antes de consultar', async id => {
    await request(app).get(`${base}/${id}/ministros`).auth(token(), { type: 'bearer' }).expect(400);
    await request(app).put(`${base}/7/ministros/${id}`).auth(token(), { type: 'bearer' }).expect(400);
    await request(app).delete(`${base}/${id}/ministros/9`).auth(token(), { type: 'bearer' }).expect(400);
    expect(pool.execute).not.toHaveBeenCalled();
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
  it('devuelve 404 para un coordinador inexistente al consultar', async () => {
    await request(app).get(`${base}/999/ministros`).auth(token(), { type: 'bearer' }).expect(404);
  });
  it.each([[], [personas[0]], [{ ...personas[0], rol_id: 3 }, personas[1]]].map(rows => [rows]))('no escribe si falta una persona o el coordinador tiene otro rol', async rows => {
    conn.execute.mockResolvedValue([rows, []]);
    await request(app).put(`${base}/7/ministros/9`).auth(token(), { type: 'bearer' }).expect(404);
    expect(conn.execute).toHaveBeenCalledOnce();
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.commit).not.toHaveBeenCalled();
  });
  it.each([
    [personas[0], { ...personas[1], rol_id: 5 }],
    [{ ...personas[0], estado_cuenta: 'rechazada' }, personas[1]],
    [personas[0], { ...personas[1], estado_cuenta: 'pendiente' }],
  ])('rechaza asignaciones con roles o cuentas no elegibles', async (coordinador, ministro) => {
    conn.execute.mockResolvedValue([[coordinador, ministro], []]);
    await request(app).put(`${base}/7/ministros/9`).auth(token(), { type: 'bearer' }).expect(400);
    expect(conn.execute).toHaveBeenCalledOnce();
    expect(conn.rollback).toHaveBeenCalledOnce();
  });
  it('permite retirar relaciones aunque la cuenta ya no esté activa', async () => {
    conn.execute.mockResolvedValue([[personas[0], { ...personas[1], estado_cuenta: 'rechazada' }], []]);
    await request(app).delete(`${base}/7/ministros/9`).auth(token(), { type: 'bearer' }).expect(200);
    expect(conn.execute).toHaveBeenLastCalledWith('DELETE FROM coordinador_ministro WHERE coordinador_id = ? AND ministro_id = ?', [7, 9]);
  });
  it('revierte un error de escritura y libera la conexión sin exponer SQL', async () => {
    conn.execute.mockResolvedValueOnce([personas, []]).mockRejectedValueOnce(new Error('SQL privado'));
    const response = await request(app).put(`${base}/7/ministros/9`).auth(token(), { type: 'bearer' }).expect(500);
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.release).toHaveBeenCalledOnce();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(JSON.stringify(response.body)).not.toContain('SQL privado');
  });
  it('responde 500 cuando no hay conexión', async () => {
    vi.mocked(pool.getConnection).mockRejectedValueOnce(new Error('sin conexión'));
    await request(app).put(`${base}/7/ministros/9`).auth(token(), { type: 'bearer' }).expect(500);
  });
  it.each(['', '/7/ministros'])('maneja errores de lectura en %s', async path => {
    vi.mocked(pool.execute).mockRejectedValueOnce(new Error('SQL privado'));
    const response = await request(app).get(base + path).auth(token(), { type: 'bearer' }).expect(500);
    expect(JSON.stringify(response.body)).not.toContain('SQL privado');
  });
});
