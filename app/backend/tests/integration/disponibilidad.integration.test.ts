import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { iniciarParroquiaPrueba } from '../helpers/parroquiaPrueba';

let entorno: Awaited<ReturnType<typeof iniciarParroquiaPrueba>>;
let admin: string, coord: string, ministro: string, sacerdote: string;
const url = '/api/personas/9/disponibilidad/periodos';
const periodo = { desde: '2099-12-10T10:00', hasta: '2099-12-15T18:00' };
beforeAll(async () => {
  entorno = await iniciarParroquiaPrueba();
  const login = async (correo: string, password = 'password123') => (await request(entorno.app).post('/api/auth/login').send({ correo, password }).expect(200)).body.token;
  admin = await login('diego@parroquia.com', 'admin123'); coord = await login('coord.min@parroquia.com');
  ministro = await login('ministro@parroquia.com'); sacerdote = await login('sacerdote@parroquia.com');
});
afterAll(async () => { await entorno?.cerrar(); });
beforeEach(async () => {
  await entorno.pool.query('DELETE FROM disponibilidad_periodo');
  await entorno.pool.query('DELETE FROM periodo_ausencia');
  await entorno.pool.query("DELETE FROM tarea WHERE titulo = 'Disponibilidad prueba'");
  await entorno.pool.query('UPDATE persona SET disponible = 1 WHERE id IN (9, 11)');
});
const crearTarea = (fecha: string, inicio: string, fin: string, ids = [9]) => request(entorno.app).post('/api/tareas').auth(admin, { type: 'bearer' }).send({
  titulo: 'Disponibilidad prueba', descripcion: 'Prueba aislada', fecha, hora_inicio: inicio, hora_fin: fin, persona_ids: ids,
});

it('persiste, lista y elimina periodos; aplica permisos y migración repetible', async () => {
  await request(entorno.app).get(url).expect(401);
  await request(entorno.app).post(url).auth(ministro, { type: 'bearer' }).send(periodo).expect(403);
  await request(entorno.app).get('/api/personas/11/disponibilidad/periodos').auth(coord, { type: 'bearer' }).expect(403);
  const creado = await request(entorno.app).post(url).auth(coord, { type: 'bearer' }).send(periodo).expect(201);
  const sql = fs.readFileSync(path.resolve(__dirname, '../../../database/migrations/20261026_disponibilidad_periodo.sql'), 'utf8');
  await entorno.pool.query(sql); await entorno.pool.query(sql);
  for (const token of [admin, coord, sacerdote]) {
    const listado = await request(entorno.app).get(url).auth(token, { type: 'bearer' }).expect(200);
    expect(listado.body).toEqual([creado.body]);
  }
  await request(entorno.app).delete(`/api/personas/11/disponibilidad/periodos/${creado.body.id}`).auth(admin, { type: 'bearer' }).expect(404);
  await request(entorno.app).delete(`${url}/${creado.body.id}`).auth(coord, { type: 'bearer' }).expect(204);
  expect((await request(entorno.app).get(url).auth(admin, { type: 'bearer' }).expect(200)).body).toEqual([]);
});

it.each([
  ['2099-12-10', '09:00', '10:00', false], ['2099-12-10', '09:30', '10:01', true],
  ['2099-12-11', '10:00', '11:00', true], ['2099-12-15', '17:00', '19:00', true],
  ['2099-12-15', '18:00', '19:00', false], ['2099-12-16', '10:00', '11:00', false],
])('comprueba solapamiento %s %s-%s', async (fecha, inicio, fin, esperado) => {
  await request(entorno.app).post(url).auth(admin, { type: 'bearer' }).send(periodo).expect(201);
  const res = await crearTarea(fecha, inicio, fin).expect(201);
  expect(res.body.alertas[0]).toMatchObject({ ministro_no_disponible: esperado, periodo_no_disponible: esperado, ausencia_reportada: false });
});

it('incluye ausencias reportadas y alerta en asignación individual, múltiple y reasignación', async () => {
  await request(entorno.app).post('/api/ausencias').auth(ministro, { type: 'bearer' }).send({ ministro_id: 9,
    fecha_inicio: '2099-12-10', fecha_fin: '2099-12-15', titulo: 'Ausencia prueba', justificacion: 'Fuera de la ciudad' }).expect(201);
  const listado = await request(entorno.app).get(url).auth(coord, { type: 'bearer' }).expect(200);
  expect(listado.body[0]).toMatchObject({ desde: '2099-12-10T00:00', hasta: '2099-12-16T00:00', origen: 'ausencia' });
  const tarea = await crearTarea('2099-12-15', '22:00', '23:00').expect(201);
  expect(tarea.body.alertas[0]).toMatchObject({ ministro_no_disponible: true, ausencia_reportada: true });
  const otra = await crearTarea('2099-12-10', '00:00', '01:00', [11]).expect(201);
  const id = otra.body.tarea.id;
  const reasignada = await request(entorno.app).put('/api/tareas/asignar').auth(admin, { type: 'bearer' }).send({ tarea_id: id, persona_actual_id: 11, persona_nueva_id: 9 }).expect(200);
  expect(reasignada.body.alerta.ausencia_reportada).toBe(true);
  const individual = await crearTarea('2099-12-12', '10:00', '11:00', [11]).expect(201);
  const asignada = await request(entorno.app).post('/api/tareas/asignar').auth(admin, { type: 'bearer' }).send({ tarea_id: individual.body.tarea.id, persona_id: 9 }).expect(201);
  expect(asignada.body.alerta.ausencia_reportada).toBe(true);
  const multiple = await crearTarea('2099-12-13', '10:00', '11:00', [11]).expect(201);
  const agregada = await request(entorno.app).post('/api/tareas/asignar').auth(admin, { type: 'bearer' }).send({ tarea_id: multiple.body.tarea.id, persona_ids: [9] }).expect(201);
  expect(agregada.body.alertas[0].ausencia_reportada).toBe(true);
  expect((await crearTarea('2099-12-16', '00:00', '01:00').expect(201)).body.alertas[0].ministro_no_disponible).toBe(false);
});
