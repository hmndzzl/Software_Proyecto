import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Server } from 'node:http';
import mysql, { type Pool } from 'mysql2/promise';
import { MariaDbContainer, type StartedMariaDbContainer } from '@testcontainers/mariadb';
import request from 'supertest';

// Usa las dependencias del frontend, sin añadir otro navegador ni mocks de API.
const frontend = path.resolve(__dirname, '../../../frontend');
const frontendRequire = createRequire(path.join(frontend, 'package.json'));
const { chromium } = frontendRequire('@playwright/test');

describe('hora de notificaciones con MariaDB y navegador', () => {
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

  it('conserva históricos, captura nuevos envíos y filtra sin depender de la zona del navegador', async () => {
    await pool.query('ALTER TABLE notificacion DROP COLUMN enviado_en');
    const migration = fs.readFileSync(path.resolve(__dirname, '../../../database/migrations/20261023_notificacion_enviado_en.sql'), 'utf8');
    const apply = async () => { for (const sql of migration.split(';').filter(s => s.trim())) await pool.query(sql); };
    await apply();
    const [legacy]: any = await pool.query('SELECT enviado_en FROM notificacion');
    expect(legacy.every((n: any) => n.enviado_en === null)).toBe(true);
    const login = await request(app).post('/api/auth/login').send({ correo: 'diego@parroquia.com', password: 'admin123' }).expect(200);
    const ministro = await request(app).post('/api/auth/login').send({ correo: 'ministro@parroquia.com', password: 'password123' }).expect(200);
    await request(app).get('/api/notificaciones/enviadas').auth(ministro.body.token, { type: 'bearer' }).expect(403);
    await request(app).get('/api/notificaciones').expect(401);
    await request(app).post('/api/notificaciones').auth(login.body.token, { type: 'bearer' })
      .send({ mensaje: 'Hora nueva de prueba', tipo: 'individual', destinatarios: [1] }).expect(201);
    const received = () => request(app).get('/api/notificaciones').auth(login.body.token, { type: 'bearer' });
    const nueva = (await received()).body.find((n: any) => n.mensaje === 'Hora nueva de prueba');
    expect(Math.abs(Date.now() - Date.parse(nueva.enviado_en))).toBeLessThan(15000);
    const ajenas = await request(app).get('/api/notificaciones').auth(ministro.body.token, { type: 'bearer' }).expect(200);
    expect(ajenas.body.some((n: any) => n.id === nueva.id)).toBe(false);
    await apply();
    expect((await received()).body.find((n: any) => n.id === nueva.id).enviado_en).toBe(nueva.enviado_en);
    await pool.query('UPDATE notificacion SET enviado_en = ? WHERE id = ?', ['2026-10-23 17:30:45', nueva.id]);
    const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
    try {
      const context = await browser.newContext({ timezoneId: 'Asia/Tokyo' });
      await context.addInitScript(({ token, usuario }) => {
        localStorage.setItem('token', token); localStorage.setItem('usuario', JSON.stringify(usuario));
      }, login.body);
      const page = await context.newPage();
      await page.goto(`${baseUrl}/notificaciones`);
      await page.getByText('Hora nueva de prueba', { exact: true }).waitFor();
      expect(await page.getByRole('row').filter({ hasText: 'Hora nueva de prueba' }).innerText()).toContain('11:30');
      await page.getByLabel('Desde (fecha y hora)').fill('2026-10-23T11:30');
      await page.getByLabel('Hasta (fecha y hora)').fill('2026-10-23T11:30');
      expect(await page.getByRole('row').count()).toBe(2);
      await page.getByRole('button', { name: 'Enviadas', exact: true }).click();
      await page.getByText('Hora nueva de prueba', { exact: true }).waitFor();
      await page.screenshot({ path: 'test-results/notificaciones-hora.png', fullPage: true, animations: 'disabled' });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('button', { name: 'Abrir menú' }).waitFor();
      await page.screenshot({ path: 'test-results/notificaciones-hora-movil.png', fullPage: true, animations: 'disabled' });
      await page.getByLabel('Desde (fecha y hora)').fill('2026-10-23T11:31');
      await page.getByRole('alert').filter({ hasText: 'inicial' }).waitFor();
      await page.getByRole('button', { name: 'Limpiar filtros' }).click();
      await request(app).put(`/api/notificaciones/${nueva.id}/papelera`).auth(login.body.token, { type: 'bearer' }).expect(200);
      const trash = await request(app).get('/api/notificaciones/papelera').auth(login.body.token, { type: 'bearer' }).expect(200);
      expect(trash.body.find((n: any) => n.id === nueva.id).enviado_en).toBe('2026-10-23T17:30:45Z');
      await page.reload();
      await page.getByRole('button', { name: 'Papelera', exact: true }).click();
      await page.getByLabel('Desde (fecha y hora)').fill('2026-10-23T11:31');
      await page.getByText('No hay notificaciones en el rango seleccionado.').waitFor();
      await page.getByRole('button', { name: 'Limpiar filtros' }).click();
      await page.getByText('Hora nueva de prueba', { exact: true }).waitFor();
    } finally { await browser.close(); }
  }, 60000);
});
