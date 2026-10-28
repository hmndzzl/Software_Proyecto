import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { MariaDbContainer, type StartedMariaDbContainer } from '@testcontainers/mariadb';

describe('avisos de nuevas reservas', () => {
  let container: StartedMariaDbContainer;
  let pool: Pool;
  let app: Awaited<typeof import('../../src/app')>['app'];

  beforeAll(async () => {
    container = await new MariaDbContainer('mariadb:11')
      .withDatabase('parroquia_test')
      .withUsername('parroquia')
      .withUserPassword('parroquia_test')
      .withRootPassword('root_test')
      .start();

    process.env.NODE_ENV = 'test';
    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = String(container.getPort());
    process.env.DB_USER = container.getUsername();
    process.env.DB_PASSWORD = container.getUserPassword();
    process.env.DB_NAME = container.getDatabase();

    const connection = await mysql.createConnection({
      host: container.getHost(),
      port: container.getPort(),
      user: container.getUsername(),
      password: container.getUserPassword(),
      database: container.getDatabase(),
      multipleStatements: true,
    });
    const initDir = path.resolve(__dirname, '../../../database/init');
    await connection.query(fs.readFileSync(path.join(initDir, '01_schema.sql'), 'utf8'));
    await connection.query(fs.readFileSync(path.join(initDir, '02_seeds.sql'), 'utf8'));
    await connection.query(fs.readFileSync(path.join(initDir, '03_landing.sql'), 'utf8'));
    await connection.end();

    vi.resetModules();
    ({ app } = await import('../../src/app'));
    ({ default: pool } = await import('../../src/config/db'));
  });

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  let admin: string;
  let sacerdote: string;
  let coordinador: string;
  const body = { fecha: '2099-11-20', hora_inicio: '14:00', hora_fin: '15:00', espacio_id: 2, titulo: 'Reserva con aviso', descripcion: 'Prueba aislada' };
  async function login(correo: string, password = 'password123') {
    return (await request(app).post('/api/auth/login').send({ correo, password }).expect(200)).body.token;
  }
  beforeEach(async () => {
    await pool.query("UPDATE persona SET estado_cuenta='activa' WHERE id <= 6");
    admin ||= await login('diego@parroquia.com', 'admin123');
    sacerdote ||= await login('sacerdote@parroquia.com');
    coordinador ||= await login('coord.min@parroquia.com');
  });
  async function crear(token: string) {
    return request(app).post('/api/reservas').auth(token, { type: 'bearer' }).send(body).expect(201);
  }
  async function notificacion(reservaId: number) {
    const [rows]: any = await pool.query('SELECT * FROM notificacion WHERE mensaje LIKE ?', [`Nueva solicitud de reserva #${reservaId}:%`]);
    expect(rows).toHaveLength(1);
    const [destinos]: any = await pool.query('SELECT persona_id, leida FROM persona_notificacion WHERE notificacion_id=? ORDER BY persona_id', [rows[0].id]);
    expect(destinos.every((p: any) => p.leida === 0)).toBe(true);
    return { aviso: rows[0], destinos: destinos.map((p: any) => p.persona_id) };
  }
  it('envía un aviso inmediato a todos los aprobadores activos y lo expone en sus bandejas', async () => {
    await pool.query("UPDATE persona SET estado_cuenta='rechazada' WHERE id=2");
    const res = await crear(coordinador);
    const { aviso, destinos } = await notificacion(res.body.reservaId);
    expect(destinos).toEqual([1,3,4,5,6]);
    expect(aviso.remitente_id).toBe(7);
    expect(aviso.mensaje).toContain('Reserva con aviso');
    for (const token of [admin, sacerdote]) {
      const lista = await request(app).get('/api/notificaciones').auth(token, { type: 'bearer' }).expect(200);
      expect(lista.body.find((n: any) => n.id === aviso.id)).toMatchObject({ leida: 0, remitente_id: 7 });
    }
    const ajenas = await request(app).get('/api/notificaciones').auth(coordinador, { type: 'bearer' }).expect(200);
    expect(ajenas.body.some((n: any) => n.id === aviso.id)).toBe(false);
    await request(app).get('/api/notificaciones').expect(401);
  });
  it('incluye al aprobador que crea su propia solicitud pendiente sin duplicarlo', async () => {
    for (const token of [admin, sacerdote]) {
      const res = await crear(token);
      expect((await notificacion(res.body.reservaId)).destinos).toEqual([1,2,3,4,5,6]);
    }
  });
  it('revierte reserva, evento y aviso si falla la entrega a un aprobador', async () => {
    const counts = async () => {
      const [rows]: any = await pool.query('SELECT (SELECT COUNT(*) FROM reserva) r, (SELECT COUNT(*) FROM evento) e, (SELECT COUNT(*) FROM notificacion) n, (SELECT COUNT(*) FROM persona_notificacion) p');
      return rows[0];
    };
    const antes = await counts();
    await pool.query("CREATE TRIGGER fallo_aviso BEFORE INSERT ON persona_notificacion FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fallo simulado'");
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await request(app).post('/api/reservas').auth(coordinador, { type: 'bearer' }).send(body).expect(500);
      expect(await counts()).toEqual(antes);
    } finally { await pool.query('DROP TRIGGER fallo_aviso'); silencio.mockRestore(); }
  });
  it('no crea avisos para solicitudes inválidas o usuarios sin permiso', async () => {
    const [antes]: any = await pool.query('SELECT COUNT(*) n FROM notificacion');
    await request(app).post('/api/reservas').send(body).expect(401);
    const ministro = await login('ministro@parroquia.com');
    await request(app).post('/api/reservas').auth(ministro, { type: 'bearer' }).send(body).expect(403);
    await request(app).post('/api/reservas').auth(coordinador, { type: 'bearer' }).send({ ...body, titulo: '' }).expect(400);
    await pool.query('INSERT INTO reserva (fecha,hora_inicio,hora_fin,espacio_id,estado_reserva_id,solicitante_id) VALUES (?, ?, ?, ?, 2, 7)',
      [body.fecha, body.hora_inicio, body.hora_fin, body.espacio_id]);
    await request(app).post('/api/reservas').auth(coordinador, { type: 'bearer' }).send(body).expect(409);
    const [despues]: any = await pool.query('SELECT COUNT(*) n FROM notificacion');
    expect(despues).toEqual(antes);
  });
  it('confirma solo una de varias solicitudes simultáneas del mismo salón y horario', async () => {
    const solicitud = { ...body, fecha: '2099-12-01', titulo: 'Aprobación concurrente' };
    const creadas = await Promise.all(Array.from({ length: 12 }, () =>
      request(app).post('/api/reservas').auth(coordinador, { type: 'bearer' }).send(solicitud).expect(201)));
    const ids = creadas.map(res => res.body.reservaId as number);

    const respuestas = await Promise.all(ids.map(id =>
      request(app).put(`/api/reservas/${id}/estado`).auth(admin, { type: 'bearer' }).send({ estado_id: 2 })));
    expect(respuestas.filter(res => res.status === 200)).toHaveLength(1);
    expect(respuestas.filter(res => res.status === 400)).toHaveLength(ids.length - 1);

    const [confirmadas] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM reserva WHERE id IN (?) AND estado_reserva_id = 2', [ids]);
    expect(confirmadas).toHaveLength(1);
  });
});
