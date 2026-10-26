import { expect, test } from '@playwright/test';

test('la tarjeta mantiene cien ministros compactos y uniforma sus tres acciones', async ({ page }) => {
  const asignados = Array.from({ length: 100 }, (_, i) => ({ persona_id: i + 9, nombre: `Ministro ${i + 1}` }));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: 5 }));
  });
  await page.route('http://api.test/**', route => route.fulfill({ json: new URL(route.request().url()).pathname === '/api/tareas'
    ? [{ id: 1, titulo: 'Servicio compartido', descripcion: 'Celebración parroquial', fecha: '2099-11-01', hora_inicio: '10:00', hora_fin: '11:00', asignados }] : [] }));
  await page.goto('/tareas');
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tema of ['claro', 'oscuro']) {
      await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
      await page.getByRole('button', { name: 'Servicio compartido', exact: true }).click();
      const tarjeta = page.getByRole('dialog', { name: 'Servicio compartido' });
      const lista = tarjeta.getByRole('list', { name: 'Ministros de la tarea' });
      await expect(lista.getByRole('listitem')).toHaveCount(100);
      const medidas = await lista.evaluate(element => ({ altura: element.clientHeight, total: element.scrollHeight }));
      expect(medidas.altura).toBeLessThanOrEqual(176);
      expect(medidas.total).toBeGreaterThan(medidas.altura);
      const acciones = ['Editar tarea', 'Gestionar ministros', 'Eliminar tarea'].map(name => tarjeta.getByRole('button', { name, exact: true }));
      const fuentes = await Promise.all(acciones.map(boton => boton.evaluate(element => {
        const estilo = getComputedStyle(element);
        return [estilo.fontFamily, estilo.fontSize, estilo.fontWeight, estilo.letterSpacing];
      })));
      expect(fuentes[1]).toEqual(fuentes[0]);
      expect(fuentes[2]).toEqual(fuentes[0]);
      const cajas = await Promise.all(acciones.map(boton => boton.boundingBox()));
      for (const caja of cajas) {
        expect(caja!.height).toBeGreaterThanOrEqual(44);
        expect(caja!.width).toBeCloseTo(cajas[0]!.width, 0);
        expect(caja!.height).toBeCloseTo(cajas[0]!.height, 0);
      }
      await tarjeta.getByLabel('Buscar ministro asignado').fill('Ministro 100');
      await expect(lista.getByRole('listitem')).toHaveCount(1);
      await expect(lista.getByText('Ministro 100', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.keyboard.press('Escape');
    }
  }
});

test('agrupa cinco ministros, abre la tarjeta y pagina dentro de los márgenes compartidos', async ({ page }) => {
  const asignados = ['Ana', 'Luis', 'Marta', 'Pedro', 'Rosa'].map((nombre, i) => ({ persona_id: i + 9, nombre }));
  const tareas = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, titulo: i ? `Servicio ${i + 1}` : 'Tarea compartida',
    descripcion: 'Preparar la celebración con el equipo', fecha: '2099-11-01', hora_inicio: '10:00', hora_fin: '11:00', asignados: i ? [] : asignados }));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: 5 }));
  });
  await page.route('http://api.test/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path === '/api/tareas' ? tareas : path === '/api/personas' ? asignados.map(a => ({ id: a.persona_id, nombre: a.nombre })) : [] });
  });
  await page.goto('/tareas');
  const abrir = page.getByRole('button', { name: 'Tarea compartida', exact: true });
  await expect(abrir).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(11);
  await expect(page.getByRole('button', { name: 'Ver los 5 ministros de Tarea compartida' })).toHaveText('+3 más');
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tema of ['claro', 'oscuro']) {
      await page.evaluate(value => document.documentElement.setAttribute('data-tema', value), tema);
      const margen = await page.locator('.table-container').evaluate(element => {
        const card = element.parentElement!.parentElement!.getBoundingClientRect();
        const tabla = element.getBoundingClientRect();
        return { izquierda: tabla.left - card.left, derecha: card.right - tabla.right };
      });
      expect(margen.izquierda).toBeGreaterThanOrEqual(width === 320 ? 18 : 24);
      expect(margen.derecha).toBeGreaterThanOrEqual(width === 320 ? 18 : 24);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await abrir.focus();
      await page.keyboard.press('Enter');
      const tarjeta = page.getByRole('dialog', { name: 'Tarea compartida', exact: true });
      await expect(tarjeta).toContainText('Preparar la celebración con el equipo');
      await expect(tarjeta.getByRole('listitem')).toHaveCount(5);
      await expect(tarjeta.getByRole('button', { name: 'Gestionar ministros' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(abrir).toBeFocused();
    }
  }
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.getByRole('row')).toHaveCount(3);
  await page.getByRole('region', { name: 'Filtros de tareas' }).getByLabel('Ministro', { exact: true }).selectOption('Marta');
  await expect(page.getByRole('row')).toHaveCount(2);
  await expect(abrir).toBeVisible();
  await abrir.locator('..').locator('..').getByRole('cell').nth(1).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

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
  await expect(page.getByRole('cell', { name: 'Lectura compartida', exact: true })).toHaveCount(1);
  for (const viewport of [{ width: 320, height: 720 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))).toBeLessThanOrEqual(viewport.width + 1);
  }
  await page.getByRole('button', { name: 'Gestionar ministros', exact: true }).click();
  for (let restantes = 2; restantes > 0; restantes--) {
    await page.getByRole('dialog').getByRole('button', { name: /^Quitar a / }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Quitar ministro', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: /^Quitar a / })).toHaveCount(restantes - 1);
  }
  await expect(page.getByRole('cell', { name: 'Sin ministro asignado' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Lectura compartida', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar tarea', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar tarea', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Lectura compartida', exact: true })).toHaveCount(0);
});
