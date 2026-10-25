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
    // Estas pruebas usan la BD desechable y nunca crean usuarios en Clerk real.
    process.env.CLERK_SECRET_KEY = '';
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

  it('la migración de tareas y eventos es repetible y conserva tareas y asignaciones', async () => {
    const conn = await pool.getConnection();
    try {
      const [antes] = await conn.query<RowDataPacket[]>('SELECT id, titulo FROM tarea ORDER BY id');
      const [asignaciones] = await conn.query<RowDataPacket[]>('SELECT * FROM asignacion_tarea ORDER BY tarea_id, persona_id');
      const sql = fs.readFileSync(path.resolve(__dirname, '../../../database/migrations/20261024_tarea_evento.sql'), 'utf8');
      for (let intento = 0; intento < 2; intento++) {
        for (const statement of sql.split(';').filter(s => s.trim())) await conn.query(statement);
      }
      const [despues] = await conn.query<RowDataPacket[]>('SELECT id, titulo FROM tarea ORDER BY id');
      const [asignacionesDespues] = await conn.query<RowDataPacket[]>('SELECT * FROM asignacion_tarea ORDER BY tarea_id, persona_id');
      expect(despues).toEqual(antes);
      expect(asignacionesDespues).toEqual(asignaciones);
    } finally { conn.release(); }
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

  it('persiste cambios de landing y conserva los campos no enviados', async () => {
    const inicial = await request(app).get('/api/public/landing').expect(200);
    expect(inicial.body).toMatchObject({ nombre_parroquia: 'Parroquia San Pedro Nolasco', cantidad_grupos: 12, cantidad_espacios: 7 });
    expect(inicial.body.contacto.direccion).toContain('\nCiudad de Guatemala');
    const login = await request(app).post('/api/auth/login')
      .send({ correo: 'diego@parroquia.com', password: 'admin123' }).expect(200);
    const [cantidadesAntes] = await pool.query<RowDataPacket[]>('SELECT (SELECT COUNT(*) FROM grupo) AS grupos, (SELECT COUNT(*) FROM espacio) AS espacios');
    const cambios = {
      quienes_somos: { descripcion: 'Nueva descripción pública' }, cantidad_grupos: 18, cantidad_espacios: 9,
      contacto: { telefono: '+502 5555 1234' },
      lema: 'Comunidad de fe', titulo_principal: 'Bienvenidos', descripcion_principal: 'Presentación actualizada',
      valores_encabezado: { descripcion: 'Principios de nuestra comunidad' },
      valores: [{ titulo: 'Servicio', descripcion: 'Servimos a nuestra comunidad' }],
      horarios_misa: [{ dias: 'Domingo', horas: ['08:00', '11:00'] }],
      horarios_oficina: [{ dias: 'Lunes a viernes', horario: '09:00 – 13:00' }],
    };
    const actualizado = await request(app).patch('/api/landing').auth(login.body.token, { type: 'bearer' }).send(cambios).expect(200);
    expect(actualizado.body).toEqual(cambios);
    const publico = await request(app).get('/api/public/landing').expect(200);
    expect(publico.body.quienes_somos.mision).toBe(inicial.body.quienes_somos.mision);
    expect(publico.body.contacto.correo).toBe(inicial.body.contacto.correo);
    expect(publico.body.valores_encabezado.titulo).toBe(inicial.body.valores_encabezado.titulo);
    expect(publico.body).toMatchObject(cambios);
    for (const campo of ['nombre_parroquia', 'texto_pie']) {
      expect(publico.body[campo]).toEqual(inicial.body[campo]);
    }
    const [guardado] = await pool.query<RowDataPacket[]>('SELECT contenido FROM contenido_landing WHERE id = 1');
    const contenidoGuardado = typeof guardado[0].contenido === 'string' ? JSON.parse(guardado[0].contenido) : guardado[0].contenido;
    expect(contenidoGuardado).toEqual(publico.body);
    const [cantidadesDespues] = await pool.query<RowDataPacket[]>('SELECT (SELECT COUNT(*) FROM grupo) AS grupos, (SELECT COUNT(*) FROM espacio) AS espacios');
    expect(cantidadesDespues).toEqual(cantidadesAntes);

    await request(app).patch('/api/landing').auth(login.body.token, { type: 'bearer' }).send({ cantidad_grupos: -1 }).expect(400);
    const sinCambios = await request(app).get('/api/public/landing').expect(200);
    expect(sinCambios.body).toEqual(publico.body);
  });

  it('conserva ambas ediciones concurrentes y la migración no sobrescribe contenido editado', async () => {
    const login = await request(app).post('/api/auth/login')
      .send({ correo: 'diego@parroquia.com', password: 'admin123' }).expect(200);
    await Promise.all([
      request(app).patch('/api/landing').auth(login.body.token, { type: 'bearer' }).send({ quienes_somos: { mision: 'Misión actualizada' } }).expect(200),
      request(app).patch('/api/landing').auth(login.body.token, { type: 'bearer' }).send({ quienes_somos: { comunidad: 'Comunidad actualizada' }, cantidad_espacios: 0 }).expect(200),
    ]);
    const anterior = await request(app).get('/api/public/landing').expect(200);
    expect(anterior.body).toMatchObject({ quienes_somos: { mision: 'Misión actualizada', comunidad: 'Comunidad actualizada' }, cantidad_espacios: 0 });
    const migration = fs.readFileSync(path.resolve(__dirname, '../../../database/migrations/20261011_contenido_landing.sql'), 'utf8');
    const connection = await mysql.createConnection({
      host: container.getHost(), port: container.getPort(), user: container.getUsername(),
      password: container.getUserPassword(), database: container.getDatabase(), multipleStatements: true,
    });
    try {
      await connection.query(migration);
      await connection.query(migration);
    } finally { await connection.end(); }
    const despues = await request(app).get('/api/public/landing').expect(200);
    expect(despues.body).toEqual(anterior.body);
  });

  it('crea y asigna a varios ministros, evita resultados parciales y conserva tareas sin asignados', async () => {
    const login = await request(app).post('/api/auth/login')
      .send({ correo: 'diego@parroquia.com', password: 'admin123' }).expect(200);
    const token = login.body.token;
    const datos = { titulo: 'Tarea múltiple de integración', descripcion: 'Preparar celebración', fecha: '2099-11-20', hora_inicio: '10:00', hora_fin: '11:00', persona_ids: [9, 10, 9] };
    const creada = await request(app).post('/api/tareas').auth(token, { type: 'bearer' }).send(datos).expect(201);
    const id = creada.body.tarea.id;
    const [asignaciones] = await pool.query<RowDataPacket[]>('SELECT persona_id FROM asignacion_tarea WHERE tarea_id = ? ORDER BY persona_id', [id]);
    expect(asignaciones.map(a => a.persona_id)).toEqual([9, 10]);
    const [avisos] = await pool.query<RowDataPacket[]>(
      'SELECT pn.persona_id, pn.leida FROM persona_notificacion pn JOIN notificacion n ON n.id = pn.notificacion_id WHERE n.mensaje = ? ORDER BY pn.persona_id',
      [`Se te asignó la tarea: ${datos.titulo}`],
    );
    expect(avisos).toEqual([{ persona_id: 9, leida: 0 }, { persona_id: 10, leida: 0 }]);

    // Si el segundo ministro tiene conflicto, no se crea ni se asigna nada al primero.
    await request(app).post('/api/tareas').auth(token, { type: 'bearer' })
      .send({ ...datos, titulo: 'No debe persistirse', persona_ids: [11, 10] }).expect(409);
    const [parciales] = await pool.query<RowDataPacket[]>('SELECT id FROM tarea WHERE titulo = ?', ['No debe persistirse']);
    expect(parciales).toHaveLength(0);

    // Agregar a una tarea existente es idempotente y no vuelve a notificar a los asignados.
    for (let intento = 0; intento < 2; intento++) {
      await request(app).post('/api/tareas/asignar').auth(token, { type: 'bearer' })
        .send({ tarea_id: id, persona_ids: [9, 11] }).expect(201);
    }
    const [avisosFinales] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM notificacion WHERE mensaje = ?', [`Se te asignó la tarea: ${datos.titulo}`],
    );
    expect(avisosFinales).toHaveLength(3);
    for (const persona_id of [9, 10, 11]) {
      await request(app).delete('/api/tareas/asignar').auth(token, { type: 'bearer' }).send({ tarea_id: id, persona_id }).expect(204);
    }
    const sinAsignados = await request(app).get(`/api/tareas/${id}`).auth(token, { type: 'bearer' }).expect(200);
    expect(sinAsignados.body.asignados).toEqual([]);
    await request(app).post('/api/tareas/asignar').auth(token, { type: 'bearer' }).send({ tarea_id: id, persona_ids: [9, 10] }).expect(201);
    await request(app).delete(`/api/tareas/${id}`).auth(token, { type: 'bearer' }).expect(204);
    const [restantes] = await pool.query<RowDataPacket[]>('SELECT * FROM asignacion_tarea WHERE tarea_id = ?', [id]);
    expect(restantes).toHaveLength(0);
    await request(app).get(`/api/tareas/${id}`).auth(token, { type: 'bearer' }).expect(404);
  });

  it('guarda el teléfono de una cuenta, lo edita y lo muestra en el directorio sin duplicar personas', async () => {
    const login = await request(app).post('/api/auth/login').send({ correo: 'diego@parroquia.com', password: 'admin123' }).expect(200);
    const token = login.body.token;
    const cuenta = { nombre: 'Ministro Teléfono', correo: 'telefono@example.com', password: 'Clave-Segura-123', rol_id: 4, telefono: '55559876' };
    await request(app).post('/api/auth/register').auth(token, { type: 'bearer' }).send(cuenta).expect(201);
    const [personas] = await pool.query<RowDataPacket[]>('SELECT id FROM persona WHERE correo = ?', [cuenta.correo]);
    const id = personas[0].id;
    // Crear una cuenta sigue el flujo de aprobación existente.
    await pool.query("UPDATE persona SET estado_cuenta = 'activa' WHERE id = ?", [id]);
    const perfil = () => request(app).get(`/api/personas/${id}`).auth(token, { type: 'bearer' }).expect(200);
    expect((await perfil()).body.telefono).toBe('+50255559876');
    await request(app).put(`/api/personas/${id}`).auth(token, { type: 'bearer' }).send({ telefono: '+502 5555-9877' }).expect(200);
    const directorio = await request(app).get('/api/personas').auth(token, { type: 'bearer' }).expect(200);
    expect(directorio.body.filter((p: { id: number }) => p.id === id)).toEqual([expect.objectContaining({ telefono: '+50255559877' })]);
    await request(app).put(`/api/personas/${id}`).auth(token, { type: 'bearer' }).send({ nombre: 'Nombre actualizado' }).expect(200);
    expect((await perfil()).body.telefono).toBe('+50255559877');
    await request(app).put(`/api/personas/${id}`).auth(token, { type: 'bearer' }).send({ telefono: '' }).expect(200);
    expect((await perfil()).body.telefono).toBeNull();
    await request(app).put(`/api/personas/${id}`).auth(token, { type: 'bearer' }).send({ telefono: 'abc' }).expect(400);
  });

  it('un teléfono duplicado revierte la creación completa y no altera el perfil', async () => {
    const login = await request(app).post('/api/auth/login').send({ correo: 'diego@parroquia.com', password: 'admin123' }).expect(200);
    const token = login.body.token;
    await request(app).put('/api/personas/1').auth(token, { type: 'bearer' }).send({ telefono: '55559878' }).expect(200);
    await request(app).post('/api/auth/register').auth(token, { type: 'bearer' }).send({
      nombre: 'No debe persistirse', correo: 'telefono-duplicado@example.com', password: 'Clave-Segura-123', rol_id: 4, telefono: '+50255559878',
    }).expect(409);
    const [personas] = await pool.query<RowDataPacket[]>('SELECT id FROM persona WHERE correo = ?', ['telefono-duplicado@example.com']);
    expect(personas).toHaveLength(0);
    await request(app).put('/api/personas/9').auth(token, { type: 'bearer' }).send({ nombre: 'No guardar', telefono: '55559878' }).expect(409);
    const [ministro] = await pool.query<RowDataPacket[]>('SELECT nombre FROM persona WHERE id = 9');
    expect(ministro[0].nombre).not.toBe('No guardar');
  });

  it('valida y persiste el aforo al crear, editar y aprobar, sin escrituras parciales', async () => {
    const login = await request(app).post('/api/auth/login').send({ correo: 'diego@parroquia.com', password: 'admin123' }).expect(200);
    const token = login.body.token;
    const [espacios] = await pool.query<RowDataPacket[]>('SELECT capacidad FROM espacio WHERE id = 2');
    const capacidad = Number(espacios[0].capacidad);
    const datos = { fecha: '2099-11-28', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 2, titulo: 'Prueba aforo', descripcion: 'Con aforo', cantidad_personas: capacidad };
    for (const cantidad_personas of [0, -1, 1.5, '10', null, capacidad + 1]) {
      await request(app).post('/api/reservas').auth(token, { type: 'bearer' }).send({ ...datos, cantidad_personas }).expect(400);
    }
    const [rechazadas] = await pool.query<RowDataPacket[]>('SELECT id FROM evento WHERE titulo = ?', [datos.titulo]);
    expect(rechazadas).toHaveLength(0);
    const creada = await request(app).post('/api/reservas').auth(token, { type: 'bearer' }).send(datos).expect(201);
    const id = creada.body.reservaId;
    const consultar = async () => {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT cantidad_personas, estado_reserva_id FROM reserva WHERE id = ?', [id]);
      return rows[0];
    };
    expect((await consultar()).cantidad_personas).toBe(capacidad);
    await request(app).put(`/api/reservas/${id}`).auth(token, { type: 'bearer' }).send({ ...datos, cantidad_personas: capacidad + 1 }).expect(400);
    expect((await consultar()).cantidad_personas).toBe(capacidad);
    const { cantidad_personas: _cantidad, ...sinCantidad } = datos;
    await request(app).put(`/api/reservas/${id}`).auth(token, { type: 'bearer' }).send(sinCantidad).expect(200);
    expect((await consultar()).cantidad_personas).toBe(capacidad);
    await pool.query('UPDATE espacio SET capacidad = ? WHERE id = 2', [capacidad - 1]);
    try {
      await request(app).put(`/api/reservas/${id}/estado`).auth(token, { type: 'bearer' }).send({ estado_id: 2 }).expect(400);
      expect((await consultar()).estado_reserva_id).toBe(1);
    } finally { await pool.query('UPDATE espacio SET capacidad = ? WHERE id = 2', [capacidad]); }
    await request(app).put(`/api/reservas/${id}/estado`).auth(token, { type: 'bearer' }).send({ estado_id: 2 }).expect(200);
    const lista = await request(app).get('/api/reservas/mis-reservas').auth(token, { type: 'bearer' }).expect(200);
    expect(lista.body).toEqual(expect.arrayContaining([expect.objectContaining({ id, cantidad_personas: capacidad })]));
  });

  it('la migración de aforo conserva reservas históricas y puede repetirse', async () => {
    const connection = await pool.getConnection();
    try {
      await connection.query('CREATE TEMPORARY TABLE reserva_migracion (id INT PRIMARY KEY)');
      await connection.query('INSERT INTO reserva_migracion (id) VALUES (1)');
      const migration = fs.readFileSync(path.resolve(__dirname, '../../../database/migrations/20261024_reserva_cantidad_personas.sql'), 'utf8')
        .replace('ALTER TABLE reserva', 'ALTER TABLE reserva_migracion');
      await connection.query(migration);
      await connection.query(migration);
      const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM reserva_migracion');
      expect(rows).toEqual([{ id: 1, cantidad_personas: null }]);
    } finally {
      await connection.query('DROP TEMPORARY TABLE IF EXISTS reserva_migracion');
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
