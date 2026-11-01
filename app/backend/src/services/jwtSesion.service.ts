import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { PoolConnection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } from '../config/env';
import { withTransaction } from '../utils/withTransaction';

export interface TokensSesion { accessToken: string; refreshToken: string; refreshExpiresAt: number }
interface Claims extends JwtPayload { id: number; sid: string; token_use: 'access' | 'refresh' }
interface Persona extends RowDataPacket { id: number; rol_id: number; estado_cuenta: string; password: string }
interface Sesion extends RowDataPacket { refresh_hash: string; expira_en: number; revocada_en: Date | null }
export class ErrorSesionJwt extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const esIdSesion = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

function verificar(token: string, tipo: Claims['token_use'], ignoreExpiration = false): Claims | null {
  try {
    const claims = jwt.verify(token, tipo === 'refresh' ? JWT_REFRESH_SECRET : JWT_SECRET, { algorithms: ['HS256'], ignoreExpiration });
    if (typeof claims === 'string' || !Number.isSafeInteger(claims.id) || claims.id <= 0 || !esIdSesion(claims.sid) || claims.token_use !== tipo) return null;
    return claims as Claims;
  } catch { return null; }
}

function emitir(id: number, rol: number, sid: string): TokensSesion {
  const accessToken = jwt.sign({ id, rol_id: rol, sid, token_use: 'access' }, JWT_SECRET,
    { algorithm: 'HS256', jwtid: randomUUID(), expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  const refreshToken = jwt.sign({ id, sid, token_use: 'refresh' }, JWT_REFRESH_SECRET,
    { algorithm: 'HS256', jwtid: randomUUID(), expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
  const exp = (jwt.decode(refreshToken) as JwtPayload).exp;
  if (!exp || exp <= Date.now() / 1000) throw new Error('Duración de sesión JWT inválida');
  return { accessToken, refreshToken, refreshExpiresAt: exp };
}

export async function crearSesionJwt(id: number, passwordVerificado: string): Promise<TokensSesion> {
  let tokens!: TokensSesion;
  await withTransaction(async conn => {
    const [personas] = await conn.execute<Persona[]>('SELECT id, rol_id, estado_cuenta, password FROM persona WHERE id = ? FOR UPDATE', [id]);
    const persona = personas[0];
    // Evita iniciar con una contraseña validada justo antes de que fuese cambiada.
    if (!persona || persona.estado_cuenta !== 'activa' || persona.password !== passwordVerificado) throw new ErrorSesionJwt(401, 'Las credenciales cambiaron o la cuenta ya no está activa');
    const sid = randomUUID();
    tokens = emitir(id, persona.rol_id, sid);
    await conn.execute('INSERT INTO sesion_jwt (id, persona_id, refresh_hash, expira_en) VALUES (?, ?, ?, ?)',
      [sid, id, hash(tokens.refreshToken), tokens.refreshExpiresAt]);
    return 'commit';
  });
  return tokens;
}

export async function renovarSesionJwt(token: string): Promise<TokensSesion | null> {
  const claims = verificar(token, 'refresh');
  if (!claims) return null;
  let tokens: TokensSesion | null = null;
  await withTransaction(async conn => {
    // Siempre persona -> sesión: mismo orden que cambio de contraseña/baja.
    const [personas] = await conn.execute<Persona[]>('SELECT id, rol_id, estado_cuenta FROM persona WHERE id = ? FOR UPDATE', [claims.id]);
    const [sesiones] = await conn.execute<Sesion[]>('SELECT refresh_hash, expira_en, revocada_en FROM sesion_jwt WHERE id = ? AND persona_id = ? FOR UPDATE', [claims.sid, claims.id]);
    const sesion = sesiones[0];
    if (!sesion || sesion.revocada_en || sesion.expira_en <= Date.now() / 1000) return 'rollback';
    const coincide = /^[a-f0-9]{64}$/.test(sesion.refresh_hash) && timingSafeEqual(Buffer.from(sesion.refresh_hash, 'hex'), Buffer.from(hash(token), 'hex'));
    if (!personas[0] || personas[0].estado_cuenta !== 'activa' || !coincide) {
      // Un refresh firmado pero ya consumido indica reutilización: revocar toda la familia.
      await conn.execute('UPDATE sesion_jwt SET revocada_en = UTC_TIMESTAMP(3) WHERE id = ?', [claims.sid]);
      return 'commit';
    }
    tokens = emitir(claims.id, personas[0].rol_id, claims.sid);
    await conn.execute('UPDATE sesion_jwt SET refresh_hash = ?, expira_en = ? WHERE id = ?', [hash(tokens.refreshToken), tokens.refreshExpiresAt, claims.sid]);
    return 'commit';
  });
  return tokens;
}

export async function cerrarSesionJwt(refreshToken?: string, accessToken?: string): Promise<void> {
  // Incluso un access expirado puede identificar la sesión que se quiere cerrar;
  // la firma y el tipo siguen siendo obligatorios. Nunca se usa así para autenticar.
  const claims = [refreshToken && verificar(refreshToken, 'refresh', true), accessToken && verificar(accessToken, 'access', true)];
  const vistas = new Set<string>();
  for (const claim of claims) {
    if (!claim || vistas.has(claim.sid)) continue;
    vistas.add(claim.sid);
    await pool.execute('UPDATE sesion_jwt SET revocada_en = UTC_TIMESTAMP(3) WHERE id = ? AND persona_id = ? AND revocada_en IS NULL', [claim.sid, claim.id]);
  }
}

export async function revocarSesionesJwt(conn: PoolConnection, personaId: number): Promise<void> {
  await conn.execute('UPDATE sesion_jwt SET revocada_en = UTC_TIMESTAMP(3) WHERE persona_id = ? AND revocada_en IS NULL', [personaId]);
}
