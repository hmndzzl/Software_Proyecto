import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import type { RowDataPacket } from 'mysql2/promise';
import { iniciarParroquiaPrueba } from '../helpers/parroquiaPrueba';

let entorno: Awaited<ReturnType<typeof iniciarParroquiaPrueba>>;
let admin: string;
let sacerdote: string;
const login = (correo: string, password = 'password123') => request(entorno.app).post('/api/auth/login').send({ correo, password });
const baja = (id: number, token: string) => request(entorno.app).patch(`/api/cuentas/${id}/baja`).auth(token, { type: 'bearer' });

beforeAll(async () => {
  process.env.CLERK_SECRET_KEY = '';
  entorno = await iniciarParroquiaPrueba();
  admin = (await login('diego@parroquia.com', 'admin123').expect(200)).body.token;
  sacerdote = (await login('sacerdote@parroquia.com').expect(200)).body.token;
});
afterAll(async () => { await entorno?.cerrar(); });

describe('D9 con MariaDB y autenticación reales', () => {
  it('aplica la migración de forma repetible conservando los registros', async () => {
    const sql = fs.readFileSync(path.resolve(__dirname, '../../../database/migrations/20261027_baja_cuentas.sql'), 'utf8');
    const [antes] = await entorno.pool.query<RowDataPacket[]>('SELECT id, estado_cuenta FROM persona ORDER BY id');
    for (let i = 0; i < 2; i++) {
      for (const sentencia of sql.split(';').filter(s => s.trim())) await entorno.pool.query(sentencia);
    }
    const [despues] = await entorno.pool.query('SELECT id, estado_cuenta FROM persona ORDER BY id');
    expect(despues).toEqual(antes);
  });

  it('solo permite la baja a Sacerdote y Admin, con protección de cuenta propia y administradores', async () => {
    await request(entorno.app).patch('/api/cuentas/9/baja').expect(401);
    for (const correo of ['ministro@parroquia.com', 'coord.min@parroquia.com', 'coord.grupos@parroquia.com']) {
      const token = (await login(correo).expect(200)).body.token;
      await baja(9, token).expect(403);
    }
    await baja(1, admin).expect(403);
    await baja(1, sacerdote).expect(403);
    await baja(999999, admin).expect(404);
  });

  it('revoca login, refresh y token emitido; oculta directorios y conserva todo el historial', async () => {
    const sesion = await login('ministro@parroquia.com').expect(200);
    const token = sesion.body.token;
    const cookies = sesion.headers['set-cookie'];
    await entorno.pool.execute("INSERT INTO reserva (fecha, hora_inicio, hora_fin, espacio_id, estado_reserva_id, solicitante_id) VALUES ('2020-01-01', '07:00','08:00', 1, 2, 9)");
    const consultas = [
      'SELECT * FROM asignacion_tarea WHERE persona_id = 9 ORDER BY tarea_id',
      'SELECT * FROM reserva WHERE solicitante_id = 9 ORDER BY id',
      'SELECT * FROM coordinador_ministro WHERE ministro_id = 9 ORDER BY coordinador_id',
    ];
    const anteriores = await Promise.all(consultas.map(async sql => (await entorno.pool.query(sql))[0]));
    await baja(9, sacerdote).expect(200);
    const bloqueado = await request(entorno.app).get('/api/auth/me').auth(token, { type: 'bearer' }).expect(403);
    expect(bloqueado.body.codigo).toBe('CUENTA_BAJA');
    expect((await login('ministro@parroquia.com').expect(403)).body.codigo).toBe('CUENTA_BAJA');
    await request(entorno.app).post('/api/auth/refresh').set('Cookie', cookies).expect(401);
    for (const ruta of ['/api/personas', '/api/personas/encargados-evento', '/api/notificaciones/destinatarios', '/api/coordinadores-ministros/7/ministros']) {
      const respuesta = await request(entorno.app).get(ruta).auth(admin, { type: 'bearer' }).expect(200);
      expect(respuesta.body.some((p: { id: number }) => p.id === 9)).toBe(false);
    }
    const posteriores = await Promise.all(consultas.map(async sql => (await entorno.pool.query(sql))[0]));
    expect(posteriores).toEqual(anteriores);
    const historial = await request(entorno.app).get('/api/cuentas/9/decisiones').auth(admin, { type: 'bearer' }).expect(200);
    expect(historial.body).toEqual(expect.arrayContaining([expect.objectContaining({ resultado: 'baja', actor_id: 6 })]));
    const tareas = await request(entorno.app).get('/api/tareas').auth(admin, { type: 'bearer' }).expect(200);
    expect(tareas.body.some((t: { asignados: { persona_id: number }[] }) => t.asignados.some(p => p.persona_id === 9))).toBe(true);
    await baja(9, admin).expect(409);
    await request(entorno.app).patch('/api/cuentas/9/aprobar').auth(admin, { type: 'bearer' }).send({ rol_id: 4 }).expect(409);
    await request(entorno.app).patch('/api/cuentas/9/rechazar').auth(admin, { type: 'bearer' }).expect(409);
    const bajas = await request(entorno.app).get('/api/cuentas?estado=baja').auth(admin, { type: 'bearer' }).expect(200);
    expect(bajas.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: 9, estado_cuenta: 'baja' })]));
  });

  it('rechaza nuevas asignaciones y notificaciones a una cuenta dada de baja', async () => {
    await request(entorno.app).post('/api/tareas/asignar').auth(admin, { type: 'bearer' })
      .send({ tarea_id: 1, persona_id: 9 }).expect(404);
    await request(entorno.app).post('/api/tareas/asignar').auth(admin, { type: 'bearer' })
      .send({ tarea_id: 1, persona_ids: [9] }).expect(404);
    await request(entorno.app).post('/api/notificaciones').auth(admin, { type: 'bearer' })
      .send({ mensaje: 'No enviar', tipo: 'individual', destinatarios: [9] }).expect(400);
  });
});
