import { expect, test } from '@playwright/test';

test('las contraseñas se muestran y ocultan en móvil y escritorio con ambos temas', async ({ page }) => {
  let escrituras = 0;
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana López', correo: 'ana@test.com', rol_id: 5 }));
  });
  await page.route('http://api.test/**', async route => {
    if (route.request().method() !== 'GET') escrituras++;
    const pathname = new URL(route.request().url()).pathname;
    await route.fulfill({ json: pathname === '/api/personas/1' ? { telefono: null } : [] });
  });

  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tema of ['claro', 'oscuro']) {
      await page.goto('/perfil');
      await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
      const nueva = page.getByLabel('Nueva contraseña', { exact: true });
      const confirmar = page.getByLabel('Confirmar contraseña', { exact: true });
      await nueva.fill('Clave-Segura-1');
      await confirmar.fill('Clave-Segura-1');
      await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).first().click();
      await expect(nueva).toHaveAttribute('type', 'text');
      await expect(confirmar).toHaveAttribute('type', 'password');
      const ocultar = page.getByRole('button', { name: 'Ocultar contraseña', exact: true });
      await ocultar.focus();
      await page.keyboard.press('Enter');
      await expect(nueva).toHaveAttribute('type', 'password');

      await page.goto('/cuentas');
      await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
      await page.getByRole('button', { name: 'Nueva cuenta', exact: true }).click();
      const inicial = page.getByLabel('Contraseña inicial', { exact: true });
      await inicial.fill('Clave-Segura-1');
      const mostrar = page.getByRole('button', { name: 'Mostrar contraseña', exact: true });
      const limites = await mostrar.boundingBox();
      expect(limites!.width).toBeGreaterThanOrEqual(44);
      expect(limites!.height).toBeGreaterThanOrEqual(44);
      expect(limites!.x).toBeGreaterThanOrEqual(0);
      expect(limites!.x + limites!.width).toBeLessThanOrEqual(width);
      await mostrar.click();
      await expect(inicial).toHaveAttribute('type', 'text');
      await expect(inicial).toHaveValue('Clave-Segura-1');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await page.getByRole('button', { name: 'Nueva cuenta', exact: true }).click();
      await expect(inicial).toHaveAttribute('type', 'password');
      await expect(inicial).toHaveValue('');
    }
  }
  expect(escrituras).toBe(0);
});
