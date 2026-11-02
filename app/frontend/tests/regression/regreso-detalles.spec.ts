import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const tarea = { id: 1, titulo: 'Preparar altar', descripcion: 'Preparación', fecha: '2026-10-05', hora_inicio: '09:30', hora_fin: '10:00', evento_id: 8, asignados: [{ persona_id: 9, nombre: 'Ana' }] };
const evento = { id: 8, titulo: 'Misa del lunes', descripcion: 'Celebración', fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00', encargado_id: 1, nombre_encargado: 'Pedro', nombre_espacio: 'Templo', estado_reserva_id: 2, tareas: [tarea] };

async function preparar(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana', correo: 'ana@test.com', rol_id: 5 }));
  });
  await page.clock.setFixedTime(new Date('2026-10-05T08:00:00'));
  await page.route('http://api.test/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const espacio = { id: 5, nombre: 'Salón parroquial', capacidad: 100, disponible: true };
    const data = path === '/api/espacios/5' ? espacio : path === '/api/espacios' ? [espacio]
      : path === '/api/grupos' ? [{ id: 3, nombre: 'Coro parroquial', coordinadores: [{ id: 9, nombre: 'Ana' }] }]
      : path === '/api/tareas' ? [tarea]
      : path === '/api/reservas' || path === '/api/reservas/mis-reservas' ? [{ id: 7, espacio_id: 5, espacio_nombre: 'Salón parroquial', fecha: '2099-10-05', hora_inicio: '10:00', hora_fin: '11:00', estado_reserva_id: 2, evento_titulo: 'Ensayo' }]
      : path === '/api/cuentas' ? [{ id: 9, nombre: 'Ana', correo: 'ana@test.com', rol_id: 4, estado_cuenta: url.searchParams.get('estado') }]
      : path === '/api/calendario' ? { eventos: [evento], tareas: [tarea] } : [];
    await route.fulfill({ json: data });
  });
}

for (const width of [320, 1440]) {
  for (const tema of ['claro', 'oscuro']) {
    test(`el regreso es visible, accesible y conserva el origen a ${width}px en ${tema}`, async ({ page }) => {
      await preparar(page);
      await page.setViewportSize({ width, height: 900 });
      // Entrada directa: el regreso no depende de un historial previo del navegador.
      await page.goto('/espacios/5');
      await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
      const regresar = page.getByRole('button', { name: 'Volver a espacios', exact: true });
      await expect(page.getByRole('heading', { name: 'Salón parroquial', exact: true })).toBeVisible();
      await expect(regresar).toBeVisible();
      expect((await regresar.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: test.info().outputPath('espacio.png') });
      await regresar.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/espacios$/);

      for (const [ruta, abrirLabel, volverLabel] of [
        ['/grupos', 'Coro parroquial', 'Volver a grupos'],
        ['/tareas', 'Preparar altar', 'Volver a tareas'],
        ['/reservas', '7', 'Volver a reservas'],
        ['/mis-reservas', '7', 'Volver a mis reservas'],
        ['/cuentas', 'Ver detalle', 'Volver a cuentas'],
      ]) {
        await page.goto(ruta);
        await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
        const abrir = page.getByRole('button', { name: abrirLabel, exact: true });
        await abrir.click();
        const dialog = page.getByRole('dialog');
        if (ruta === '/tareas') {
          await dialog.getByRole('button', { name: 'Gestionar ministros', exact: true }).click();
          const regresarDetalle = dialog.getByRole('button', { name: 'Volver al detalle de la tarea', exact: true });
          await expect(regresarDetalle).toBeVisible();
          // El texto ampliado también debe caber con métricas de fuente distintas a las locales.
          if (width === 320) await regresarDetalle.evaluate(el => { el.style.fontSize = '20px'; });
          expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
          expect(await regresarDetalle.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
          await page.screenshot({ path: test.info().outputPath('regreso-tarea-texto-ampliado.png') });
          await regresarDetalle.click();
          await expect(dialog.getByRole('heading', { name: 'Preparar altar', exact: true })).toBeVisible();
        }
        const volver = dialog.getByRole('button', { name: volverLabel, exact: true });
        await expect(volver).toBeVisible();
        expect((await volver.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        if (ruta === '/grupos') {
          await expect.poll(async () => (await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
          await page.screenshot({ path: test.info().outputPath('detalle-grupo.png') });
        }
        await volver.focus();
        await page.keyboard.press('Enter');
        await expect(dialog).toHaveCount(0);
        await expect(abrir).toBeFocused();
        await expect(page).toHaveURL(new RegExp(`${ruta}$`));
      }
    });
  }
}

test('el regreso desde una tarea del calendario vuelve al evento y luego al calendario', async ({ page }) => {
  await preparar(page);
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/calendario');
  await page.evaluate(() => document.documentElement.setAttribute('data-tema', 'oscuro'));
  const abrir = page.getByRole('button', { name: 'Ver detalle del evento Misa del lunes', exact: true });
  await abrir.click();
  await page.getByRole('button', { name: 'Ver detalle de la tarea Preparar altar' }).click();
  await expect(page.getByRole('button', { name: 'Volver a la tarjeta anterior' })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('tarea-unico-regreso.png') });
  await page.getByRole('button', { name: 'Volver al evento', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Misa del lunes' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver al calendario', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(abrir).toBeFocused();
});
