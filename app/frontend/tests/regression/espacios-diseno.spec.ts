import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const nombreLargo = 'Salón parroquial de formación y encuentro de la comunidad San Pedro Nolasco';
const espacios = [
  { id: 1, nombre: nombreLargo, capacidad: 120, disponible: true, foto_url: '/uploads/espacios/salon-02-v1.webp' },
  { id: 2, nombre: 'Capilla lateral', capacidad: 80, disponible: false, en_uso: true, foto_url: '/uploads/espacios/salon-01-v1.webp' },
  { id: 3, nombre: 'Espacio pendiente de completar', capacidad: null, disponible: true, foto_url: null },
];
async function preparar(page: Page, rol = 5) {
  const estado = { fallo: false, vacio: false, demora: false, espera: Promise.resolve(), consultado: '2026-10-27T15:30:00Z' };
  await page.addInitScript(rol_id => {
    localStorage.setItem('token', 'jwt-de-regresion');
    if (!localStorage.getItem('usuario')) localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Admin de prueba', correo: 'prueba@test.com', rol_id }));
  }, rol);
  await page.route('**/uploads/espacios/**', route => route.fulfill({
    path: path.resolve('../backend/media/espacios', new URL(route.request().url()).pathname.split('/').pop()!), contentType: 'image/webp',
  }));
  await page.route('http://api.test/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/espacios') {
      if (estado.demora) await estado.espera;
      await route.fulfill(estado.fallo ? { status: 500, json: { message: 'No se pudieron consultar los espacios' } } :
        { json: estado.vacio ? [] : espacios.map(e => ({ ...e, consultado_en: estado.consultado })) });
    } else if (url.pathname === '/api/espacios/1') await route.fulfill({ json: espacios[0] });
    else await route.fulfill({ json: [] });
  });
  return estado;
}

for (const viewport of [{ width: 375, height: 844 }, { width: 1440, height: 1000 }]) {
  test(`tarjetas completas y detalle con espaciado compartido a ${viewport.width}px`, async ({ page }) => {
    await preparar(page);
    await page.setViewportSize(viewport);
    await page.goto('/espacios');
    await expect(page.getByRole('heading', { name: nombreLargo, exact: true })).toBeVisible();
    await expect(page.getByText('27 de octubre de 2026 · 09:30')).toBeVisible();
    const tarjeta = page.getByRole('article', { name: nombreLargo, exact: true });
    await expect(tarjeta.getByText('120 personas')).toBeVisible();
    await expect(tarjeta.getByText('Disponible', { exact: true })).toBeVisible();
    await expect(page.getByText('Capacidad sin definir')).toBeVisible();
    const foto = tarjeta.getByRole('img');
    await expect.poll(() => foto.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const cuerpo = (await tarjeta.boundingBox())!;
    const imagen = (await foto.boundingBox())!;
    expect(imagen.height / imagen.width).toBeCloseTo(10 / 16, 1);
    expect(cuerpo.x).toBeGreaterThanOrEqual(0); expect(cuerpo.x + cuerpo.width).toBeLessThanOrEqual(viewport.width);
    const ver = tarjeta.getByRole('button', { name: 'Ver detalle', exact: true });
    const editar = tarjeta.getByRole('button', { name: 'Editar espacio', exact: true });
    expect(Math.abs((await ver.boundingBox())!.y - (await editar.boundingBox())!.y)).toBeLessThan(2);
    expect((await ver.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await editar.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await ver.focus(); await page.keyboard.press('Tab'); await expect(editar).toBeFocused();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(tarjeta).toHaveCSS('transition-duration', '0s');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const contraste = await new AxeBuilder({ page }).include('article').include('[class*="_consultaBar_"]').withRules(['color-contrast', 'button-name', 'image-alt']).analyze();
    expect(contraste.violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`espacios-${viewport.width}x${viewport.height}.png`), fullPage: true });
    await page.evaluate(() => document.documentElement.setAttribute('data-tema', 'oscuro'));
    expect((await new AxeBuilder({ page }).include('article').include('[class*="_consultaBar_"]').withRules(['color-contrast']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`espacios-oscuro-${viewport.width}x${viewport.height}.png`), fullPage: true });
    await page.locator('main').evaluate(el => { el.parentElement!.scrollTop = el.parentElement!.scrollHeight; });
    const ultima = (await page.getByRole('article').last().boundingBox())!;
    const margen = await page.locator('main').evaluate(el => parseFloat(getComputedStyle(el).paddingBottom));
    expect(viewport.height - ultima.y - ultima.height).toBeGreaterThanOrEqual(margen - 1);
    await page.screenshot({ path: test.info().outputPath(`final-listado-${viewport.width}x${viewport.height}.png`), fullPage: true });
    await ver.click();
    await expect(page).toHaveURL(/\/espacios\/1$/);
    await expect(page.getByRole('button', { name: 'Editar espacio', exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: nombreLargo, exact: true })).toBeVisible();
    const volver = (await page.getByRole('button', { name: 'Volver a espacios', exact: true }).boundingBox())!;
    expect(volver.height).toBeGreaterThanOrEqual(44);
    expect(volver.x + volver.width).toBeLessThanOrEqual(viewport.width);
    const gestion = (await page.getByRole('button', { name: 'Editar espacio' }).boundingBox())!;
    const libre = (await page.locator('span[class*="_badge_"]').filter({ hasText: /^Libre$/ }).boundingBox())!;
    const gap = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gap-sm')));
    expect(libre.y - gestion.y - gestion.height).toBeGreaterThanOrEqual(gap - 1);
    await page.screenshot({ path: test.info().outputPath(`detalle-${viewport.width}x${viewport.height}.png`), fullPage: true });
  });
}

test('consulta real, filtros incompletos, estados de carga, error y vacío', async ({ page }) => {
  const estado = await preparar(page);
  let desbloquear!: () => void;
  estado.demora = true; estado.espera = new Promise(resolve => { desbloquear = resolve; });
  await page.goto('/espacios');
  await expect(page.getByText('Cargando espacios...')).toBeVisible();
  desbloquear(); estado.demora = false;
  await expect(page.getByText('27 de octubre de 2026 · 09:30')).toBeVisible();
  await page.getByLabel('Fecha', { exact: true }).fill('2099-11-01');
  await expect(page.getByText('Sin consultar')).toHaveCount(3);
  await expect(page.getByText('Disponible', { exact: true })).toHaveCount(0);
  await page.getByLabel('Hora inicio', { exact: true }).fill('10:00');
  await page.getByLabel('Hora fin', { exact: true }).fill('11:00');
  await expect(page.getByText('1 de noviembre de 2099')).toBeVisible();
  await expect(page.getByText(/Disponibilidad para/)).toContainText('10:00 – 11:00');
  estado.fallo = true;
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Se conserva la última consulta');
  await expect(page.getByRole('article')).toHaveCount(3);
  estado.fallo = false; estado.vacio = true;
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(page.getByText('No hay espacios registrados.')).toBeVisible();
  estado.vacio = false;
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(3);
});

test('el refresco periódico conserva una edición abierta y los roles de consulta no pueden editar', async ({ page }) => {
  const estado = await preparar(page);
  await page.clock.install();
  await page.goto('/espacios');
  await page.getByRole('article', { name: nombreLargo }).getByRole('button', { name: 'Editar espacio' }).click();
  await page.getByLabel('Nombre del espacio').fill('Cambios sin guardar');
  estado.consultado = '2026-10-27T15:31:00Z';
  await page.clock.runFor(60_000);
  await expect(page.getByLabel('Nombre del espacio')).toHaveValue('Cambios sin guardar');
  await expect(page.getByText('27 de octubre de 2026 · 09:31')).toBeAttached();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.evaluate(() => {
    localStorage.setItem('usuario', JSON.stringify({ id: 7, nombre: 'Coordinador', correo: 'coord@test.com', rol_id: 2 }));
  });
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Editar espacio' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Crear espacio' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ver detalle', exact: true })).toHaveCount(3);
});
