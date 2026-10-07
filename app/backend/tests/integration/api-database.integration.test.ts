import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { MariaDbContainer, type StartedMariaDbContainer } from '@testcontainers/mariadb';

describe('integración API y MariaDB', () => {
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
    await connection.end();

    vi.resetModules();
    ({ app } = await import('../../src/app'));
    ({ default: pool } = await import('../../src/config/db'));
  });

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  it('autentica con credenciales persistidas y devuelve un JWT utilizable', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'diego@parroquia.com', password: 'admin123' })
      .expect(200);

    expect(login.body).toMatchObject({
      usuario: { nombre: 'Diego Calderon', correo: 'diego@parroquia.com', rol_id: 5 },
    });
    expect(login.body.token).toEqual(expect.any(String));

    const perfil = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200);
    expect(perfil.body.usuario.correo).toBe('diego@parroquia.com');
  });

  it('crea una reserva y su evento dentro de la misma transacción', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'diego@parroquia.com', password: 'admin123' })
      .expect(200);

    const response = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({
        fecha: '2099-10-20',
        hora_inicio: '14:00',
        hora_fin: '15:00',
        espacio_id: 2,
        titulo: 'Reunión de integración',
        descripcion: 'Reserva creada por Supertest',
      })
      .expect(201);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.fecha, r.estado_reserva_id, r.solicitante_id, e.titulo, e.descripcion
       FROM reserva r JOIN evento e ON e.reserva_id = r.id WHERE r.id = ?`,
      [response.body.reservaId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      fecha: '2099-10-20',
      estado_reserva_id: 1,
      solicitante_id: 1,
      titulo: 'Reunión de integración',
      descripcion: 'Reserva creada por Supertest',
    });
  });

  it('persiste un contacto y notifica a cada sacerdote y administrador', async () => {
    const response = await request(app)
      .post('/api/contacto')
      .send({
        nombre: 'Visitante Integración',
        correo: 'visitante@example.com',
        telefono: '+50255551234',
        motivo: 'Información general',
        mensaje: 'Deseo conocer los horarios.',
      })
      .expect(201);

    const [contactos] = await pool.query<RowDataPacket[]>(
      'SELECT correo, telefono, notificacion_id FROM mensaje_contacto WHERE id = ?',
      [response.body.contacto.id],
    );
    const [destinatarios] = await pool.query<RowDataPacket[]>(
      `SELECT pn.persona_id
       FROM persona_notificacion pn
       JOIN persona p ON p.id = pn.persona_id
       WHERE pn.notificacion_id = ? AND p.rol_id IN (1, 5)`,
      [response.body.contacto.notificacion_id],
    );

    expect(contactos[0]).toMatchObject({
      correo: 'visitante@example.com',
      telefono: '+50255551234',
    });
    expect(destinatarios).toHaveLength(6);
  });
});
