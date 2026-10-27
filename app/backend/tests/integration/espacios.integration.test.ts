import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import type { RowDataPacket } from 'mysql2';
import { iniciarParroquiaPrueba } from '../helpers/parroquiaPrueba';

let entorno: Awaited<ReturnType<typeof iniciarParroquiaPrueba>>;
let admin: string;
let sacerdote: string;
let coord: string;
let espacioId: number;
const fotos = new Set<string>();
const fecha = '2099-12-22';
const crearReserva = (inicio: string, fin: string) => request(entorno.app).post('/api/reservas').auth(coord, { type: 'bearer' })
  .send({ fecha, hora_inicio: inicio, hora_fin: fin, espacio_id: espacioId, titulo: 'D2 actividad', descripcion: 'Reunión de prueba' });
const eliminar = (body = {}) => request(entorno.app).delete(`/api/espacios/${espacioId}`).auth(admin, { type: 'bearer' }).send(body);
const archivoFoto = (url: string) => path.resolve(__dirname, '../../media/espacios/subidas', path.basename(url));

beforeAll(async () => {
  process.env.CLERK_SECRET_KEY = '';
  entorno = await iniciarParroquiaPrueba();
  const login = async (correo: string, password = 'password123') => (await request(entorno.app).post('/api/auth/login').send({ correo, password }).expect(200)).body.token as string;
  admin = await login('diego@parroquia.com', 'admin123');
  sacerdote = await login('sacerdote@parroquia.com');
  coord = await login('coord.min@parroquia.com');
});
beforeEach(async () => {
  espacioId = (await request(entorno.app).post('/api/espacios').auth(admin, { type: 'bearer' })
    .send({ nombre: 'D2 salón', capacidad: 60 }).expect(201)).body.espacioId;
});
afterAll(async () => {
  for (const url of fotos) await fs.unlink(archivoFoto(url)).catch(() => {});
  await entorno?.cerrar();
});

describe('D2 con MariaDB real', () => {
  it('procesa, sirve, reemplaza y quita fotos; mantiene fotos preexistentes', async () => {
    const buffer = await sharp({ create: { width: 2000, height: 1400, channels: 3, background: 'gold' } }).withMetadata().png().toBuffer();
    const nuevo = await request(entorno.app).post('/api/espacios').auth(sacerdote, { type: 'bearer' })
      .field('nombre', 'D2 con foto').field('capacidad', '30').attach('imagen', buffer, 'salon.png').expect(201);
    const urlEspacio = `/api/espacios/${nuevo.body.espacioId}`;
    const datos = async () => (await request(entorno.app).get(urlEspacio).auth(admin, { type: 'bearer' }).expect(200)).body;
    const foto1 = (await datos()).foto_url as string; fotos.add(foto1);
    const servido = await request(entorno.app).get(foto1).expect(200).expect('Content-Type', /image\/webp/);
    expect(servido.headers['cache-control']).toContain('immutable');
    const metadata = await sharp(await fs.readFile(archivoFoto(foto1))).metadata();
    expect(metadata.width).toBeLessThanOrEqual(1600); expect(metadata.height).toBeLessThanOrEqual(1200); expect(metadata.exif).toBeUndefined();
    await request(entorno.app).put(urlEspacio).auth(admin, { type: 'bearer' }).send({ nombre: 'D2 editado', capacidad: 40 }).expect(200);
    expect((await datos()).foto_url).toBe(foto1);
    await request(entorno.app).put(urlEspacio).auth(admin, { type: 'bearer' }).field('nombre', 'D2 reemplazado').field('capacidad', '40').attach('imagen', buffer, 'otra.png').expect(200);
    const foto2 = (await datos()).foto_url as string; fotos.add(foto2);
    expect(foto2).not.toBe(foto1); await request(entorno.app).get(foto1).expect(404);
    await request(entorno.app).put(urlEspacio).auth(admin, { type: 'bearer' }).send({ nombre: 'D2 sin foto', capacidad: 40, quitar_imagen: true }).expect(200);
    expect((await datos()).foto_url).toBeNull(); await request(entorno.app).get(foto2).expect(404);
    await request(entorno.app).get('/uploads/espacios/salon-01-v1.webp').expect(200);
    await request(entorno.app).get('/uploads/espacios/subidas/foto.jpg').expect(404);
  });

  it('impide cancelar reservas no revisadas, conserva historial y registra decisiones y avisos', async () => {
    const primera = (await crearReserva('10:00', '11:00').expect(201)).body.reservaId;
    await request(entorno.app).put(`/api/reservas/${primera}/estado`).auth(admin, { type: 'bearer' }).send({ estado_id: 2 }).expect(200);
    const impacto = await request(entorno.app).get(`/api/espacios/${espacioId}/impacto-eliminacion`).auth(admin, { type: 'bearer' }).expect(200);
    expect(impacto.body.reservas.map((r: { id: number }) => r.id)).toEqual([primera]);
    const segunda = (await crearReserva('12:00', '13:00').expect(201)).body.reservaId;
    await eliminar().expect(409);
    await eliminar({ cancelar_reservas: true, reserva_ids: [primera] }).expect(409);
    const [evento] = await entorno.pool.query<RowDataPacket[]>('SELECT id FROM evento WHERE reserva_id = ?', [primera]);
    await entorno.pool.query('INSERT INTO tarea (titulo, descripcion, fecha, hora_inicio, hora_fin, evento_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['D2 tarea', 'Conservar', fecha, '10:00', '11:00', evento[0].id]);
    // Una reserva ya terminada no debe cancelarse ni impedir el borrado.
    const [historica] = await entorno.pool.query<any>('INSERT INTO reserva (fecha, hora_inicio, hora_fin, espacio_id, estado_reserva_id, solicitante_id) VALUES (?, ?, ?, ?, ?, ?)', ['2020-01-01', '10:00', '11:00', espacioId, 2, 7]);
    await eliminar({ cancelar_reservas: true, reserva_ids: [primera, segunda] }).expect(200);
    const [reservas] = await entorno.pool.query<RowDataPacket[]>('SELECT id, estado_reserva_id, espacio_id FROM reserva WHERE id IN (?, ?, ?) ORDER BY id', [primera, segunda, historica.insertId]);
    expect(reservas).toEqual([
      { id: primera, estado_reserva_id: 4, espacio_id: null }, { id: segunda, estado_reserva_id: 4, espacio_id: null },
      { id: historica.insertId, estado_reserva_id: 2, espacio_id: null },
    ]);
    await request(entorno.app).put(`/api/reservas/${primera}/estado`).auth(admin, { type: 'bearer' }).send({ estado_id: 2 }).expect(400);
    const [auditoria] = await entorno.pool.query<RowDataPacket[]>("SELECT reserva_id, actor_id FROM reserva_decision WHERE reserva_id IN (?, ?) AND resultado = 'cancelada' ORDER BY reserva_id", [primera, segunda]);
    expect(auditoria).toEqual([{ reserva_id: primera, actor_id: 1 }, { reserva_id: segunda, actor_id: 1 }]);
    const [avisos] = await entorno.pool.query<RowDataPacket[]>("SELECT pn.persona_id FROM persona_notificacion pn JOIN notificacion n ON n.id = pn.notificacion_id WHERE n.mensaje LIKE '%se eliminó el espacio «D2 salón»%'");
    expect(avisos).toEqual([{ persona_id: 7 }, { persona_id: 7 }]);
    const [tareas] = await entorno.pool.query<RowDataPacket[]>('SELECT evento_id FROM tarea WHERE titulo = ?', ['D2 tarea']);
    expect(tareas[0].evento_id).toBe(evento[0].id);
    const calendario = await request(entorno.app).get('/api/calendario').auth(admin, { type: 'bearer' }).query({ fecha_inicio: fecha, fecha_fin: fecha, vista: 'coordinacion' }).expect(200);
    expect(calendario.body.eventos.some((e: { id: number }) => e.id === evento[0].id)).toBe(false);
    expect(calendario.body.tareas.some((t: { titulo: string }) => t.titulo === 'D2 tarea')).toBe(false);
  });

  it('mantiene permisos en servidor y elimina sin reservas desde Sacerdote', async () => {
    await request(entorno.app).post('/api/espacios').auth(coord, { type: 'bearer' }).send({ nombre: 'No autorizado' }).expect(403);
    await request(entorno.app).get(`/api/espacios/${espacioId}/impacto-eliminacion`).auth(coord, { type: 'bearer' }).expect(403);
    await request(entorno.app).put(`/api/espacios/${espacioId}`).auth(coord, { type: 'bearer' }).send({ nombre: 'No autorizado' }).expect(403);
    await request(entorno.app).delete(`/api/espacios/${espacioId}`).auth(coord, { type: 'bearer' }).expect(403);
    await request(entorno.app).delete(`/api/espacios/${espacioId}`).auth(sacerdote, { type: 'bearer' }).expect(200);
    await request(entorno.app).get(`/api/espacios/${espacioId}`).auth(admin, { type: 'bearer' }).expect(404);
  });
});
