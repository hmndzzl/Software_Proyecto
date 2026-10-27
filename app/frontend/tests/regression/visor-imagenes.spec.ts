import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function preparar(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: 5 }));
  });
  const espacio = { id: 1, nombre: 'Salón parroquial', capacidad: 60, disponible: true, foto_url: '/uploads/espacios/salon-02-v1.webp', consultado_en: '2026-10-27T15:00:00Z' };
  await page.route('**/uploads/espacios/**', route => route.fulfill({ path: path.resolve('../backend/media/espacios/salon-02-v1.webp'), contentType: 'image/webp' }));
  await page.route('http://api.test/**', route => {
    const ruta = new URL(route.request().url()).pathname;
    return route.fulfill({ json: ruta === '/api/espacios' ? [espacio] : ruta === '/api/espacios/1' ? espacio : [] });
  });
}

for (const viewport of [{ width: 375, height: 844 }, { width: 1280, height: 900 }]) {
  test(`visor integrado con fondo claro, zoom y navegación independiente a ${viewport.width}px`, async ({ page }) => {
    await preparar(page); await page.setViewportSize(viewport);
    await page.goto('/espacios');
    const abrir = page.getByRole('button', { name: 'Ampliar imagen: Fotografía de Salón parroquial' });
    await abrir.click();
    const dialogo = page.getByRole('dialog', { name: 'Imagen ampliada' });
    const imagen = dialogo.getByRole('img');
    await expect(imagen).toBeVisible();
    await expect(page).toHaveURL(/\/espacios$/);
    const limites = (await dialogo.boundingBox())!;
    expect(limites.x).toBeGreaterThanOrEqual(7);
    expect(limites.x + limites.width).toBeLessThanOrEqual(viewport.width - 7);
    expect(limites.y).toBeGreaterThan(0);
    if (viewport.width < 600) expect(limites.height).toBeLessThan(viewport.height * .8);
    await expect(dialogo).toHaveCSS('animation-name', /aparecer/);
    const fondo = await dialogo.evaluate(el => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = getComputedStyle(el, '::backdrop').backgroundColor; ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    });
    expect(fondo[0]).toBeGreaterThan(220); expect(fondo[2]).toBeGreaterThan(180); expect(fondo[3]).toBeGreaterThan(200);
    const anchoInicial = (await imagen.boundingBox())!.width;
    await dialogo.getByRole('button', { name: 'Acercar imagen' }).click();
    await expect(dialogo.getByText('150%')).toBeVisible();
    expect((await imagen.boundingBox())!.width).toBeGreaterThan(anchoInicial);
    await dialogo.getByRole('button', { name: 'Ajustar', exact: true }).click();
    await expect(dialogo.getByText('100%')).toBeVisible();
    expect((await new AxeBuilder({ page }).include('dialog[open]').withRules(['color-contrast', 'button-name', 'image-alt', 'aria-dialog-name']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`visor-${viewport.width}.png`), fullPage: true });
    await page.keyboard.press('Escape'); await expect(dialogo).toHaveCount(0); await expect(abrir).toBeFocused();
    await page.evaluate(() => document.documentElement.setAttribute('data-tema', 'oscuro'));
    await abrir.click(); await expect(dialogo).toHaveCSS('background-color', 'rgb(250, 248, 243)');
    await page.mouse.click(2, 2); await expect(dialogo).toHaveCount(0);
    await page.getByRole('heading', { name: 'Salón parroquial', exact: true }).click();
    await expect(page).toHaveURL(/\/espacios\/1$/);
    await expect(page.getByRole('button', { name: 'Espacios', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Salón parroquial', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ampliar imagen: Fotografía de Salón parroquial' }).click();
    await expect(dialogo.getByRole('img')).toBeVisible();
    await dialogo.getByRole('button', { name: 'Cerrar imagen' }).click(); await expect(dialogo).toHaveCount(0);
  });
}

test('el visor de una edición conserva el formulario y respeta movimiento reducido', async ({ page }) => {
  await preparar(page); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/espacios');
  await page.getByRole('button', { name: 'Editar espacio' }).click();
  await page.getByLabel('Nombre del espacio').fill('Cambios sin guardar');
  await page.getByRole('button', { name: 'Ampliar imagen: Fotografía de Salón parroquial' }).last().click();
  const dialogo = page.getByRole('dialog', { name: 'Imagen ampliada' });
  await expect(dialogo).toHaveCSS('animation-name', 'none');
  await page.keyboard.press('Tab');
  expect(await dialogo.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape'); await expect(dialogo).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Editar espacio' })).toBeVisible();
  await expect(page.getByLabel('Nombre del espacio')).toHaveValue('Cambios sin guardar');
});

test('las fotografías públicas se amplían y los logos conservan su navegación', async ({ page }) => {
  await page.goto('/');
  const foto = page.getByRole('button', { name: 'Ampliar imagen: Vista exterior de la parroquia' });
  await foto.click();
  const dialogo = page.getByRole('dialog', { name: 'Imagen ampliada' });
  await expect(dialogo.getByRole('img', { name: 'Vista exterior de la parroquia' })).toBeVisible();
  await dialogo.getByRole('button', { name: 'Cerrar imagen' }).click(); await expect(dialogo).toHaveCount(0);
  expect(await page.locator('.brand-logo').first().evaluate(el => el.closest('button[aria-haspopup="dialog"]') === null)).toBe(true);
});
