import { expect, test, type Page } from '@playwright/test';

async function comprobarEtiquetas(page: Page) {
  const root = await page.getByRole('dialog').count() ? page.getByRole('dialog').last() : page.locator('body');
  const errores = await root.evaluate(element => {
    const labels = Array.from(element.querySelectorAll('label'));
    const ids = Array.from(document.querySelectorAll('[id]'), element => element.id);
    const controls = Array.from(element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input:not([type="hidden"]), select, textarea'));
    return {
      etiquetasSinCampo: labels.filter(label => !label.control).map(label => label.textContent),
      camposSinNombre: controls.filter(control => !control.labels?.length && !control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby')).map(control => control.outerHTML),
      idsRepetidos: ids.filter((id, index) => ids.indexOf(id) !== index),
      ayudasInexistentes: controls.flatMap(control => (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(id => id && !document.getElementById(id))),
    };
  });
  expect(errores).toEqual({ etiquetasSinCampo: [], camposSinNombre: [], idsRepetidos: [], ayudasInexistentes: [] });
  for (const label of await root.locator('label[for]').all()) {
    const id = await label.getAttribute('for');
    const target = page.locator(`[id="${id}"]`);
    if (await target.isEnabled()) {
      await label.click();
      await expect(target).toBeFocused();
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana López', correo: 'ana@test.com', rol_id: 5 }));
  });
  await page.route('http://api.test/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const data = pathname === '/api/coordinadores-ministros' ? [{ id: 2, nombre: 'Luis', estado_cuenta: 'activa' }]
      : pathname === '/api/personas' ? [{ id: 9, nombre: 'Ana Ministra', correo: 'ministra@test.com', estado_cuenta: 'activa' }]
      : pathname === '/api/notificaciones/destinatarios' ? [{ id: 9, nombre: 'Ana Ministra', rol_nombre: 'Ministros' }]
      : pathname === '/api/eventos' ? [{ id: 8, descripcion: 'Misa', fecha: '2099-11-01', hora_inicio: '10:00', hora_fin: '11:00' }]
      : [];
    await route.fulfill({ json: data });
  });
});

test('los consumidores de Field asocian etiquetas y ayudas en móvil y ambos temas', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  for (const tema of ['claro', 'oscuro']) {
    for (const ruta of ['/espacios', '/notificaciones', '/cuentas', '/ministros/coordinadores']) {
      await page.goto(ruta);
      await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
      if (ruta === '/cuentas') await page.getByRole('button', { name: 'Nueva cuenta', exact: true }).click();
      if (ruta === '/ministros/coordinadores') {
        await page.getByLabel('Coordinador de ministros').selectOption('2');
        await expect(page.getByLabel('Ministro para asignar')).toBeVisible();
      }
      await expect(page.locator('label[for]').first()).toBeVisible();
      await comprobarEtiquetas(page);
      if (ruta === '/notificaciones') {
        await page.getByRole('button', { name: 'Nueva notificación', exact: true }).click();
        await expect(page.getByRole('group', { name: 'Confirmación de asistencia' })).toBeVisible();
        await page.getByLabel('Requiere confirmación de asistencia').check();
        await expect(page.getByLabel('Evento para confirmar asistencia')).toBeVisible();
        await comprobarEtiquetas(page);
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test('la edición y la reasignación de tareas tienen etiquetas independientes', async ({ page }) => {
  await page.route('http://api.test/api/tareas', route => route.fulfill({ json: [{
    id: 1, titulo: 'Preparar altar', descripcion: 'Preparación', fecha: '2099-11-01',
    hora_inicio: '10:00', hora_fin: '11:00', asignados: [{ persona_id: 9, nombre: 'Ana Ministra' }],
  }] }));
  await page.goto('/tareas');
  await page.getByTitle('Cambiar responsable').click();
  await expect(page.getByRole('combobox', { name: 'Responsable de Preparar altar' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  const editor = page.getByRole('heading', { name: 'Editar Tarea #1', exact: true }).locator('..');
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tema of ['claro', 'oscuro']) {
      await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
      for (const nombre of ['Título:', 'Descripción:', 'Fecha:', 'Hora de Inicio:', 'Hora de Fin:']) {
        await editor.getByText(nombre, { exact: true }).click();
        await expect(editor.getByLabel(nombre, { exact: true })).toBeFocused();
        await expect(page.getByLabel(nombre, { exact: true })).toHaveCount(2);
      }
      expect(await page.evaluate(() => {
        const ids = Array.from(document.querySelectorAll('[id]'), element => element.id);
        return new Set(ids).size === ids.length;
      })).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
