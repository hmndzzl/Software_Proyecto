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

  it('publica solo eventos explícitamente públicos, confirmados y no terminados', async () => {
    const login = await request(app).post('/api/auth/login')
      .send({ correo: 'diego@parroquia.com', password: 'admin123' }).expect(200);
    const token = login.body.token;
    const ids: number[] = [];
    for (const [titulo, estado, publico, fecha] of [
      ['Público futuro', 2, 1, '2099-12-01'],
      ['Privado futuro', 2, 0, '2099-12-01'],
      ['Público pendiente', 1, 1, '2099-12-01'],
      ['Público rechazado', 3, 1, '2099-12-01'],
      ['Público cancelado', 4, 1, '2099-12-01'],
      ['Público terminado', 2, 1, '2000-01-01'],
    ] as const) {
      const [reserva] = await pool.execute<mysql.ResultSetHeader>(
        'INSERT INTO reserva (fecha, hora_inicio, hora_fin, espacio_id, estado_reserva_id, solicitante_id) VALUES (?, ?, ?, ?, ?, ?)',
        [fecha, '09:00:00', '11:00:00', 2, estado, 1],
      );
      const [evento] = await pool.execute<mysql.ResultSetHeader>(
        'INSERT INTO evento (titulo, descripcion, encargado_id, reserva_id) VALUES (?, ?, ?, ?)',
        [titulo, 'Información del evento', 1, reserva.insertId],
      );
      ids.push(evento.insertId);
      const [privadoPorDefecto] = await pool.query<RowDataPacket[]>('SELECT publico FROM evento WHERE id = ?', [evento.insertId]);
      expect(privadoPorDefecto[0].publico).toBe(0);
      if (publico) {
        await request(app).patch(`/api/eventos/${evento.insertId}/publico`)
          .auth(token, { type: 'bearer' }).send({ publico: true }).expect(200);
      }
    }

    const agenda = await request(app).get('/api/public/agenda').expect(200);
    expect(agenda.body).toHaveLength(1);
    expect(agenda.body[0]).toEqual({
      id: ids[0], titulo: 'Público futuro', descripcion: 'Información del evento',
      fecha: '2099-12-01', hora_inicio: '09:00:00', hora_fin: '11:00:00', nombre_espacio: expect.any(String),
    });

    // En curso: la fecha y el horario se calculan en Guatemala, incluso si cruzan medianoche.
    const [enCursoReserva] = await pool.execute<mysql.ResultSetHeader>(
      `INSERT INTO reserva (fecha, hora_inicio, hora_fin, espacio_id, estado_reserva_id, solicitante_id)
       VALUES (DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00')), '00:00:00', '23:59:59', NULL, 2, 1)`
    );
    const [enCurso] = await pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO evento (titulo, descripcion, encargado_id, reserva_id, publico) VALUES (?, ?, ?, ?, 1)',
      ['Evento de hoy', 'Abierto durante el día', 1, enCursoReserva.insertId]
    );
    const primeraPagina = await request(app).get('/api/public/agenda?limite=1').expect(200);
    expect(primeraPagina.body[0]).toMatchObject({ id: enCurso.insertId, nombre_espacio: null });
    const segundaPagina = await request(app).get('/api/public/agenda?limite=1&pagina=2').expect(200);
    expect(segundaPagina.body[0].id).toBe(ids[0]);

    // Quitar la publicación retira el evento inmediatamente sin eliminarlo.
    await request(app).patch(`/api/eventos/${ids[0]}/publico`)
      .auth(token, { type: 'bearer' }).send({ publico: false }).expect(200);
    const retirada = await request(app).get('/api/public/agenda').expect(200);
    expect(retirada.body.map((evento: { id: number }) => evento.id)).toEqual([enCurso.insertId]);
  });

  it('la migración de agenda mantiene privados los eventos existentes y puede repetirse', async () => {
    const connection = await pool.getConnection();
    try {
      await connection.query('CREATE TEMPORARY TABLE evento_migracion (id INT PRIMARY KEY)');
      await connection.query('INSERT INTO evento_migracion (id) VALUES (1)');
      const migration = fs.readFileSync(path.resolve(__dirname, '../../../database/migrations/20261009_evento_publico.sql'), 'utf8')
        .replace('ALTER TABLE evento', 'ALTER TABLE evento_migracion');
      await connection.query(migration);
      await connection.query(migration);
      const [rows] = await connection.query<RowDataPacket[]>('SELECT id, publico FROM evento_migracion');
      expect(rows).toEqual([{ id: 1, publico: 0 }]);
    } finally {
      await connection.query('DROP TEMPORARY TABLE IF EXISTS evento_migracion');
      connection.release();
    }
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
