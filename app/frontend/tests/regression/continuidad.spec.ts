import { expect, test } from '@playwright/test';

test('volver a espacios conserva disponibilidad y posición de la lista', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana', correo: 'ana@test.com', rol_id: 5 }));
  });
  const espacios = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, nombre: `Salón ${i + 1}`, capacidad: 100, disponible: true }));
  await page.route('http://api.test/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path === '/api/espacios' ? espacios : path === '/api/espacios/1' ? espacios[0] : [] });
  });
  await page.goto('/espacios');
  await page.getByLabel('Fecha', { exact: true }).fill('2099-11-01');
  await page.getByLabel('Hora inicio', { exact: true }).fill('10:00');
  await page.getByLabel('Hora fin', { exact: true }).fill('11:00');
  await expect(page.getByRole('article')).toHaveCount(30);
  await page.locator('main').evaluate(el => { el.parentElement!.scrollTop = 600; });
  await expect.poll(() => page.locator('main').evaluate(el => el.parentElement!.scrollTop)).toBe(600);
  await page.waitForTimeout(100);
  await page.goto('/espacios/1');
  await page.getByRole('button', { name: 'Volver a espacios', exact: true }).click();
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2099-11-01');
  await expect(page.getByLabel('Hora inicio', { exact: true })).toHaveValue('10:00');
  await expect.poll(() => page.locator('main').evaluate(el => el.parentElement!.scrollTop)).toBe(600);
});

for (const width of [375, 1440]) {
  test(`los errores de reservas y tareas se muestran junto a los campos a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('token', 'jwt-de-regresion');
      localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana', correo: 'ana@test.com', rol_id: 5 }));
    });
    let envios = 0;
    await page.route('http://api.test/**', route => {
      if (route.request().method() === 'POST') envios++;
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({ json: path === '/api/personas' ? [{ id: 9, nombre: 'Ana Ministra', disponible: true }] : [] });
    });
    for (const [ruta, boton] of [['/reservas?nueva=1', 'Solicitar Reserva'], ['/tareas', 'Crear y asignar tarea']]) {
      await page.goto(ruta);
      await page.getByRole('button', { name: boton, exact: true }).click();
      await expect(page.locator('#titulo')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByText('Escribe un título.', { exact: true })).toBeVisible();
      await page.locator('#titulo').fill('Reunión parroquial');
      await expect(page.locator('#titulo')).toHaveAttribute('aria-invalid', 'false');
      await expect(page.getByText('Escribe un título.', { exact: true })).toHaveCount(0);
      await page.locator('#fecha').scrollIntoViewIfNeeded();
      await page.screenshot({ path: test.info().outputPath(`formulario-${ruta.split('?')[0].slice(1)}-${width}.png`) });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    expect(envios).toBe(0);
  });
}
