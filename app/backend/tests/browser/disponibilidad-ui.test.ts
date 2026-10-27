import path from 'node:path';
import { createRequire } from 'node:module';
import type { Server } from 'node:http';
import request from 'supertest';
import { iniciarParroquiaPrueba } from '../helpers/parroquiaPrueba';

const frontend = path.resolve(__dirname, '../../../frontend');
const frontendRequire = createRequire(path.join(frontend, 'package.json'));
const { chromium, expect: browserExpect } = frontendRequire('@playwright/test');
const baseUrl = 'http://localhost:4175';
let entorno: Awaited<ReturnType<typeof iniciarParroquiaPrueba>>;
let server: Server;
let vite: { close(): Promise<void>; listen(): Promise<void> };

beforeAll(async () => {
  Object.assign(process.env, { CORS_ORIGIN: baseUrl, VITE_CLERK_PUBLISHABLE_KEY: '' });
  entorno = await iniciarParroquiaPrueba();
  server = await new Promise<Server>(resolve => {
    const listening = entorno.app.listen(0, '127.0.0.1', () => resolve(listening));
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
  await entorno?.cerrar();
});

it('guarda y recarga periodos desde el directorio, advierte al asignar y permite retirarlos', async () => {
  const admin = (await request(entorno.app).post('/api/auth/login').send({ correo: 'diego@parroquia.com', password: 'admin123' }).expect(200)).body;
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  try {
    const contexto = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await contexto.addInitScript(({ token, usuario }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
    }, admin);
    const page = await contexto.newPage();
    await page.goto(`${baseUrl}/ministros`);
    const fila = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'ministro@parroquia.com', exact: true }) });
    await fila.getByRole('button', { name: 'Periodos no disponibles' }).click();
    let modal = page.getByRole('dialog', { name: 'Disponibilidad de Ministro Test' });
    await modal.getByLabel('No disponible desde').fill('2099-12-10T10:00');
    await modal.getByLabel('Disponible nuevamente el').fill('2099-12-15T18:00');
    await modal.getByRole('button', { name: 'Agregar periodo' }).click();
    await browserExpect(modal.getByRole('button', { name: /Quitar periodo del/ })).toBeVisible();
    await page.reload();
    await fila.getByRole('button', { name: 'Periodos no disponibles' }).click();
    modal = page.getByRole('dialog', { name: 'Disponibilidad de Ministro Test' });
    await browserExpect(modal.getByText(/Desde 10\/12\/2099 10:00/)).toBeVisible();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `test-results/disponibilidad-${width}.png`, fullPage: true });
      expect(await modal.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      const agregar = modal.getByRole('button', { name: 'Agregar periodo' });
      await browserExpect(agregar).toBeVisible();
      expect(await agregar.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${baseUrl}/tareas`);
    await page.getByLabel('Título:', { exact: true }).fill('Servicio disponibilidad UI');
    await page.getByLabel('Descripción:', { exact: true }).fill('Prueba de periodo real');
    await page.getByLabel('Fecha:', { exact: true }).fill('2099-12-12');
    await page.getByLabel('Hora de Inicio:').fill('10:00');
    await page.getByLabel('Hora de Fin:').fill('11:00');
    await page.getByRole('button', { name: /opciones de ministros$/ }).click();
    await page.getByRole('checkbox', { name: 'Ministro Test', exact: true }).check();
    await browserExpect(page.getByText('Tiene un periodo no disponible en este horario.')).toBeVisible();
    const respuesta = page.waitForResponse(r => r.url().endsWith('/api/tareas') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Crear y asignar tarea' }).click();
    const creada = await respuesta;
    expect(creada.status()).toBe(201);
    expect((await creada.json()).alertas[0].periodo_no_disponible).toBe(true);
    await browserExpect(page.getByRole('status').filter({ hasText: 'Tarea creada y asignada' })).toContainText('Tiene un periodo no disponible');
    await page.goto(`${baseUrl}/ministros`);
    await fila.getByRole('button', { name: 'Periodos no disponibles' }).click();
    await page.getByRole('button', { name: /Quitar periodo del/ }).click();
    await browserExpect(page.getByText('No hay periodos registrados.')).toBeVisible();
  } finally { await browser.close(); }
}, 60_000);
