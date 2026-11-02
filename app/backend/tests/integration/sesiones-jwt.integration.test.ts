import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import request from 'supertest';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { MariaDbContainer, type StartedMariaDbContainer } from '@testcontainers/mariadb';

describe('SEC-03: sesiones JWT revocables en MariaDB', () => {
  let container: StartedMariaDbContainer;
  let pool: Pool;
  let app: Awaited<typeof import('../../src/app')>['app'];
  let crear: typeof import('../../src/services/jwtSesion.service')['crearSesionJwt'];
  let passwordHash: string;
  const secret = 'solo-pruebas-sec03-access';
  const refreshSecret = 'solo-pruebas-sec03-refresh';
  const password = 'Solo-Pruebas-SEC03!';
  const cookie = (token: string) => `refreshToken=${token}`;
  const claims = (token: string) => jwt.decode(token) as JwtPayload;
  const cookieToken = (res: request.Response) => {
    const cookies = res.headers['set-cookie'] as unknown as string[];
    return cookies.find(c => c.startsWith('refreshToken='))!.split(';')[0].slice('refreshToken='.length);
  };
  const me = (token: string) => request(app).get('/api/auth/me').auth(token, { type: 'bearer' });
  const refresh = (token: string) => request(app).post('/api/auth/refresh').set('Cookie', cookie(token));
  const sesion = (id = 50) => crear(id, passwordHash);

  beforeAll(async () => {
    container = await new MariaDbContainer('mariadb:11').withDatabase('sesiones_test')
      .withUsername('pruebas').withUserPassword('pruebas').withRootPassword('root_test').start();
    Object.assign(process.env, {
      NODE_ENV: 'test', CLERK_SECRET_KEY: '', SMTP_HOST: '',
      JWT_SECRET: secret, JWT_REFRESH_SECRET: refreshSecret,
      JWT_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '15d',
      DB_HOST: container.getHost(), DB_PORT: String(container.getPort()), DB_USER: container.getUsername(),
      DB_PASSWORD: container.getUserPassword(), DB_NAME: container.getDatabase(),
    });
    const conn = await mysql.createConnection({ host: container.getHost(), port: container.getPort(),
      user: container.getUsername(), password: container.getUserPassword(), database: container.getDatabase(), multipleStatements: true });
    try {
      for (const file of ['01_schema.sql']) {
        await conn.query(fs.readFileSync(path.resolve(__dirname, '../../../database/init', file), 'utf8'));
      }
      await conn.query("INSERT INTO rol (id, detalle) VALUES (4, 'Ministro'), (5, 'Administrador')");
      passwordHash = await bcrypt.hash(password, 4);
      await conn.execute("INSERT INTO persona (id, nombre, correo, password, rol_id, estado_cuenta) VALUES (50, 'Prueba SEC03', 'sec03@example.test', ?, 4, 'activa'), (51, 'Admin SEC03', 'admin-sec03@example.test', ?, 5, 'activa')", [passwordHash, passwordHash]);
    } finally { await conn.end(); }
    vi.resetModules();
    ({ app } = await import('../../src/app'));
    ({ default: pool } = await import('../../src/config/db'));
    ({ crearSesionJwt: crear } = await import('../../src/services/jwtSesion.service'));
  });
  beforeEach(async () => {
    await pool.execute('DELETE FROM sesion_jwt WHERE persona_id IN (50, 51)');
    await pool.execute("UPDATE persona SET password = ?, estado_cuenta = 'activa' WHERE id IN (50, 51)", [passwordHash]);
  });
  afterAll(async () => { await pool?.end(); await container?.stop(); });

  it('login persiste solo el hash; la migración es repetible y conserva sesiones', async () => {
    const res = await request(app).post('/api/auth/login').send({ correo: 'sec03@example.test', password }).expect(200);
    const refreshToken = cookieToken(res);
    const sid = claims(res.body.token).sid;
    const sql = fs.readFileSync(path.resolve(__dirname, '../../../database/migrations/20261104_sesiones_jwt.sql'), 'utf8');
    await pool.query(sql); await pool.query(sql);
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM sesion_jwt WHERE id = ?', [sid]);
    expect(rows).toHaveLength(1);
    expect(rows[0].refresh_hash).toBe(createHash('sha256').update(refreshToken).digest('hex'));
    expect(JSON.stringify(rows)).not.toContain(refreshToken);
    await me(res.body.token).expect(200);
  });

  it('logout rechaza inmediatamente el access y el refresh anteriores; es idempotente', async () => {
    const s = await sesion();
    const salir = () => request(app).post('/api/auth/logout').set('Cookie', cookie(s.refreshToken)).auth(s.accessToken, { type: 'bearer' });
    await salir().expect(200); await salir().expect(200);
    await me(s.accessToken).expect(401); await refresh(s.refreshToken).expect(401);
  });
  it('cerrar una sesión no cierra otra sesión del mismo usuario', async () => {
    const a = await sesion(); const b = await sesion();
    await request(app).post('/api/auth/logout').set('Cookie', cookie(a.refreshToken)).expect(200);
    await me(a.accessToken).expect(401); await me(b.accessToken).expect(200); await refresh(b.refreshToken).expect(200);
  });
  it('rota el refresh; reutilizar el anterior revoca toda la familia', async () => {
    const s = await sesion();
    const renovada = await refresh(s.refreshToken).expect(200);
    const nuevoRefresh = cookieToken(renovada);
    expect(nuevoRefresh).not.toBe(s.refreshToken);
    await me(renovada.body.token).expect(200);
    await refresh(s.refreshToken).expect(401);
    await refresh(nuevoRefresh).expect(401); await me(renovada.body.token).expect(401);
  });
  it('serializa dos renovaciones simultáneas y detecta el reuso', async () => {
    const s = await sesion();
    const respuestas = await Promise.all([refresh(s.refreshToken), refresh(s.refreshToken)]);
    expect(respuestas.map(r => r.status).sort()).toEqual([200, 401]);
    await me(respuestas.find(r => r.status === 200)!.body.token).expect(401);
  });
  it('un refresh con firma falsificada no revoca la sesión legítima', async () => {
    const s = await sesion();
    const falso = jwt.sign({ id: 50, sid: claims(s.accessToken).sid, token_use: 'refresh' }, 'secreto-ajeno');
    await refresh(falso).expect(401); await me(s.accessToken).expect(200); await refresh(s.refreshToken).expect(200);
  });
  it('cambiar la contraseña revoca todas las sesiones JWT y permite ingresar con la nueva', async () => {
    const a = await sesion(); const b = await sesion();
    const nueva = 'Clave-Nueva-SEC03!';
    await request(app).put('/api/personas/50').auth(a.accessToken, { type: 'bearer' }).send({ password: nueva }).expect(200);
    for (const s of [a, b]) { await me(s.accessToken).expect(401); await refresh(s.refreshToken).expect(401); }
    await request(app).post('/api/auth/login').send({ correo: 'sec03@example.test', password }).expect(401);
    const res = await request(app).post('/api/auth/login').send({ correo: 'sec03@example.test', password: nueva }).expect(200);
    await me(res.body.token).expect(200);
  });
  it('la baja revoca sesiones; reactivar la cuenta no resucita tokens anteriores', async () => {
    const s = await sesion(); const admin = await sesion(51);
    await request(app).patch('/api/cuentas/50/baja').auth(admin.accessToken, { type: 'bearer' }).expect(200);
    await me(s.accessToken).expect(403); await refresh(s.refreshToken).expect(401);
    await pool.execute("UPDATE persona SET estado_cuenta = 'activa' WHERE id = 50");
    await me(s.accessToken).expect(401); await refresh(s.refreshToken).expect(401);
  });
  it('rechaza tokens anteriores sin sesión y tokens del tipo incorrecto', async () => {
    const s = await sesion();
    const antiguo = jwt.sign({ id: 50, rol_id: 4 }, secret, { expiresIn: 900 });
    const antiguoRefresh = jwt.sign({ id: 50 }, refreshSecret, { expiresIn: 900 });
    const tipoIncorrecto = jwt.sign({ id: 50, sid: claims(s.accessToken).sid, token_use: 'refresh' }, secret, { expiresIn: 900 });
    await me(antiguo).expect(401); await refresh(antiguoRefresh).expect(401); await me(tipoIncorrecto).expect(401);
  });
  it('un access expirado no autentica, pero su firma permite cerrar su propia sesión', async () => {
    const s = await sesion();
    const expirado = jwt.sign({ id: 50, sid: claims(s.accessToken).sid, token_use: 'access' }, secret, { expiresIn: -1 });
    await me(expirado).expect(401);
    await request(app).post('/api/auth/logout').auth(expirado, { type: 'bearer' }).expect(200);
    await refresh(s.refreshToken).expect(401);
  });
  it('la expiración de la sesión en BD también bloquea el acceso y la renovación', async () => {
    const s = await sesion();
    await pool.execute('UPDATE sesion_jwt SET expira_en = 0 WHERE id = ?', [claims(s.accessToken).sid]);
    await me(s.accessToken).expect(401); await refresh(s.refreshToken).expect(401);
  });
  it('no confirma un logout fallido ni cambia la contraseña si falla la revocación', async () => {
    const s = await sesion();
    await pool.query(`CREATE TRIGGER impedir_revocacion BEFORE UPDATE ON sesion_jwt FOR EACH ROW
      BEGIN IF NEW.revocada_en IS NOT NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fallo de revocacion de prueba'; END IF; END`);
    try {
      await request(app).post('/api/auth/logout').set('Cookie', cookie(s.refreshToken)).expect(500);
      await request(app).put('/api/personas/50').auth(s.accessToken, { type: 'bearer' }).send({ password: 'Cambio-Que-Debe-Revertirse!' }).expect(500);
      const [rows] = await pool.query<RowDataPacket[]>('SELECT password FROM persona WHERE id = 50');
      expect(rows[0].password).toBe(passwordHash);
      await me(s.accessToken).expect(200);
    } finally { await pool.query('DROP TRIGGER impedir_revocacion'); }
  });
});
