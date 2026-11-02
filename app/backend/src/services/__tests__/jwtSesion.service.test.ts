import { createHash, randomUUID } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import pool from '../../config/db';
import { JWT_SECRET, JWT_REFRESH_SECRET } from '../../config/env';
import { crearSesionJwt, renovarSesionJwt, cerrarSesionJwt, revocarSesionesJwt } from '../jwtSesion.service';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn(), getConnection: vi.fn() } }));
const conn = { execute: vi.fn(), beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
const persona = { id: 7, rol_id: 4, estado_cuenta: 'activa', password: 'hash-validado' };
const sid = randomUUID();
const hash = (valor: string) => createHash('sha256').update(valor).digest('hex');
const token = (tipo = 'refresh', extra: object = {}, expiresIn = 900) => jwt.sign({ id: 7, sid, token_use: tipo, ...extra }, tipo === 'access' ? JWT_SECRET : JWT_REFRESH_SECRET, { expiresIn, jwtid: randomUUID() });
const fila = (refresh: string, extra = {}) => ({ refresh_hash: hash(refresh), expira_en: Math.floor(Date.now() / 1000) + 900, revocada_en: null, ...extra });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(pool.getConnection).mockResolvedValue(conn as unknown as PoolConnection);
});
afterEach(() => vi.restoreAllMocks());

it('emite tokens distintos, ligados a una sesión, y persiste solo el hash del refresh', async () => {
  conn.execute.mockResolvedValueOnce([[persona]]).mockResolvedValue([{}]);
  const resultado = await crearSesionJwt(7, persona.password);
  const acceso = jwt.verify(resultado.accessToken, JWT_SECRET) as JwtPayload;
  const refresh = jwt.verify(resultado.refreshToken, JWT_REFRESH_SECRET) as JwtPayload;
  expect(acceso).toMatchObject({ id: 7, rol_id: 4, token_use: 'access', sid: refresh.sid });
  expect(refresh.token_use).toBe('refresh');
  expect(acceso.jti).not.toBe(refresh.jti);
  expect(conn.execute).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO sesion_jwt'), [refresh.sid, 7, hash(resultado.refreshToken), refresh.exp]);
  expect(conn.commit).toHaveBeenCalledOnce();
});
it.each([null, { ...persona, estado_cuenta: 'baja' }, { ...persona, password: 'cambiado' }])('no crea sesión con credenciales que ya no son vigentes: %j', async p => {
  conn.execute.mockResolvedValue([p ? [p] : []]);
  await expect(crearSesionJwt(7, persona.password)).rejects.toMatchObject({ status: 401 });
  expect(conn.rollback).toHaveBeenCalled();
});
it('no persiste tokens si la duración configurada no produce una expiración válida', async () => {
  conn.execute.mockResolvedValue([[persona]]);
  vi.spyOn(jwt, 'decode').mockReturnValue({ exp: 0 });
  await expect(crearSesionJwt(7, persona.password)).rejects.toThrow('Duración');
  expect(conn.execute).toHaveBeenCalledTimes(1);
});
it('rota el refresh de forma atómica y toma el rol actual de la BD', async () => {
  const anterior = token();
  conn.execute.mockResolvedValueOnce([[{ ...persona, rol_id: 2 }]]).mockResolvedValueOnce([[fila(anterior)]]).mockResolvedValue([{}]);
  const nuevos = await renovarSesionJwt(anterior);
  expect(nuevos).not.toBeNull();
  expect(nuevos!.refreshToken).not.toBe(anterior);
  expect(jwt.verify(nuevos!.accessToken, JWT_SECRET)).toMatchObject({ rol_id: 2, sid });
  expect(conn.execute).toHaveBeenLastCalledWith(expect.stringContaining('UPDATE sesion_jwt SET refresh_hash'), [hash(nuevos!.refreshToken), nuevos!.refreshExpiresAt, sid]);
});
it.each(['inexistente', 'revocada', 'expirada'])('rechaza sesión %s sin emitir tokens', async estado => {
  const refresh = token();
  const row = fila(refresh, estado === 'revocada' ? { revocada_en: new Date() } : { expira_en: 0 });
  conn.execute.mockResolvedValueOnce([[persona]]).mockResolvedValueOnce([estado === 'inexistente' ? [] : [row]]);
  expect(await renovarSesionJwt(refresh)).toBeNull();
  expect(conn.commit).not.toHaveBeenCalled();
});
it.each(['reuso', 'hash-invalido', 'cuenta-baja', 'cuenta-eliminada'])('revoca la familia ante %s', async caso => {
  const refresh = token();
  const row = fila(refresh, caso === 'reuso' ? { refresh_hash: hash('otro-token') } : caso === 'hash-invalido' ? { refresh_hash: 'x' } : {});
  conn.execute.mockResolvedValueOnce([caso === 'cuenta-eliminada' ? [] : [{ ...persona, estado_cuenta: caso === 'cuenta-baja' ? 'baja' : 'activa' }]])
    .mockResolvedValueOnce([[row]]).mockResolvedValue([{}]);
  expect(await renovarSesionJwt(refresh)).toBeNull();
  expect(conn.execute).toHaveBeenLastCalledWith(expect.stringContaining('SET revocada_en'), [sid]);
  expect(conn.commit).toHaveBeenCalled();
});
it('rechaza firmas, tipos y payloads inválidos antes de consultar la BD', async () => {
  const invalidos = ['no-es-jwt', token('access'), token('refresh', { sid: 'x' }), token('refresh', { id: -1 }), token('refresh', {}, -1),
    jwt.sign('payload-string', JWT_REFRESH_SECRET), jwt.sign({ id: 7, sid, token_use: 'refresh' }, 'otro-secreto')];
  for (const valor of invalidos) expect(await renovarSesionJwt(valor)).toBeNull();
  expect(pool.getConnection).not.toHaveBeenCalled();
});
it('logout revoca una sola vez la sesión indicada por cookie y bearer y admite access expirado', async () => {
  await cerrarSesionJwt(token(), token('access', {}, -1));
  expect(pool.execute).toHaveBeenCalledTimes(1);
  expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('revocada_en IS NULL'), [sid, 7]);
});
it('logout ignora tokens ausentes o ajenos y propaga fallos de almacenamiento', async () => {
  await cerrarSesionJwt(); await cerrarSesionJwt('inválido', 'token-de-clerk');
  expect(pool.execute).not.toHaveBeenCalled();
  vi.mocked(pool.execute).mockRejectedValueOnce(new Error('BD no disponible'));
  await expect(cerrarSesionJwt(undefined, token('access'))).rejects.toThrow('BD no disponible');
});
it('la revocación global se ejecuta dentro de la conexión transaccional recibida', async () => {
  await revocarSesionesJwt(conn as unknown as PoolConnection, 7);
  expect(conn.execute).toHaveBeenCalledWith(expect.stringContaining('WHERE persona_id = ?'), [7]);
});
