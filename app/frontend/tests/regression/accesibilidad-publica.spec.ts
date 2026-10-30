import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { ContenidoLanding } from '../../src/api/landing';

const AUDIT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

const contenido: ContenidoLanding = {
  nombre_parroquia: 'Parroquia San Pedro Nolasco', lema: 'Casa de oración',
  titulo_principal: 'Una comunidad viva', descripcion_principal: 'Bienvenidos a nuestra parroquia.',
  quienes_somos: { titulo: 'Quiénes somos', descripcion: 'Nuestra comunidad.', mision: 'Servir.', comunidad: 'Compartir.', servicio: 'Acompañar.' },
  cantidad_grupos: 12, cantidad_espacios: 7,
  valores_encabezado: { titulo: 'Nuestros valores', descripcion: 'Fe y servicio.' },
  valores: [{ titulo: 'Servicio', descripcion: 'Acompañamos a nuestra comunidad.' }],
  horarios_misa: [{ dias: 'Domingo', horas: ['08:00', '11:00'] }],
  horarios_oficina: [{ dias: 'Lunes a viernes', horario: '09:00 – 13:00' }],
  contacto: { titulo: 'Contáctanos', direccion: 'Guatemala', correo: 'contacto@example.com', telefono: '+50255551234' },
  texto_pie: 'Una comunidad de fe al servicio de las familias.',
};

async function preparar(page: Page, estado: 'actividades' | 'vacia' | 'error' = 'actividades') {
  await page.route('http://api.test/**', async route => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/api/public/landing') return route.fulfill({ json: contenido });
    if (pathname === '/api/public/agenda') {
      if (estado === 'error') return route.fulfill({ status: 503, json: { error: 'Servicio no disponible' } });
      return route.fulfill({ json: estado === 'vacia' ? [] : [{
        id: 1, titulo: 'Celebración comunitaria', descripcion: 'Encuentro abierto a toda la comunidad.',
        fecha: '2099-10-26', hora_inicio: '09:00:00', hora_fin: '10:00:00', nombre_espacio: 'Templo parroquial',
      }] });
    }
    return route.fulfill({ json: [] });
  });
}

async function auditar(page: Page, nombre: string) {
  await page.evaluate(() => document.fonts.ready);
  // Las etiquetas WCAG cubren contraste y nombres accesibles; best-practice
  // incluye heading-order, landmark-one-main y region. No se excluyen nodos.
  const resultado = await new AxeBuilder({ page })
    .withTags(AUDIT_TAGS)
    .analyze();
  await test.info().attach(nombre, {
    body: JSON.stringify({ url: resultado.url, violations: resultado.violations, incomplete: resultado.incomplete, passedRules: resultado.passes.map(rule => rule.id) }, null, 2),
    contentType: 'application/json',
  });
  expect(resultado.violations, `${nombre}: revisar el reporte axe adjunto`).toEqual([]);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
}

for (const width of [320, 1440]) {
  test(`el portal conserva ventanas y selección claras con el panel oscuro a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem('tema_aplicacion', 'oscuro'));
    await preparar(page);
    await page.goto('/');
    const titulo = page.getByRole('heading', { name: 'Una comunidad viva' });
    await expect(titulo).toBeVisible();
    const seleccion = await titulo.evaluate(el => ({ color: getComputedStyle(el, '::selection').color, fondo: getComputedStyle(el, '::selection').backgroundColor }));
    expect(seleccion).toEqual({ color: 'rgb(26, 26, 26)', fondo: 'rgb(251, 230, 179)' });
    await page.getByRole('button', { name: /Historia de la Orden Mercedaria/ }).click();
    const historia = page.getByRole('dialog', { name: 'Historia de la Orden Mercedaria' });
    await expect(historia).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect.poll(() => historia.locator('.qmodal p').last().evaluate(el => getComputedStyle(el, '::selection').backgroundColor)).toBe('rgb(251, 230, 179)');
    await historia.locator('.qmodal').evaluate(async el => { await Promise.all(el.getAnimations().map(animation => animation.finished)); });
    expect((await new AxeBuilder({ page }).include('[role="dialog"]').withRules(['color-contrast']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`historia-clara-${width}.png`) });
    await historia.getByRole('button', { name: 'Volver a nuestra historia', exact: true }).click();
    await expect(historia).toHaveCount(0);
    await page.locator('button.oracion').click();
    await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await page.getByRole('button', { name: 'Volver a devoción', exact: true }).click();
    await expect(page.locator('button.oracion')).toBeFocused();
    await page.getByRole('button', { name: 'Ampliar imagen: Vista exterior de la parroquia' }).click();
    const visor = page.getByRole('dialog', { name: 'Imagen ampliada' });
    await expect(visor).toHaveCSS('background-color', 'rgb(250, 248, 243)');
    await expect.poll(() => visor.locator('p').last().evaluate(el => ({ color: getComputedStyle(el, '::selection').color, fondo: getComputedStyle(el, '::selection').backgroundColor }))).toEqual({ color: 'rgb(26, 26, 26)', fondo: 'rgb(251, 230, 179)' });
    await visor.evaluate(async el => { await Promise.all(el.getAnimations().map(animation => animation.finished)); });
    expect((await new AxeBuilder({ page }).include('dialog[open]').withRules(['color-contrast']).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
  });
}

for (const viewport of [{ width: 320, height: 720 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test.describe(`accesibilidad pública a ${viewport.width}px`, () => {
    test.use({ viewport });

    test('auditoría de landing y menú principal', async ({ page }) => {
      await preparar(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(contenido.titulo_principal);
      await auditar(page, 'landing');
      if (viewport.width <= 1380) {
        await page.getByRole('button', { name: 'Menú', exact: true }).click();
        await expect(page.getByRole('navigation', { name: 'Navegación principal', exact: true })).toBeVisible();
        await auditar(page, 'landing-menu-abierto');
      }
    });

    test('auditoría de landing con preferencia oscura del área administrativa y campos adicionales', async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('tema_aplicacion', 'oscuro'));
      await preparar(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(contenido.titulo_principal);
      await page.getByLabel('Motivo', { exact: true }).selectOption('Otro');
      await expect(page.getByLabel('Especifica el motivo', { exact: false })).toBeVisible();
      await auditar(page, 'landing-preferencia-oscura');
    });

    for (const estado of ['actividades', 'vacia', 'error'] as const) {
      test(`auditoría de agenda ${estado}`, async ({ page }) => {
        await preparar(page, estado);
        await page.goto('/agenda');
        if (estado === 'actividades') await expect(page.getByRole('heading', { name: 'Celebración comunitaria' })).toBeVisible();
        if (estado === 'vacia') await expect(page.getByRole('heading', { name: 'Aún no hay actividades publicadas' })).toBeVisible();
        if (estado === 'error') await expect(page.getByRole('alert')).toBeVisible();
        await auditar(page, `agenda-${estado}`);
      });
    }
  });
}

for (const ruta of ['/', '/agenda']) {
  test(`el teclado puede saltar al contenido y continuar desde él en ${ruta}`, async ({ page }) => {
    await preparar(page, 'vacia');
    await page.goto(ruta);
    const salto = page.getByRole('link', { name: 'Saltar al contenido principal' });
    await expect(salto).toBeAttached();
    await page.keyboard.press('Tab');
    await expect(salto).toBeFocused();
    await expect(salto).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.getByRole('main').evaluate(el => el.contains(document.activeElement))).toBe(true);
  });
}

test('la auditoría detecta regresiones de contraste, encabezados y landmarks', async ({ page }) => {
  await preparar(page);
  await page.goto('/agenda');
  await expect(page.getByRole('heading', { name: 'Celebración comunitaria' })).toBeVisible();
  // Control negativo: alteramos únicamente el DOM de esta prueba para comprobar
  // que las cuatro reglas objetivo realmente se ejecutan y detectan los errores.
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('h1')!.style.color = '#dddddd';
    const h2 = document.querySelector('.agenda-card h2')!;
    const h4 = document.createElement('h4');
    h4.textContent = h2.textContent;
    h2.replaceWith(h4);
    const main = document.querySelector('main')!;
    const div = document.createElement('div');
    div.append(...main.childNodes);
    main.replaceWith(div);
    const fuera = document.createElement('p');
    fuera.textContent = 'Contenido sin punto de referencia';
    document.querySelector('.public-portal')!.append(fuera);
  });
  const resultado = await new AxeBuilder({ page }).withTags(AUDIT_TAGS).analyze();
  expect(resultado.violations.map(rule => rule.id)).toEqual(expect.arrayContaining(['color-contrast', 'heading-order', 'landmark-one-main', 'region']));
});

test('el formulario de contacto conserva la accesibilidad al fallar y al confirmar el envío', async ({ page }) => {
  await preparar(page);
  let intentos = 0;
  await page.route('http://api.test/api/contacto', route => route.fulfill({
    status: ++intentos === 1 ? 503 : 201, json: intentos === 1 ? { error: 'Servicio no disponible' } : { id: 1 },
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Nombre', { exact: false }).fill('Visitante de prueba');
  await page.getByLabel('Correo electrónico', { exact: false }).fill('visitante@example.com');
  await page.getByRole('textbox', { name: /^Mensaje/ }).fill('Solicito información sobre las actividades parroquiales.');
  const enviar = page.getByRole('button', { name: 'ENVIAR MENSAJE', exact: true });
  await enviar.click();
  await expect(page.getByRole('alert')).toBeVisible();
  await auditar(page, 'contacto-error');
  await enviar.click();
  await expect(page.getByRole('status')).toHaveText('¡Gracias! Hemos recibido tu mensaje.');
  await auditar(page, 'contacto-confirmado');
});
