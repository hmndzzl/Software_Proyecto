import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Server } from 'node:http';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { MariaDbContainer, type StartedMariaDbContainer } from '@testcontainers/mariadb';
import request from 'supertest';

const frontend = path.resolve(__dirname, '../../../frontend');
const frontendRequire = createRequire(path.join(frontend, 'package.json'));
const { chromium, expect: browserExpect } = frontendRequire('@playwright/test');

describe('gestión de coordinadores con navegador, API y MariaDB reales', () => {
  let container: StartedMariaDbContainer;
  let pool: Pool;
  let server: Server;
  let vite: { close(): Promise<void>; listen(): Promise<void> };
  let app: Awaited<typeof import('../../src/app')>['app'];
  const baseUrl = 'http://localhost:4175';
  const base = '/api/coordinadores-ministros';

  beforeAll(async () => {
    container = await new MariaDbContainer('mariadb:11')
      .withDatabase('parroquia_test').withUsername('parroquia')
      .withUserPassword('parroquia_test').withRootPassword('root_test').start();
    Object.assign(process.env, {
      NODE_ENV: 'test', DB_HOST: container.getHost(), DB_PORT: String(container.getPort()),
      DB_USER: container.getUsername(), DB_PASSWORD: container.getUserPassword(), DB_NAME: container.getDatabase(),
      CORS_ORIGIN: baseUrl, VITE_CLERK_PUBLISHABLE_KEY: '',
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
    vite = await createServer({ root: frontend, server: { host: 'localhost', port: 4175, strictPort: true } });
    await vite.listen();
  });

  afterAll(async () => {
    await vite?.close();
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await pool?.end();
    await container?.stop();
  });

  async function login(correo: string, password = 'password123') {
    return (await request(app).post('/api/auth/login').send({ correo, password }).expect(200)).body;
  }

  it('asigna y retira desde la pantalla, conserva otros coordinadores y limita el acceso por rol', async () => {
    const admin = await login('diego@parroquia.com', 'admin123');
    const sacerdote = await login('sacerdote@parroquia.com');
    const norte = await login('coord.min@parroquia.com');
    const sur = await login('coord.min2@parroquia.com');
    const ministro = await login('ministro@parroquia.com');
    const grupos = await login('coord.grupos@parroquia.com');
    const pathRelacion = `${base}/13/ministros/9`;
    const operaciones = [['get', base], ['get', `${base}/13/ministros`], ['put', pathRelacion], ['delete', pathRelacion]] as const;
    for (const [method, url] of operaciones) {
      await request(app)[method](url).expect(401);
      for (const user of [norte, ministro, grupos]) {
        await request(app)[method](url).auth(user.token, { type: 'bearer' }).expect(403);
      }
    }
    await request(app).get(base).auth(sacerdote.token, { type: 'bearer' }).expect(200);
    await request(app).get(`${base}/13/ministros`).auth(sacerdote.token, { type: 'bearer' }).expect(200);
    const beforeSur = await request(app).get('/api/personas').auth(sur.token, { type: 'bearer' }).expect(200);
    expect(beforeSur.body.map((p: { id: number }) => p.id)).not.toContain(9);
    const [personaAntes] = await pool.query<RowDataPacket[]>('SELECT id, nombre FROM persona WHERE id = 9');
    const [tareasAntes] = await pool.query<RowDataPacket[]>('SELECT * FROM asignacion_tarea WHERE persona_id = 9 ORDER BY tarea_id');
    const nombre = personaAntes[0].nombre;
    const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
    try {
      const contexto = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await contexto.addInitScript(({ token, usuario }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('usuario', JSON.stringify(usuario));
      }, admin);
      const page = await contexto.newPage();
      await page.goto(`${baseUrl}/ministros`);
      await page.getByRole('button', { name: 'Gestionar coordinadores' }).click();
      await page.getByRole('combobox', { name: 'Coordinador de ministros' }).selectOption('13');
      await page.getByRole('combobox', { name: 'Ministro para asignar' }).selectOption('9');
      const guardado = page.waitForResponse(r => r.url().endsWith(pathRelacion) && r.request().method() === 'PUT');
      await page.getByRole('button', { name: 'Asignar ministro', exact: true }).click();
      expect((await guardado).status()).toBe(200);
      await page.getByRole('button', { name: `Quitar a ${nombre}`, exact: true }).waitFor();
      await page.screenshot({ path: 'test-results/coordinadores-escritorio.png', fullPage: true });
      const afterSur = await request(app).get('/api/personas').auth(sur.token, { type: 'bearer' }).expect(200);
      expect(afterSur.body.map((p: { id: number }) => p.id)).toContain(9);
      const afterNorte = await request(app).get('/api/personas').auth(norte.token, { type: 'bearer' }).expect(200);
      expect(afterNorte.body.map((p: { id: number }) => p.id)).toContain(9);
      // PUT repetido como Sacerdote es idempotente y no duplica relaciones.
      await request(app).put(pathRelacion).auth(sacerdote.token, { type: 'bearer' }).expect(200);
      const [conteo] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM coordinador_ministro WHERE coordinador_id = 13 AND ministro_id = 9');
      expect(conteo[0].total).toBe(1);
      await page.reload();
      await page.getByRole('combobox', { name: 'Coordinador de ministros' }).selectOption('13');
      await page.getByRole('button', { name: `Quitar a ${nombre}`, exact: true }).waitFor();
      await page.setViewportSize({ width: 390, height: 844 });
      await browserExpect(page.getByRole('button', { name: 'Abrir menú', exact: true })).toBeVisible();
      await page.screenshot({ path: 'test-results/coordinadores-movil.png', fullPage: true, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await page.getByRole('button', { name: `Quitar a ${nombre}`, exact: true }).click();
      const retiro = page.waitForResponse(r => r.url().endsWith(pathRelacion) && r.request().method() === 'DELETE');
      await page.getByRole('button', { name: 'Confirmar retiro' }).click();
      expect((await retiro).status()).toBe(200);
      await browserExpect(page.getByRole('button', { name: `Quitar a ${nombre}`, exact: true })).toHaveCount(0);
      const finalSur = await request(app).get('/api/personas').auth(sur.token, { type: 'bearer' }).expect(200);
      expect(finalSur.body).toEqual(beforeSur.body);
      const finalNorte = await request(app).get('/api/personas').auth(norte.token, { type: 'bearer' }).expect(200);
      expect(finalNorte.body).toEqual(afterNorte.body);
      const [personaDespues] = await pool.query<RowDataPacket[]>('SELECT id, nombre FROM persona WHERE id = 9');
      const [tareasDespues] = await pool.query<RowDataPacket[]>('SELECT * FROM asignacion_tarea WHERE persona_id = 9 ORDER BY tarea_id');
      expect(personaDespues).toEqual(personaAntes);
      expect(tareasDespues).toEqual(tareasAntes);
      await request(app).delete(pathRelacion).auth(sacerdote.token, { type: 'bearer' }).expect(200);

      // La ruta también está protegida en la interfaz, incluso escribiendo la URL.
      const restringido = await browser.newContext();
      await restringido.addInitScript(({ token, usuario }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('usuario', JSON.stringify(usuario));
      }, norte);
      const coordPage = await restringido.newPage();
      await coordPage.goto(`${baseUrl}/ministros`);
      await coordPage.getByRole('heading', { name: 'Ministros y Personas' }).waitFor();
      await browserExpect(coordPage.getByRole('button', { name: 'Gestionar coordinadores' })).toHaveCount(0);
      await coordPage.goto(`${baseUrl}/ministros/coordinadores`);
      await browserExpect(coordPage).toHaveURL(/\/dashboard$/);
    } finally { await browser.close(); }
  }, 60_000);

  it('rechaza identificadores, roles y cuentas inválidos sin alterar relaciones existentes', async () => {
    const admin = await login('diego@parroquia.com', 'admin123');
    const [antes] = await pool.query<RowDataPacket[]>('SELECT * FROM coordinador_ministro ORDER BY coordinador_id, ministro_id');
    for (const [ruta, status] of [
      ['/0/ministros/9', 400], ['/7/ministros/0', 400], ['/99999/ministros/9', 404],
      ['/7/ministros/99999', 404], ['/9/ministros/10', 404], ['/7/ministros/1', 400],
    ] as const) {
      await request(app).put(base + ruta).auth(admin.token, { type: 'bearer' }).expect(status);
    }
    await pool.execute("UPDATE persona SET estado_cuenta = 'rechazada' WHERE id = 9");
    await request(app).put(`${base}/13/ministros/9`).auth(admin.token, { type: 'bearer' }).expect(400);
    const [despues] = await pool.query<RowDataPacket[]>('SELECT * FROM coordinador_ministro ORDER BY coordinador_id, ministro_id');
    expect(despues).toEqual(antes);
    // Se puede limpiar una relación preexistente aunque el ministro ya no esté activo.
    await request(app).delete(`${base}/7/ministros/9`).auth(admin.token, { type: 'bearer' }).expect(200);
    const asignados = await request(app).get(`${base}/7/ministros`).auth(admin.token, { type: 'bearer' }).expect(200);
    expect(asignados.body.map((p: { id: number }) => p.id)).not.toContain(9);
  });
});
