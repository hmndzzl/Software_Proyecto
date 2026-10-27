import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { iniciarParroquiaPrueba } from '../helpers/parroquiaPrueba';

let entorno: Awaited<ReturnType<typeof iniciarParroquiaPrueba>>;
let admin: string;
let coord: string;
let ministro: string;
let sacerdote: string;
let eventoId: number;
let reservaId: number;
const fecha = '2099-12-21';
const baseTarea = { titulo: 'D4 preparación', descripcion: 'Preparar altar', fecha, hora_inicio: '09:30', hora_fin: '10:00' };
const reserva = { fecha, hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 2, titulo: 'D4 misa', descripcion: 'Celebración' };
const parametros = { fecha_inicio: fecha, fecha_fin: fecha, vista: 'coordinacion' };

beforeAll(async () => {
  entorno = await iniciarParroquiaPrueba();
  const login = async (correo: string, password = 'password123') => (await request(entorno.app).post('/api/auth/login').send({ correo, password }).expect(200)).body.token as string;
  admin = await login('diego@parroquia.com', 'admin123');
  coord = await login('coord.min@parroquia.com');
  ministro = await login('ministro@parroquia.com');
  sacerdote = await login('sacerdote@parroquia.com');
  reservaId = (await request(entorno.app).post('/api/reservas').auth(admin, { type: 'bearer' }).send(reserva).expect(201)).body.reservaId;
  const [rows] = await entorno.pool.query<RowDataPacket[]>('SELECT id FROM evento WHERE reserva_id = ?', [reservaId]);
  eventoId = rows[0].id;
});
afterAll(async () => { await entorno?.cerrar(); });
beforeEach(async () => {
  await entorno.pool.query("DELETE FROM tarea WHERE titulo LIKE 'D4%'");
  await entorno.pool.query('UPDATE reserva SET fecha = ?, estado_reserva_id = 2 WHERE id = ?', [fecha, reservaId]);
});
const crear = (body = {}) => request(entorno.app).post('/api/tareas').auth(admin, { type: 'bearer' }).send({ ...baseTarea, evento_id: eventoId, persona_ids: [9, 11], ...body });
const calendario = (token = admin, query = {}) => request(entorno.app).get('/api/calendario').auth(token, { type: 'bearer' }).query({ ...parametros, ...query });

describe('D4 con MariaDB real', () => {
  it('crea, relaciona y filtra sin duplicar tareas ni exponer equipos ajenos', async () => {
    const creado = await crear().expect(201);
    expect(creado.body.tarea.evento_id).toBe(eventoId);
    for (const token of [admin, sacerdote]) {
      const response = await calendario(token).expect(200);
      expect(response.body.eventos.find((e: { id: number }) => e.id === eventoId).tareas[0].asignados.map((a: { persona_id: number }) => a.persona_id).sort((a: number, b: number) => a - b)).toEqual([9, 11]);
      expect(response.body.tareas.filter((t: { id: number }) => t.id === creado.body.tarea.id)).toHaveLength(1);
    }
    const coordinado = await calendario(coord, { persona_id: '9' }).expect(200);
    expect(coordinado.body.tareas[0].asignados).toEqual([{ persona_id: 9, nombre: 'Ministro Test' }]);
    expect(coordinado.body.eventos[0].titulo).toBe('D4 misa');
    await calendario(coord, { persona_id: '11' }).expect(403);
    await calendario(ministro).expect(403);
    const personal = await calendario(ministro, { vista: 'personal' }).expect(200);
    expect(personal.body.tareas[0].asignados).toEqual([{ persona_id: 9, nombre: 'Ministro Test' }]);
    expect(JSON.stringify(personal.body)).not.toContain('Carlos Ramirez');
    const parroquial = await calendario(ministro, { vista: 'parroquial' }).expect(200);
    expect(parroquial.body.tareas).toEqual([]);
    expect(parroquial.body.eventos[0].tareas).toEqual([]);
    await request(entorno.app).get('/api/calendario').query(parametros).expect(401);
  });

  it('conserva y retira la relación explícitamente al editar', async () => {
    const id = (await crear().expect(201)).body.tarea.id;
    const editar = (extra = {}) => request(entorno.app).put(`/api/tareas/${id}`).auth(admin, { type: 'bearer' }).send({ ...baseTarea, ...extra });
    expect((await editar().expect(200)).body.tarea.evento_id).toBe(eventoId);
    await editar({ fecha: '2099-12-22' }).expect(400);
    await request(entorno.app).put(`/api/reservas/${reservaId}`).auth(admin, { type: 'bearer' }).send({ ...reserva, fecha: '2099-12-22' }).expect(409);
    await editar({ evento_id: null }).expect(200);
    await request(entorno.app).put(`/api/reservas/${reservaId}`).auth(admin, { type: 'bearer' }).send({ ...reserva, fecha: '2099-12-22' }).expect(200);
    const [rows] = await entorno.pool.query<RowDataPacket[]>('SELECT evento_id, fecha FROM tarea WHERE id = ?', [id]);
    expect(rows[0]).toMatchObject({ evento_id: null });
  });

  it('valida antes de crear y revierte todos los registros ante conflictos', async () => {
    await crear({ fecha: '2099-12-22' }).expect(400);
    await crear({ evento_id: -1 }).expect(400);
    await crear({ evento_id: 999999 }).expect(404);
    await crear().expect(201);
    await crear({ titulo: 'D4 duplicada' }).expect(409);
    const [rows] = await entorno.pool.query<RowDataPacket[]>("SELECT * FROM tarea WHERE titulo LIKE 'D4%'");
    expect(rows).toHaveLength(1);
  });

  it('distingue pendientes y oculta eventos cancelados con sus tareas sin borrar registros', async () => {
    await crear().expect(201);
    await entorno.pool.query('UPDATE reserva SET estado_reserva_id = 1 WHERE id = ?', [reservaId]);
    expect((await calendario().expect(200)).body.eventos[0].estado_reserva_id).toBe(1);
    expect((await calendario(ministro, { vista: 'parroquial' }).expect(200)).body.eventos).toEqual([]);
    await entorno.pool.query('UPDATE reserva SET estado_reserva_id = 4 WHERE id = ?', [reservaId]);
    for (const [token, query] of [
      [admin, {}], [sacerdote, {}], [coord, {}], [coord, { persona_id: '9' }],
      [ministro, { vista: 'personal' }], [admin, { vista: 'personal' }],
      [ministro, { vista: 'parroquial' }],
    ] as const) {
      const response = await calendario(token, query).expect(200);
      expect(response.body).toEqual({ eventos: [], tareas: [] });
    }
    const [persistidas] = await entorno.pool.query<RowDataPacket[]>('SELECT id, evento_id FROM tarea WHERE evento_id = ?', [eventoId]);
    expect(persistidas).toHaveLength(1);
    const [asignados] = await entorno.pool.query<RowDataPacket[]>('SELECT persona_id FROM asignacion_tarea WHERE tarea_id = ?', [persistidas[0].id]);
    expect(asignados).toHaveLength(2);
    await crear({ titulo: 'D4 nueva cancelada', hora_inicio: '08:00', hora_fin: '09:00' }).expect(400);
  });

  it('desvincula al borrar un evento sin eliminar tareas ni asignaciones', async () => {
    const [r] = await entorno.pool.query<ResultSetHeader>('INSERT INTO reserva (fecha,hora_inicio,hora_fin,espacio_id,estado_reserva_id,solicitante_id) VALUES (?, ?, ?, 2, 2, 1)', [fecha, '12:00', '13:00']);
    const [e] = await entorno.pool.query<ResultSetHeader>("INSERT INTO evento (titulo,descripcion,encargado_id,reserva_id) VALUES ('D4 temporal','Prueba',1,?)", [r.insertId]);
    const id = (await crear({ evento_id: e.insertId }).expect(201)).body.tarea.id;
    await request(entorno.app).delete(`/api/eventos/${e.insertId}`).auth(admin, { type: 'bearer' }).expect(204);
    const [rows] = await entorno.pool.query<RowDataPacket[]>('SELECT evento_id FROM tarea WHERE id = ?', [id]);
    const [asignados] = await entorno.pool.query<RowDataPacket[]>('SELECT persona_id FROM asignacion_tarea WHERE tarea_id = ?', [id]);
    expect(rows[0].evento_id).toBeNull();
    expect(asignados).toHaveLength(2);
  });

  it('migra una tabla anterior y puede repetirse sin perder registros', async () => {
    const conn = await entorno.pool.getConnection();
    try {
      await conn.query('CREATE TABLE d4_tarea_antigua (id INT PRIMARY KEY, titulo VARCHAR(255))');
      await conn.query("INSERT INTO d4_tarea_antigua VALUES (1, 'Tarea existente')");
      const sql = fs.readFileSync(path.resolve(__dirname, '../../../database/migrations/20261024_tarea_evento.sql'), 'utf8')
        .replace(/\btarea\b/g, 'd4_tarea_antigua').replace(/fk_tarea_evento/g, 'fk_d4_antigua_evento').replace(/idx_tarea_evento/g, 'idx_d4_antigua_evento');
      for (let i = 0; i < 2; i++) for (const statement of sql.split(';').filter(s => s.trim())) await conn.query(statement);
      const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM d4_tarea_antigua');
      expect(rows).toEqual([{ id: 1, titulo: 'Tarea existente', evento_id: null }]);
    } finally {
      await conn.query('DROP TABLE IF EXISTS d4_tarea_antigua');
      conn.release();
    }
  });
});
