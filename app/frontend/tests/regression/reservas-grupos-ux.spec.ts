import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [375, 1440]) {
  for (const tema of ['claro', 'oscuro']) {
    test(`grupos: carga, reintento, creación y edición a ${width}px en ${tema}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => {
        localStorage.setItem('token', 'jwt-de-regresion');
        localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana', correo: 'ana@test.com', rol_id: 5 }));
      });
      let fallar = true;
      const grupos = [{ id: 3, nombre: 'Coro', coordinadores: [{ id: 3, nombre: 'Marta' }] }];
      const envios: unknown[] = [];
      await page.route('http://api.test/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/personas/coordinadores-grupo') {
          await route.fulfill(fallar ? { status: 503, json: { mensaje: 'Temporalmente no disponible' } } : { json: [{ id: 1, nombre: 'Ana' }, { id: 2, nombre: 'Luis' }, { id: 3, nombre: 'Marta' }] });
          return;
        }
        if (['POST', 'PUT'].includes(route.request().method()) && path.startsWith('/api/grupos')) {
          envios.push(route.request().postDataJSON());
          await route.fulfill({ json: {} });
          return;
        }
        await route.fulfill({ json: path === '/api/grupos' ? grupos : [] });
      });
      await page.goto('/grupos');
      await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
      await expect(page.getByRole('alert')).toContainText('No se pudieron cargar los coordinadores');
      await expect(page.getByRole('button', { name: 'Crear Grupo', exact: true })).toBeDisabled();
      fallar = false;
      await page.getByRole('button', { name: 'Reintentar' }).click();
      await page.getByLabel('Nombre del Grupo:', { exact: true }).fill('Coro juvenil');
      await page.getByRole('checkbox', { name: 'Ana', exact: true }).check();
      await page.getByLabel('Buscar coordinador').fill('Luis');
      await page.getByRole('checkbox', { name: 'Luis', exact: true }).check();
      await expect(page.getByText('2 coordinadores seleccionados.')).toBeVisible();
      await page.getByRole('button', { name: 'Crear Grupo', exact: true }).click();
      await expect(page.getByText('Grupo creado', { exact: true })).toBeVisible();
      expect(envios[0]).toEqual({ nombre: 'Coro juvenil', coordinador_ids: [1, 2] });
      await page.getByRole('button', { name: 'Editar', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('checkbox', { name: 'Marta', exact: true })).toBeChecked();
      await dialog.getByLabel('Nombre del Grupo:', { exact: true }).fill('Coro parroquial');
      await expect.poll(async () => (await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`grupos-${width}-${tema}.png`) });
      await dialog.getByRole('button', { name: 'Guardar Cambios' }).click();
      await expect(dialog).toHaveCount(0);
      expect(envios[1]).toEqual({ nombre: 'Coro parroquial', coordinador_ids: [3] });
    });
  }
}

test('reservas: un fallo del catálogo permite recuperar el flujo y guardar sin perder datos', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana', correo: 'ana@test.com', rol_id: 5 }));
  });
  let fallar = true;
  let fallarDisponibilidad = true;
  let liberar!: () => void;
  const pendiente = new Promise<void>(resolve => { liberar = resolve; });
  let envios = 0;
  await page.route('http://api.test/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/espacios') {
      await route.fulfill(fallar ? { status: 503, json: {} } : { json: [{ id: 2, nombre: 'Salón', capacidad: 100 }] });
      return;
    }
    if (path === '/api/reservas' && new URL(route.request().url()).searchParams.has('espacio_id')) {
      await route.fulfill(fallarDisponibilidad ? { status: 503, json: {} } : { json: [] });
      return;
    }
    if (route.request().method() === 'POST') {
      envios++;
      await pendiente;
      await route.fulfill({ json: { reservaId: 99 } });
      return;
    }
    await route.fulfill({ json: [] });
  });
  await page.goto('/reservas');
  await page.locator('#titulo').fill('Ensayo del coro');
  await expect(page.getByRole('alert')).toContainText('No se pudieron cargar los espacios');
  fallar = false;
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await page.getByRole('button', { name: /^Salón, capacidad/ }).click();
  await expect(page.locator('#titulo')).toHaveValue('Ensayo del coro');
  await page.getByLabel('Cantidad de personas esperadas').fill('30');
  await page.locator('#fecha').fill('2099-10-20');
  await page.locator('#hora_inicio').fill('14:00');
  await page.locator('#hora_fin').fill('15:00');
  await page.locator('#descripcion').fill('Ensayo semanal');
  await expect(page.getByText(/No se pudo comprobar la disponibilidad/)).toBeVisible();
  await expect(page.getByText('Horario disponible para este espacio.')).toHaveCount(0);
  fallarDisponibilidad = false;
  await page.getByRole('button', { name: 'Reintentar disponibilidad' }).click();
  await expect(page.getByText('Horario disponible para este espacio.')).toBeVisible();
  await page.getByRole('button', { name: 'Solicitar Reserva', exact: true }).click();
  await expect(page.locator('#titulo')).toBeDisabled();
  await expect(page.getByRole('button', { name: /^Salón, capacidad/ })).toHaveAttribute('aria-disabled', 'true');
  liberar();
  await expect(page.getByText('Solicitud enviada', { exact: true })).toBeVisible();
  await expect(page.locator('#titulo')).toBeEnabled();
  expect(envios).toBe(1);
});

test('cuentas: las cuatro pestañas son legibles y accesibles desde 320px', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana', correo: 'ana@test.com', rol_id: 5 }));
  });
  await page.route('http://api.test/**', route => route.fulfill({ json: [] }));
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/cuentas');
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(4);
    const boxes = await tabs.evaluateAll(elements => elements.map(el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, fits: el.scrollWidth <= el.clientWidth };
    }));
    expect(boxes.every(b => b.height >= 44 && b.fits)).toBe(true);
    expect(boxes[0].y).toBe(boxes[1].y);
    expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
    expect(boxes[0].x + boxes[0].width).toBeLessThan(boxes[1].x);
    for (const name of ['Activas', 'Rechazadas', 'Dadas de baja', 'Pendientes']) {
      await page.getByRole('tab', { name, exact: true }).click();
      await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`cuentas-${width}.png`) });
  }
});
