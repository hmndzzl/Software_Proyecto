import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, expect, it, vi } from 'vitest';
import router from '../../routes/persona.routes';
import pool from '../../config/db';
import { JWT_SECRET } from '../../config/env';
import { obtenerPersonaSesion } from '../../services/sesion.service';
import { guardarFotoPerfil, eliminarFotoPerfil, ErrorFotoPerfil } from '../../services/perfilFoto.service';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../services/sesion.service', () => ({ obtenerPersonaSesion: vi.fn() }));
vi.mock('../../services/perfilFoto.service', async original => ({ ...await original<typeof import('../../services/perfilFoto.service')>(), guardarFotoPerfil: vi.fn(), eliminarFotoPerfil: vi.fn() }));
const app = express().use(express.json()).use('/api/personas', router);
const anterior = '/uploads/perfiles/subidas/00000000-0000-0000-0000-000000000001.webp';
const nueva = anterior.replace('001.webp', '002.webp');
const conn = { execute: vi.fn(), beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
const token = () => `Bearer ${jwt.sign({ id: 7, rol_id: 4 }, JWT_SECRET)}`;
const archivo = { filename: 'foto.png', contentType: 'image/png' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(obtenerPersonaSesion).mockResolvedValue({ id: 7, rol_id: 4, estado_cuenta: 'activa' });
  vi.mocked(pool.getConnection).mockResolvedValue(conn as unknown as Awaited<ReturnType<typeof pool.getConnection>>);
  conn.execute.mockResolvedValueOnce([[{ foto_url: anterior }]]).mockResolvedValue([{}]);
  vi.mocked(guardarFotoPerfil).mockResolvedValue(nueva);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
it('exige sesión, un id válido y propiedad del perfil antes de recibir archivos', async () => {
  await request(app).put('/api/personas/7/foto').expect(401);
  await request(app).put('/api/personas/x/foto').set('Authorization', token()).expect(400);
  await request(app).put('/api/personas/8/foto').set('Authorization', token()).expect(403);
  expect(guardarFotoPerfil).not.toHaveBeenCalled();
});
it('reemplaza la foto propia y elimina la anterior solo tras confirmar la transacción', async () => {
  const res = await request(app).put('/api/personas/7/foto').set('Authorization', token()).attach('imagen', Buffer.from('png'), archivo).expect(200);
  expect(res.body).toEqual({ foto_url: nueva });
  expect(conn.execute).toHaveBeenLastCalledWith('UPDATE persona SET foto_url = ? WHERE id = ?', [nueva, 7]);
  expect(conn.commit).toHaveBeenCalledOnce();
  expect(eliminarFotoPerfil).toHaveBeenCalledWith(anterior);
  expect(vi.mocked(eliminarFotoPerfil).mock.invocationCallOrder[0]).toBeGreaterThan(conn.commit.mock.invocationCallOrder[0]);
});
it('admite una cuenta que todavía no tiene foto', async () => {
  conn.execute.mockReset().mockResolvedValueOnce([[{ foto_url: null }]]).mockResolvedValue([{}]);
  await request(app).put('/api/personas/7/foto').set('Authorization', token()).attach('imagen', Buffer.from('png'), archivo).expect(200);
});
it('valida archivo ausente, SVG, exceso de tamaño y múltiples archivos', async () => {
  await request(app).put('/api/personas/7/foto').set('Authorization', token()).expect(400);
  await request(app).put('/api/personas/7/foto').set('Authorization', token()).attach('imagen', Buffer.from('<svg/>'), { filename: 'foto.svg', contentType: 'image/svg+xml' }).expect(400);
  await request(app).put('/api/personas/7/foto').set('Authorization', token()).attach('imagen', Buffer.alloc(10 * 1024 * 1024 + 1), archivo).expect(413);
  await request(app).put('/api/personas/7/foto').set('Authorization', token()).attach('imagen', Buffer.from('png'), archivo).attach('imagen', Buffer.from('png'), archivo).expect(400);
  expect(guardarFotoPerfil).not.toHaveBeenCalled();
});
it('limpia únicamente la nueva foto si falla la escritura', async () => {
  conn.execute.mockReset().mockResolvedValueOnce([[{ foto_url: anterior }]]).mockRejectedValueOnce(new Error('BD'));
  await request(app).put('/api/personas/7/foto').set('Authorization', token()).attach('imagen', Buffer.from('png'), archivo).expect(500);
  expect(conn.rollback).toHaveBeenCalled();
  expect(eliminarFotoPerfil).toHaveBeenCalledWith(nueva);
  expect(eliminarFotoPerfil).not.toHaveBeenCalledWith(anterior);
});
it('devuelve 404 si la cuenta desapareció y limpia el archivo nuevo', async () => {
  conn.execute.mockReset().mockResolvedValueOnce([[]]);
  await request(app).put('/api/personas/7/foto').set('Authorization', token()).attach('imagen', Buffer.from('png'), archivo).expect(404);
  expect(eliminarFotoPerfil).toHaveBeenCalledWith(nueva);
});
it('informa errores de validación y de almacenamiento sin filtrar detalles internos', async () => {
  vi.mocked(guardarFotoPerfil).mockRejectedValueOnce(new ErrorFotoPerfil(400, 'Imagen inválida')).mockRejectedValueOnce(new Error('ruta interna'));
  const invalid = await request(app).put('/api/personas/7/foto').set('Authorization', token()).attach('imagen', Buffer.from('png'), archivo).expect(400);
  expect(invalid.body.mensaje).toBe('Imagen inválida');
  const fallo = await request(app).put('/api/personas/7/foto').set('Authorization', token()).attach('imagen', Buffer.from('png'), archivo).expect(500);
  expect(JSON.stringify(fallo.body)).not.toContain('ruta interna');
});
