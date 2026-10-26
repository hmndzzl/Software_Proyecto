import { expect, test } from '@playwright/test';

test('el encabezado usa CardHead y permite seleccionar entre 100 ministros sin desbordar', async ({ page }) => {
  const ministros = Array.from({ length: 100 }, (_, i) => ({ id: 100 + i, nombre: `Ministro ${String(i + 1).padStart(2, '0')}`, disponible: true }));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: 5 }));
  });
  await page.route('http://api.test/**', route => route.fulfill({ json: new URL(route.request().url()).pathname === '/api/personas' ? ministros : [] }));
  await page.goto('/tareas');
  const lista = page.getByRole('group', { name: 'Ministros disponibles' });
  await expect(lista).toBeHidden();
  await page.getByLabel('Buscar ministro', { exact: true }).focus();
  await expect(lista.getByRole('checkbox')).toHaveCount(100);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByLabel('Buscar ministro', { exact: true }).focus();
    for (const tema of ['claro', 'oscuro']) {
      await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
      const titulo = page.getByRole('heading', { name: 'Asignaciones Actuales', exact: true });
      const estilos = await titulo.evaluate(element => {
        const head = element.parentElement!.parentElement!;
        return { margen: parseFloat(getComputedStyle(head).paddingLeft), familia: getComputedStyle(element).fontFamily,
          esperada: getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() };
      });
      expect(estilos.margen).toBeGreaterThanOrEqual(18);
      expect(estilos.familia.replace(/["']/g, '')).toBe(estilos.esperada.replace(/["']/g, ''));
      const medidas = await lista.evaluate(element => ({ altura: element.clientHeight, total: element.scrollHeight }));
      expect(medidas.altura).toBeLessThanOrEqual(288);
      expect(medidas.total).toBeGreaterThan(medidas.altura);
      await lista.getByRole('checkbox', { name: 'Ministro 40' }).check();
      await expect(lista.getByRole('checkbox', { name: 'Ministro 40' })).toBeChecked();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.getByLabel('Buscar ministro', { exact: true }).fill('ministro 01');
  await expect(lista.getByRole('checkbox')).toHaveCount(1);
  await lista.getByRole('checkbox', { name: 'Ministro 01' }).check();
  await page.getByLabel('Buscar ministro', { exact: true }).fill('');
  await expect(lista.getByRole('checkbox', { name: 'Ministro 40' })).toBeChecked();
  await expect(lista.getByRole('checkbox', { name: 'Ministro 01' })).toBeChecked();
  await page.getByRole('button', { name: 'Ver seleccionados', exact: true }).click();
  await expect(lista.getByRole('checkbox')).toHaveCount(2);
  await lista.getByRole('checkbox', { name: 'Ministro 40' }).click();
  await expect(page.getByText('1 ministro seleccionado.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(lista).toBeHidden();
  await expect(page.getByRole('button', { name: 'Mostrar opciones de ministros' })).toBeFocused();
});

test('crea una tarea con varios ministros, quita asignaciones y elimina la tarea en una vista responsive', async ({ page }) => {
  const ministros = [{ id: 9, nombre: 'Ana Ministra', disponible: true }, { id: 10, nombre: 'Luis Ministro', disponible: true }];
  type Tarea = { id: number; titulo: string; descripcion: string; fecha: string; hora_inicio: string; hora_fin: string; asignados: { persona_id: number; nombre: string }[] };
  let tareas: Tarea[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Diego Calderon', correo: 'diego@parroquia.com', rol_id: 5 }));
  });
  await page.route('http://api.test/**', async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === '/api/personas') {
      await route.fulfill({ json: ministros });
    } else if (url.pathname === '/api/tareas' && method === 'GET') {
      await route.fulfill({ json: tareas });
    } else if (url.pathname === '/api/tareas' && method === 'POST') {
      const { persona_ids, ...datos } = route.request().postDataJSON() as Omit<Tarea, 'id' | 'asignados'> & { persona_ids: number[] };
      tareas = [{ ...datos, id: 1, asignados: ministros.filter(m => persona_ids.includes(m.id)).map(m => ({ persona_id: m.id, nombre: m.nombre })) }];
      await route.fulfill({ status: 201, json: { tarea: tareas[0] } });
    } else if (url.pathname === '/api/tareas/asignar' && method === 'DELETE') {
      const datos = route.request().postDataJSON() as { persona_id: number };
      tareas[0].asignados = tareas[0].asignados.filter(a => a.persona_id !== datos.persona_id);
      await route.fulfill({ status: 204 });
    } else if (url.pathname === '/api/tareas/1' && method === 'DELETE') {
      tareas = [];
      await route.fulfill({ status: 204 });
    } else await route.fulfill({ json: [] });
  });

  await page.goto('/tareas');
  await expect(page.getByLabel('Título:', { exact: true })).toBeVisible();
  for (const viewport of [{ width: 320, height: 720 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))).toBeLessThanOrEqual(viewport.width + 1);
  }
  await page.getByLabel('Título:', { exact: true }).fill('Lectura compartida');
  await page.getByLabel('Descripción:', { exact: true }).fill('Preparar la celebración');
  await page.getByLabel('Fecha:', { exact: true }).fill('2099-11-01');
  await page.getByLabel('Hora de Inicio:', { exact: true }).fill('14:00');
  await page.getByLabel('Hora de Fin:', { exact: true }).fill('15:00');
  await page.getByLabel('Buscar ministro', { exact: true }).focus();
  await page.getByRole('checkbox', { name: 'Ana Ministra' }).check();
  await page.getByRole('checkbox', { name: 'Luis Ministro' }).check();
  await page.getByRole('button', { name: 'Crear y asignar tarea', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Lectura compartida', exact: true })).toHaveCount(2);
  for (const viewport of [{ width: 320, height: 720 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))).toBeLessThanOrEqual(viewport.width + 1);
  }
  for (let restantes = 2; restantes > 0; restantes--) {
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Quitar ministro de esta tarea', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Quitar ministro de esta tarea', exact: true })).toHaveCount(restantes - 1);
  }
  await expect(page.getByRole('cell', { name: 'Sin ministro asignado' })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Eliminar tarea', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Lectura compartida', exact: true })).toHaveCount(0);
});
