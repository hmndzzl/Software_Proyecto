import path from 'node:path';
import { createRequire } from 'node:module';
import type { Server } from 'node:http';
import request from 'supertest';
import type { RowDataPacket } from 'mysql2';
import { iniciarParroquiaPrueba } from '../helpers/parroquiaPrueba';

const frontend = path.resolve(__dirname, '../../../frontend');
const frontendRequire = createRequire(path.join(frontend, 'package.json'));
const { chromium, expect: esperar } = frontendRequire('@playwright/test');
let entorno: Awaited<ReturnType<typeof iniciarParroquiaPrueba>>;
let server: Server;
let vite: { close(): Promise<void>; listen(): Promise<void> };
const baseUrl = 'http://localhost:4175';

beforeAll(async () => {
  process.env.CORS_ORIGIN = baseUrl;
  process.env.VITE_CLERK_PUBLISHABLE_KEY = '';
  entorno = await iniciarParroquiaPrueba();
  server = await new Promise<Server>(resolve => {
    const listening = entorno.app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('API sin puerto');
  process.env.VITE_API_URL = `http://127.0.0.1:${address.port}`;
  vite = await frontendRequire('vite').createServer({ root: frontend, server: { host: 'localhost', port: 4175, strictPort: true } });
  await vite.listen();
});
afterAll(async () => {
  await vite?.close();
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  await entorno?.cerrar();
});

it('crea un servicio vinculado y lo consulta por rol en semana, mes y móvil', async () => {
  const login = async (correo: string, password = 'password123') => (await request(entorno.app).post('/api/auth/login').send({ correo, password }).expect(200)).body;
  const admin = await login('diego@parroquia.com', 'admin123');
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(({ token, usuario }: typeof admin) => {
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
    }, admin);
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2099-12-21T08:00:00'));
    await page.goto(`${baseUrl}/reservas`);
    await page.getByLabel('Espacio:', { exact: true }).selectOption('2');
    await page.getByLabel('Fecha:', { exact: true }).fill('2099-12-21');
    await page.getByLabel('Hora de Inicio:').fill('10:00');
    await page.getByLabel('Hora de Fin:').fill('11:00');
    await page.getByLabel('Título del Evento:').fill('D4 misa del calendario');
    await page.getByLabel('Descripción del Evento:').fill('Celebración de prueba');
    const reservaCreada = page.waitForResponse((r: { url(): string; request(): { method(): string } }) => r.url().endsWith('/api/reservas') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Solicitar Reserva', exact: true }).click();
    const respuesta = await reservaCreada;
    expect(respuesta.status()).toBe(201);
    const { reservaId } = await respuesta.json();
    await request(entorno.app).put(`/api/reservas/${reservaId}/estado`).auth(admin.token, { type: 'bearer' }).send({ estado_id: 2 }).expect(200);
    const [eventos] = await entorno.pool.query<RowDataPacket[]>('SELECT id FROM evento WHERE reserva_id = ?', [reservaId]);
    const eventoId = eventos[0].id;

    await page.goto(`${baseUrl}/tareas`);
    await page.getByLabel('Misa o evento asociado (opcional)').selectOption(String(eventoId));
    await esperar(page.getByLabel('Fecha:', { exact: true })).toHaveValue('2099-12-21');
    await page.getByLabel('Título:', { exact: true }).fill('D4 preparar altar');
    await page.getByLabel('Descripción:', { exact: true }).fill('Preparación antes de misa');
    await page.getByLabel('Hora de Inicio:', { exact: true }).fill('09:30');
    await page.getByLabel('Hora de Fin:', { exact: true }).fill('10:00');
    await page.getByRole('checkbox', { name: 'Ministro Test', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Carlos Ramirez', exact: true }).check();
    const tareaCreada = page.waitForResponse((r: { url(): string; request(): { method(): string } }) => r.url().endsWith('/api/tareas') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Crear y asignar tarea', exact: true }).click();
    expect((await tareaCreada).status()).toBe(201);

    await page.goto(`${baseUrl}/calendario`);
    await esperar(page.getByText('D4 preparar altar', { exact: true })).toHaveCount(1);
    await esperar(page.getByText('Carlos Ramirez, Ministro Test', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ver detalle del evento D4 misa del calendario' }).click();
    await esperar(page.getByRole('dialog')).toContainText('Ministros asignados: Carlos Ramirez, Ministro Test');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 1900 });
    await page.getByRole('main').evaluate((el: HTMLElement) => el.parentElement!.scrollTo(0, 0));
    await page.screenshot({ path: 'test-results/calendario-semana.png', fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Mes', exact: true }).click();
    const tabla = page.getByRole('table');
    await tabla.getByRole('button', { name: /21 de diciembre de 2099/ }).click();
    await esperar(page.getByRole('region', { name: /Compromisos del lunes.*21 de diciembre/ }).getByText('D4 preparar altar')).toBeVisible();
    await page.getByRole('main').evaluate((el: HTMLElement) => el.parentElement!.scrollTo(0, 0));
    await page.screenshot({ path: 'test-results/calendario-mes.png', fullPage: true, animations: 'disabled' });
    for (const viewport of [{ width: 320, height: 720 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(viewport);
      await esperar(page.getByRole('region', { name: 'Agenda de diciembre de 2099' }).getByText('D4 preparar altar')).toBeVisible();
      expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))).toBeLessThanOrEqual(viewport.width + 1);
    }
    await page.getByRole('main').evaluate((el: HTMLElement) => el.parentElement!.scrollTo(0, 0));
    await page.screenshot({ path: 'test-results/calendario-movil.png', fullPage: true, animations: 'disabled' });

    const coordinador = await login('coord.min@parroquia.com');
    const ministro = await login('ministro@parroquia.com');
    for (const sesion of [coordinador, ministro]) {
      const userContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await userContext.addInitScript(({ token, usuario }: typeof admin) => {
        localStorage.setItem('token', token);
        localStorage.setItem('usuario', JSON.stringify(usuario));
      }, sesion);
      const userPage = await userContext.newPage();
      await userPage.clock.setFixedTime(new Date('2099-12-21T08:00:00'));
      await userPage.goto(`${baseUrl}/calendario`);
      await esperar(userPage.getByText('D4 preparar altar', { exact: true })).toBeVisible();
      await esperar(userPage.getByText('Carlos Ramirez', { exact: true })).toHaveCount(0);
      if (sesion.usuario.rol_id === 2) {
        await userPage.getByLabel('Ver horario de un ministro').selectOption('9');
        await esperar(userPage.getByText('Horario de Ministro Test', { exact: true })).toBeVisible();
        await esperar(userPage.getByLabel('Ver horario de un ministro').locator('option[value="11"]')).toHaveCount(0);
      } else {
        await esperar(userPage.getByLabel('Ver horario de un ministro')).toHaveCount(0);
        await userPage.getByLabel('Qué deseas consultar').selectOption('parroquial');
        await esperar(userPage.getByText('D4 misa del calendario', { exact: true })).toBeVisible();
        await esperar(userPage.getByText('D4 preparar altar', { exact: true })).toHaveCount(0);
      }
      await userContext.close();
    }
  } finally { await browser.close(); }
}, 60_000);
