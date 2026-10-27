import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const tema of ['claro', 'oscuro']) {
  test(`los estados comparten el estilo y mantienen contraste en tema ${tema}`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'jwt-de-regresion');
      localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: 5 }));
    });
    await page.route('http://api.test/**', async route => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({ json: path === '/api/espacios' ? [
        { id: 1, nombre: 'Salón parroquial', capacidad: 60, disponible: true },
        { id: 2, nombre: 'Capilla', capacidad: 80, disponible: false, en_uso: true },
      ] : path === '/api/reservas/mis-reservas' ? [1, 2, 3, 4].map(estado => ({
        id: estado, espacio_id: 1, espacio_nombre: 'Salón parroquial', fecha: '2099-11-01', hora_inicio: '10:00', hora_fin: '11:00',
        estado_reserva_id: estado, solicitante_id: 1, evento_titulo: `Actividad ${estado}`, evento_descripcion: 'Celebración',
      })) : [] });
    });
    await page.goto('/espacios');
    await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
    for (const texto of ['Disponible', 'Ocupado', 'En uso ahora']) {
      const badge = page.getByText(texto, { exact: true });
      await expect(badge).toHaveCSS('border-radius', '4px');
      await expect(badge).toHaveCSS('border-top-width', '1px');
      expect(await badge.evaluate(el => ({ width: getComputedStyle(el, '::before').width, height: getComputedStyle(el, '::before').height })))
        .toEqual({ width: '2px', height: '12px' });
    }
    const selector = 'span[class*="_badge_"]';
    expect((await new AxeBuilder({ page }).include(selector).withRules(['color-contrast']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`estados-${tema}.png`), fullPage: true });
    await page.goto('/mis-reservas');
    await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
    for (const texto of ['Pendiente', 'Confirmada', 'Rechazada', 'Cancelada']) {
      await expect(page.locator(selector).filter({ hasText: new RegExp(`^${texto}$`) })).toHaveCSS('border-radius', '4px');
    }
    expect((await new AxeBuilder({ page }).include(selector).withRules(['color-contrast']).analyze()).violations).toEqual([]);
  });
}
