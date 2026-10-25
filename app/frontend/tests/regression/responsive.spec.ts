import { expect, test, type Page } from '@playwright/test';
import type { ContenidoLanding } from '../../src/api/landing';

test('el login móvil muestra la presentación y no cubre el área de Clerk', async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Plataforma administrativa para la gestión', { exact: false })).toBeVisible();
    // En CI no hay clave de Clerk: su aviso ocupa la misma tarjeta. Comprobar
    // el hit-test detecta capas que interceptan los toques aunque se vea la UI.
    const panel = page.getByRole('alert');
    await panel.scrollIntoViewIfNeeded();
    await panel.click();
    expect(await panel.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.getByRole('link', { name: 'Parroquia San Pedro Nolasco — Volver al inicio', exact: true }).click();
    await expect(page).toHaveURL('/');
  }
});

const contenido: ContenidoLanding = {
  nombre_parroquia: 'Parroquia San Pedro Nolasco', lema: 'Casa de oración',
  titulo_principal: 'Una comunidad viva', descripcion_principal: 'Bienvenidos a nuestra parroquia.',
  quienes_somos: { titulo: 'Nuestra historia', descripcion: 'Nuestra comunidad.', mision: 'Servir.', comunidad: 'Compartir.', servicio: 'Acompañar.' },
  cantidad_grupos: 12, cantidad_espacios: 7,
  valores_encabezado: { titulo: 'Nuestros valores', descripcion: 'Fe y servicio.' },
  valores: [{ titulo: 'Servicio', descripcion: 'Acompañamos a nuestra comunidad.' }],
  horarios_misa: [{ dias: 'Domingo', horas: ['08:00', '11:00'] }],
  horarios_oficina: [{ dias: 'Lunes a viernes', horario: '09:00 – 13:00' }],
  contacto: { titulo: 'Contáctanos', direccion: 'Guatemala', correo: 'contacto@example.com', telefono: '+50255551234' },
  texto_pie: 'Parroquia San Pedro Nolasco',
};

async function preparar(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Diego Calderon', correo: 'diego@parroquia.com', rol_id: 5 }));
  });
  await page.route('http://api.test/**', async route => {
    const { pathname } = new URL(route.request().url());
    let json: unknown = [];
    if (pathname === '/api/landing' || pathname === '/api/public/landing') json = contenido;
    if (pathname === '/api/calendario') json = { eventos: [], tareas: [] };
    if (pathname === '/api/espacios') json = [{ id: 5, nombre: 'Salón parroquial principal', capacidad: 120, disponible: true }];
    if (pathname === '/api/espacios/5') json = { id: 5, nombre: 'Salón parroquial principal', capacidad: 120, disponible: true };
    if (pathname === '/api/personas/1') json = { telefono: '+50255551234' };
    if (pathname === '/api/personas') json = Array.from({ length: 40 }, (_, index) => ({ id: index + 9, nombre: `Ministro ${index + 1} de la comunidad parroquial con nombre largo` }));
    if (pathname === '/api/notificaciones') json = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1, mensaje: `Se ha aprobado la solicitud para la celebración de nuestra comunidad. ${'Identificador'.repeat(20)}`,
      leida: false, fecha: '2026-10-25T10:00:00', tipo: 'individual', requiere_confirmacion: false,
    }));
    await route.fulfill({ json });
  });
}

for (const viewport of [{ width: 320, height: 720 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
  test(`páginas principales sin desbordamiento a ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await preparar(page);
    const errores: string[] = [];
    page.on('pageerror', error => errores.push(error.message));
    for (const ruta of ['/', '/agenda', '/dashboard', '/ministros', '/ministros/coordinadores', '/tareas', '/reservas', '/grupos', '/espacios', '/espacios/5', '/eventos', '/calendario', '/cambios-turno', '/mis-reservas', '/ausencias', '/notificaciones', '/cuentas', '/perfil', '/configuracion', '/contenido-publico', '/reportes', '/pagina-inexistente']) {
      await page.goto(ruta);
      await expect(page.getByRole('heading', { level: 1 }).first(), ruta).toBeVisible();
      await expect(page.getByText(/^Cargando/), ruta).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)), { message: ruta }).toBeLessThanOrEqual(viewport.width + 1);
      for (const main of await page.locator('main').all()) {
        expect(await main.evaluate(el => el.scrollWidth <= el.clientWidth + 1), ruta).toBe(true);
      }
      // Las tablas pueden desplazarse dentro de su contenedor, no los filtros.
      const fuera = await page.locator('input, select, textarea').evaluateAll(elements => elements.filter(element => {
        if (element.closest('table') || !element.getClientRects().length) return false;
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > innerWidth + 1;
      }).map(element => element.id || element.getAttribute('aria-label') || element.tagName));
      expect(fuera, ruta).toEqual([]);
      if (viewport.width === 320 && ['/', '/agenda', '/dashboard', '/reservas', '/contenido-publico', '/perfil'].includes(ruta)) {
        await page.screenshot({ path: test.info().outputPath(`${ruta.replaceAll('/', '') || 'landing'}.png`), fullPage: true });
      }
    }
    expect(errores).toEqual([]);
  });
}

test('la previsualización móvil muestra mensajes completos y permite desplazarse sin salirse de la pantalla', async ({ page }) => {
  await preparar(page);
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Notificaciones', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Previsualización de notificaciones' });
    await expect(panel.getByRole('button')).toHaveCount(5);
    const bounds = await panel.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(16);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width - 15);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height - 15);
    expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await panel.getByRole('button').first().locator('span').first().evaluate(el => getComputedStyle(el).webkitLineClamp)).toBe('none');
    await page.screenshot({ path: test.info().outputPath(`notificaciones-${viewport.width}.png`) });
    await panel.getByRole('link', { name: 'Ver todas' }).click();
    await expect(page).toHaveURL(/\/notificaciones$/);
  }
});

test('los títulos de contenido no llevan las descripciones editoriales', async ({ page }) => {
  await preparar(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/contenido-publico');
  await expect(page.getByRole('heading', { name: 'Horarios', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Contacto', exact: true })).toBeVisible();
  await expect(page.getByText('Cada lista se reemplaza completa al guardarla', { exact: false })).toHaveCount(0);
  await expect(page.locator('[class*="headHint"]')).toHaveCount(0);
});

test('el selector de ministros limita su panel y permite elegir opciones al final de una lista larga', async ({ page }) => {
  await preparar(page);
  for (const viewport of [{ width: 320, height: 568 }, { width: 768, height: 1024 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/calendario');
    const select = page.getByLabel('Ver horario de un ministro');
    await expect(select.locator('option')).toHaveCount(41);
    await select.click();
    const first = select.getByRole('option').first();
    const rect = await first.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(viewport.width);
    expect(await select.evaluate(el => parseFloat(getComputedStyle(el, '::picker(select)').maxHeight))).toBeLessThanOrEqual(Math.min(320, viewport.height / 2));
    await page.screenshot({ path: test.info().outputPath(`selector-${viewport.width}.png`) });
    const last = select.getByRole('option').last();
    await last.scrollIntoViewIfNeeded();
    await last.click();
    await expect(select).toHaveValue('48');
    await expect(page.getByRole('status')).toHaveText('Horario de Ministro 40 de la comunidad parroquial con nombre largo');
  }
});
