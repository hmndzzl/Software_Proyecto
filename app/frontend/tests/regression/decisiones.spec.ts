import { expect, test, type Page } from '@playwright/test';

const reserva = { id: 7, fecha: '2099-10-20', hora_inicio: '14:00:00', hora_fin: '15:00:00', espacio_id: 2, espacio_nombre: 'Salón', solicitante_id: 1, solicitante_nombre: 'Ana', evento_titulo: 'Reunión', evento_descripcion: 'Celebración', cantidad_personas: 20, estado_reserva_id: 2 };
const decisiones = [
  { id: 2, resultado: 'aprobada', actor_id: 1, actor_nombre: 'Diego Calderon', fecha: '2026-10-25T14:05:06.123000Z' },
  { id: 1, resultado: 'rechazada', actor_id: 6, actor_nombre: 'Padre Luis', fecha: '2026-10-24T16:00:00.000000Z' },
  { id: 0, resultado: 'pendiente', actor_id: 7, actor_nombre: 'Coordinador', fecha: '2026-10-24T14:00:00.000000Z' },
];

async function preparar(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana', correo: 'ana@test.com', rol_id: 5 }));
  });
  await page.route('http://api.test/**', async route => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname.endsWith('/decisiones')) data = decisiones;
    else if (url.pathname === '/api/reservas' || url.pathname === '/api/reservas/mis-reservas') data = [reserva];
    else if (url.pathname === '/api/cuentas') data = [{ id: 9, nombre: 'Ministro de prueba', correo: 'ministro@test.com', rol_id: 4, estado_cuenta: url.searchParams.get('estado') }];
    await route.fulfill({ json: data });
  });
}

test('reservas y mis reservas muestran autores y horas de Guatemala sin desbordarse', async ({ page }) => {
  await preparar(page);
  for (const ruta of ['/reservas', '/mis-reservas']) {
    await page.goto(ruta);
    const abrir = page.getByRole('button', { name: 'Ver detalle', exact: true });
    await abrir.click();
    const dialog = page.getByRole('dialog', { name: 'Detalle de reserva #7' });
    await expect(dialog.getByText('Por Diego Calderon', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Por Padre Luis', { exact: true })).toBeVisible();
    const fechaDecision = dialog.locator('time').first();
    await expect(fechaDecision).toHaveText('25 de octubre de 2026 · 08:05');
    await expect(fechaDecision).toHaveAttribute('datetime', decisiones[0].fecha);
    await expect(dialog.getByText(/Fechas y horas de Guatemala/)).toHaveCount(0);
    await expect(dialog.getByText('Aprobada', { exact: true })).toHaveCSS('color', 'rgb(47, 122, 77)');
    await expect(dialog.getByText('Devuelta a pendiente', { exact: true })).toHaveCSS('color', 'rgb(164, 116, 3)');
    await expect(dialog.getByText('Rechazada', { exact: true })).toHaveCSS('color', 'rgb(157, 47, 47)');
    await expect(dialog.getByText('20', { exact: true })).toBeVisible();
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(dialog).toBeVisible();
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(abrir).toBeFocused();
  }
});

test('cuentas permite consultar el historial en todas las pestañas y distingue errores de ausencia de datos', async ({ page }) => {
  await preparar(page);
  await page.goto('/cuentas');
  for (const pestana of ['Pendientes', 'Activas', 'Rechazadas']) {
    await page.getByRole('tab', { name: pestana, exact: true }).click();
    await page.getByRole('button', { name: 'Ver detalle', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Detalle de cuenta: Ministro de prueba' });
    await expect(dialog.getByText('Por Diego Calderon')).toBeVisible();
    await expect(dialog.getByText('Por Padre Luis')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
  }
  let falla = true;
  await page.route('http://api.test/api/cuentas/9/decisiones', route => route.fulfill(falla ? { status: 500, json: { mensaje: 'Error' } } : { json: [] }));
  await page.getByRole('button', { name: 'Ver detalle', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('No se pudo cargar el historial de decisiones.')).toBeVisible();
  await expect(dialog.getByText(/No hay decisiones registradas/)).toHaveCount(0);
  falla = false;
  await dialog.getByRole('button', { name: /Reintentar/i }).click();
  await expect(dialog.getByText(/No hay decisiones registradas/)).toBeVisible();
});
