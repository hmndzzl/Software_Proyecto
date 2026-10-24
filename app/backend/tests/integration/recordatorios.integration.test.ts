import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { MariaDbContainer, type StartedMariaDbContainer } from '@testcontainers/mariadb';

describe('recordatorios anticipados con MariaDB real', () => {
  let container: StartedMariaDbContainer;
  let pool: Pool;
  let enviar: typeof import('../../src/services/recordatorios.service')['enviarRecordatorios'];
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
    await connection.query(fs.readFileSync(path.join(initDir, '04_recordatorio_servicio.sql'), 'utf8'));
    await connection.end();

    vi.resetModules();
    ({ enviarRecordatorios: enviar } = await import('../../src/services/recordatorios.service'));
    ({ app } = await import('../../src/app'));
    ({ default: pool } = await import('../../src/config/db'));
  });

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  const ahora = new Date('2026-10-23T18:00:00Z'); // 12:00 Guatemala
  async function tarea(fecha: string, hora: string, personas = [9]) {
    const [r]: any = await pool.query('INSERT INTO tarea (fecha,hora_inicio,hora_fin,titulo,descripcion) VALUES (?, ?, ?, ?, ?)',
      [fecha, hora, '23:59:00', 'Servicio de prueba', 'Detalle']);
    for (const persona of personas) await pool.query('INSERT INTO asignacion_tarea VALUES (?,?)', [r.insertId, persona]);
    return r.insertId as number;
  }
  beforeEach(async () => {
    await pool.query('DELETE FROM recordatorio_servicio');
    await pool.query('DELETE FROM persona_notificacion');
    await pool.query('DELETE FROM notificacion');
    await pool.query('DELETE FROM asignacion_tarea');
    await pool.query('DELETE FROM tarea');
    await pool.query("UPDATE persona SET estado_cuenta = 'activa' WHERE id IN (9,10)");
  });

  it('incluye 24 y 48 horas exactas, excluye fuera de rango y roles/cuentas no elegibles', async () => {
    await tarea('2026-10-24', '12:00:00', [9, 10, 7]);
    await tarea('2026-10-25', '12:00:00');
    await tarea('2026-10-24', '11:59:59');
    await tarea('2026-10-25', '12:00:01');
    await tarea('2026-10-22', '12:00:00');
    await tarea('2026-10-24', '13:00:00', []);
    await pool.query("UPDATE persona SET estado_cuenta = 'rechazada' WHERE id=10");
    expect(await enviar(ahora)).toEqual({ enviados: 2, omitidos: 0, errores: 0 });
    const [rows]: any = await pool.query('SELECT * FROM persona_notificacion');
    expect(rows).toHaveLength(2);
    expect(rows.every((r: any) => r.persona_id === 9 && r.leida === 0)).toBe(true);
    const login = await request(app).post('/api/auth/login').send({ correo: 'ministro@parroquia.com', password: 'password123' }).expect(200);
    const notis = await request(app).get('/api/notificaciones').auth(login.body.token, { type: 'bearer' }).expect(200);
    expect(notis.body).toHaveLength(2);
    expect(notis.body[0].mensaje).toContain('12:00');
    expect(notis.body[0].remitente_id).toBeNull();
    expect(notis.body[0].enviado_en).toMatch(/Z$/);
    await request(app).get('/api/notificaciones').expect(401);
    const otro = await request(app).post('/api/auth/login').send({ correo: 'coord.min@parroquia.com', password: 'password123' }).expect(200);
    expect((await request(app).get('/api/notificaciones').auth(otro.body.token, { type: 'bearer' })).body).toEqual([]);
  });

  it('no duplica al ejecutar simultáneamente, reiniciar o eliminar la notificación', async () => {
    await tarea('2026-10-24', '15:00:00', [9,10]);
    const resultados = await Promise.all([enviar(ahora), enviar(ahora)]);
    expect(resultados.reduce((s, r) => s + r.enviados, 0)).toBe(2);
    expect((await enviar(ahora)).enviados).toBe(0);
    await pool.query('DELETE FROM notificacion');
    expect((await enviar(ahora)).enviados).toBe(0);
    const migration = fs.readFileSync(path.resolve(__dirname, '../../../database/migrations/20261023_recordatorio_servicio.sql'), 'utf8');
    await pool.query(migration);
    expect((await enviar(ahora)).enviados).toBe(0);
  });

  it('recuerda al nuevo asignado y un horario nuevo, sin repetir al reasignar el mismo', async () => {
    const id = await tarea('2026-10-24', '15:00:00');
    expect((await enviar(ahora)).enviados).toBe(1);
    await pool.query('DELETE FROM asignacion_tarea WHERE tarea_id=?', [id]);
    await pool.query('INSERT INTO asignacion_tarea VALUES (?,10)', [id]);
    expect((await enviar(ahora)).enviados).toBe(1);
    await pool.query('INSERT INTO asignacion_tarea VALUES (?,9)', [id]);
    expect((await enviar(ahora)).enviados).toBe(0);
    await pool.query("UPDATE tarea SET hora_inicio='16:00:00' WHERE id=?", [id]);
    expect((await enviar(ahora)).enviados).toBe(2);
  });

  it('revierte registro y notificación si falla la entrega; permite reintentar', async () => {
    await tarea('2026-10-24', '15:00:00');
    await pool.query("CREATE TRIGGER fallo_recordatorio BEFORE INSERT ON persona_notificacion FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fallo de prueba'");
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect((await enviar(ahora)).errores).toBe(1);
      const [ledger]: any = await pool.query('SELECT * FROM recordatorio_servicio');
      const [notis]: any = await pool.query('SELECT * FROM notificacion');
      expect(ledger).toHaveLength(0);
      expect(notis).toHaveLength(0);
    } finally { await pool.query('DROP TRIGGER fallo_recordatorio'); silencio.mockRestore(); }
    expect((await enviar(ahora)).enviados).toBe(1);
  });
});
