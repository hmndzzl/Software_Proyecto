import { expect, test } from '@playwright/test';

test('la edición y reapertura de reservas conserva el diseño en móvil y escritorio', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana', correo: 'ana@test.com', rol_id: 5 }));
  });
  await page.route('http://api.test/**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = path === '/api/espacios' ? [{ id: 2, nombre: 'Salón parroquial', capacidad: 80 }]
      : path === '/api/reservas' ? [{ id: 7, espacio_id: 2, espacio_nombre: 'Salón parroquial', fecha: '2099-10-20', hora_inicio: '14:00:00', hora_fin: '15:00:00', estado_reserva_id: 4, solicitante_id: 1, solicitante_nombre: 'Ana', evento_titulo: 'Ensayo del coro', evento_descripcion: 'Ensayo semanal', cantidad_personas: 25 }]
      : [];
    return route.fulfill({ json: data });
  });

  for (const width of [320, 1440]) {
    for (const tema of ['claro', 'oscuro']) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/reservas');
      await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
      await page.getByRole('button', { name: '7', exact: true }).click();
      await page.getByRole('button', { name: 'Editar', exact: true }).click();
      const dialogo = page.getByRole('dialog', { name: 'Editar Reserva #7' });
      await expect(dialogo.getByRole('button', { name: 'Reabrir solicitud' })).toBeVisible();
      await expect(dialogo.getByRole('button', { name: 'Guardar cambios' })).toBeVisible();
      expect(await dialogo.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`editar-reserva-${width}-${tema}.png`) });
    }
  }
});
