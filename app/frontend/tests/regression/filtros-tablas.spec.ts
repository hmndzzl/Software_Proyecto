import { expect, test, type Page } from '@playwright/test';

async function preparar(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Diego Calderon', correo: 'diego@parroquia.com', rol_id: 5 }));
  });
  await page.route('http://api.test/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/reservas') {
      await route.fulfill({ json: [
        { id: 2, fecha: '2099-10-24', hora_inicio: '09:00:00', hora_fin: '10:00:00', espacio_id: 1, espacio_nombre: 'Templo', estado_reserva_id: 2, solicitante_id: 1, solicitante_nombre: 'Diego', evento_titulo: 'Celebración Ágape', evento_descripcion: 'Celebración parroquial' },
        { id: 10, fecha: '2099-10-25', hora_inicio: '11:00:00', hora_fin: '12:00:00', espacio_id: 2, espacio_nombre: 'Salón', estado_reserva_id: 1, solicitante_id: 1, solicitante_nombre: 'Ana', evento_titulo: 'Reunión Juvenil', evento_descripcion: 'Encuentro' },
      ] });
    } else if (url.pathname === '/api/cuentas') {
      await route.fulfill({ json: ['Ana López', 'Zoe Pérez'].map((nombre, i) => ({ id: i + 9, nombre, correo: `cuenta${i}@test.com`, rol_id: i ? 5 : 4, estado_cuenta: url.searchParams.get('estado') })) });
    } else await route.fulfill({ json: [] });
  });
}

test('combina filtros reales de reserva y ordena en móvil, tableta y escritorio', async ({ page }) => {
  await preparar(page);
  await page.goto('/reservas');
  const filtros = page.getByRole('region', { name: 'Filtros de reservas' });
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(3);
  for (const viewport of [{ width: 320, height: 720 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await filtros.getByLabel('Buscar', { exact: true }).fill('AGAPE');
    await filtros.getByLabel('Estado', { exact: true }).selectOption('Confirmada');
    await filtros.getByLabel('Espacio', { exact: true }).selectOption('Templo');
    await filtros.getByLabel('Desde', { exact: true }).fill('2099-10-24');
    await filtros.getByLabel('Hasta', { exact: true }).fill('2099-10-24');
    await expect(table.getByRole('row')).toHaveCount(2);
    await expect(table.getByRole('cell', { name: 'Celebración Ágape', exact: true })).toBeVisible();
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))).toBeLessThanOrEqual(viewport.width + 1);
    await filtros.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(table.getByRole('row')).toHaveCount(3);
  }
  const id = table.getByRole('columnheader', { name: '#', exact: true });
  await id.getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect(id).toHaveAttribute('aria-sort', 'descending');
  await expect(table.locator('tbody tr').first().locator('td').first()).toHaveText('10');
  await page.keyboard.press('Space');
  await expect(id).toHaveAttribute('aria-sort', 'ascending');
  await expect(table.locator('tbody tr').first().locator('td').first()).toHaveText('2');
  await filtros.getByLabel('Buscar', { exact: true }).fill('no existe');
  await expect(filtros.getByText('No hay resultados para los filtros seleccionados.')).toBeVisible();
  await expect(filtros.getByRole('button', { name: 'Limpiar filtros' })).toBeEnabled();
});

test('ordena y busca en cuentas pendientes, activas y rechazadas', async ({ page }) => {
  await preparar(page);
  await page.goto('/cuentas');
  for (const tab of ['Pendientes', 'Activas', 'Rechazadas']) {
    await page.getByRole('tab', { name: tab }).click();
    const table = page.getByRole('table');
    await expect(table.getByRole('row')).toHaveCount(3);
    const header = table.getByRole('columnheader', { name: 'Nombre', exact: true });
    await header.click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    await expect(table.locator('tbody tr').first()).toContainText('Zoe Pérez');
    await header.click();
    await expect(table.locator('tbody tr').first()).toContainText('Ana López');
    await header.click();
    const filtros = page.getByRole('region', { name: 'Filtros de cuentas' });
    await filtros.getByLabel('Buscar').fill('LOPEZ');
    await expect(table.getByRole('row')).toHaveCount(2);
    await filtros.getByRole('button', { name: 'Limpiar filtros' }).click();
  }
});
