import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Server } from 'node:http';
import mysql, { type Pool, type ResultSetHeader } from 'mysql2/promise';
import { MariaDbContainer, type StartedMariaDbContainer } from '@testcontainers/mariadb';
import request from 'supertest';

// Usa las dependencias del frontend, sin añadir otro navegador ni mocks de API.
const frontend = path.resolve(__dirname, '../../../frontend');
const frontendRequire = createRequire(path.join(frontend, 'package.json'));
const { chromium } = frontendRequire('@playwright/test');

describe('edición de visibilidad → API → MariaDB → agenda pública', () => {
  let container: StartedMariaDbContainer;
  let pool: Pool;
  let server: Server;
  let vite: { close(): Promise<void>; resolvedUrls: { local: string[] } | null };
  let app: Awaited<typeof import('../../src/app')>['app'];
  let baseUrl: string;

  beforeAll(async () => {
    container = await new MariaDbContainer('mariadb:11')
      .withDatabase('parroquia_test').withUsername('parroquia')
      .withUserPassword('parroquia_test').withRootPassword('root_test').start();
    Object.assign(process.env, {
      NODE_ENV: 'test', DB_HOST: container.getHost(), DB_PORT: String(container.getPort()),
      DB_USER: container.getUsername(), DB_PASSWORD: container.getUserPassword(), DB_NAME: container.getDatabase(),
      CORS_ORIGIN: 'http://localhost:4175', VITE_CLERK_PUBLISHABLE_KEY: '',
    });
    const connection = await mysql.createConnection({
      host: container.getHost(), port: container.getPort(), user: container.getUsername(),
      password: container.getUserPassword(), database: container.getDatabase(), multipleStatements: true,
    });
    try {
      for (const file of ['01_schema.sql', '02_seeds.sql', '03_landing.sql']) {
        await connection.query(fs.readFileSync(path.resolve(__dirname, '../../../database/init', file), 'utf8'));
      }
    } finally { await connection.end(); }
    vi.resetModules();
    ({ app } = await import('../../src/app'));
    ({ default: pool } = await import('../../src/config/db'));
    server = await new Promise<Server>(resolve => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('API sin puerto');
    process.env.VITE_API_URL = `http://127.0.0.1:${address.port}`;
    const { createServer } = frontendRequire('vite');
    vite = await createServer({
      root: frontend, server: { host: 'localhost', port: 4175, strictPort: true },
    });
    await (vite as unknown as { listen(): Promise<void> }).listen();
    baseUrl = 'http://localhost:4175';
  });

  afterAll(async () => {
    await vite?.close();
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await pool?.end();
    await container?.stop();
  });

  it('publica y retira desde el formulario; visitante ve el cambio y roles no autorizados reciben rechazo', async () => {
    const [reserva] = await pool.execute<ResultSetHeader>(
      'INSERT INTO reserva (fecha, hora_inicio, hora_fin, espacio_id, estado_reserva_id, solicitante_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['2099-12-20', '09:00:00', '11:00:00', 2, 2, 1],
    );
    const [evento] = await pool.execute<ResultSetHeader>(
      'INSERT INTO evento (titulo, descripcion, encargado_id, reserva_id) VALUES (?, ?, ?, ?)',
      ['Encuentro público Sprint 10', 'Actividad de verificación aislada', 1, reserva.insertId],
    );
    const endpoint = `/api/eventos/${evento.insertId}/publico`;
    await request(app).patch(endpoint).send({ publico: true }).expect(401);
    const ministro = await request(app).post('/api/auth/login')
      .send({ correo: 'ministro@parroquia.com', password: 'password123' }).expect(200);
    await request(app).patch(endpoint).auth(ministro.body.token, { type: 'bearer' }).send({ publico: true }).expect(403);
    const login = await request(app).post('/api/auth/login')
      .send({ correo: 'diego@parroquia.com', password: 'admin123' }).expect(200);

    const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
    try {
      const admin = await browser.newContext();
      await admin.addInitScript(({ token, usuario }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('usuario', JSON.stringify(usuario));
      }, login.body);
      const page = await admin.newPage();
      const visitante = await browser.newPage();
      await visitante.goto(`${baseUrl}/agenda`);
      await visitante.getByRole('heading', { name: 'Aún no hay actividades publicadas' }).waitFor();
      await page.goto(`${baseUrl}/eventos`);
      await page.getByRole('row').filter({ hasText: 'Actividad de verificación aislada' }).getByRole('button', { name: 'Editar' }).click();
      const casilla = page.getByRole('checkbox', { name: 'Mostrar en la agenda pública' });
      expect(await casilla.isChecked()).toBe(false);
      await casilla.check();
      await page.screenshot({ path: 'test-results/evento-publico-editor.png', fullPage: true });
      const guardado = page.waitForResponse(response => response.url().endsWith(endpoint) && response.request().method() === 'PATCH');
      await page.getByRole('button', { name: 'Guardar Cambios' }).click();
      expect((await guardado).status()).toBe(200);
      await casilla.waitFor({ state: 'detached' });
      await visitante.reload();
      await visitante.getByRole('heading', { name: 'Encuentro público Sprint 10' }).waitFor();
      await visitante.screenshot({ path: 'test-results/evento-publico-agenda.png', fullPage: true });
      const agenda = await request(app).get('/api/public/agenda').expect(200);
      expect(agenda.body.map((item: { id: number }) => item.id)).toContain(evento.insertId);
      expect(agenda.body[0]).not.toHaveProperty('encargado_id');

      await page.reload();
      await page.getByRole('row').filter({ hasText: 'Actividad de verificación aislada' }).getByRole('button', { name: 'Editar' }).click();
      expect(await casilla.isChecked()).toBe(true);
      await casilla.uncheck();
      const retirado = page.waitForResponse(response => response.url().endsWith(endpoint) && response.request().method() === 'PATCH');
      await page.getByRole('button', { name: 'Guardar Cambios' }).click();
      expect((await retirado).status()).toBe(200);
      await visitante.reload();
      await visitante.getByRole('heading', { name: 'Aún no hay actividades publicadas' }).waitFor();
      expect((await request(app).get('/api/public/agenda').expect(200)).body).toEqual([]);
    } finally { await browser.close(); }
  }, 60_000);
});
