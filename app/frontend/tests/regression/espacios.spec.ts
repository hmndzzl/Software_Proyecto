import { expect, test, type Page } from '@playwright/test';

async function preparar(page: Page, rol = 5) {
  const estado = { nombre: 'Salón parroquial', eliminado: false, creado: false, peticiones: [] as string[] };
  await page.addInitScript(rol_id => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Cuenta de prueba', correo: 'prueba@test.com', rol_id }));
  }, rol);
  await page.route('http://api.test/**', async route => {
    const req = route.request();
    const ruta = new URL(req.url()).pathname;
    if (req.method() !== 'GET') {
      estado.peticiones.push(`${req.method()} ${ruta}`);
      if (req.method() === 'POST') estado.creado = true;
      if (req.method() === 'DELETE') estado.eliminado = true;
      if (req.method() === 'PUT') estado.nombre = 'Salón editado';
      await route.fulfill({ json: {} }); return;
    }
    const espacio = { id: 7, nombre: estado.nombre, capacidad: 40 };
    const reservas = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, titulo: `Actividad ${i + 1}`, solicitante_nombre: `Solicitante ${i + 1}`, fecha: '2099-11-01', hora_inicio: '10:00', hora_fin: '11:00', estado_reserva_id: 2 }));
    await route.fulfill({ json: ruta === '/api/espacios' ? estado.eliminado ? [] : [espacio, ...(estado.creado ? [{ id: 8, nombre: 'Nuevo salón', capacidad: 20 }] : [])]
      : ruta === '/api/espacios/7' ? espacio : ruta.endsWith('/impacto-eliminacion') ? { reservas } : [] });
  });
  return estado;
}

for (const width of [375, 1280]) {
  test(`gestión de espacios y confirmación propia a ${width}px`, async ({ page }) => {
    const estado = await preparar(page);
    await page.setViewportSize({ width, height: 900 });
    let nativos = 0;
    page.on('dialog', async dialog => { nativos++; await dialog.dismiss(); });
    await page.goto('/espacios');
    await page.getByRole('button', { name: 'Crear espacio', exact: true }).click();
    const crear = page.getByRole('dialog', { name: 'Crear espacio', exact: true });
    await expect(crear.getByLabel('Nombre del espacio')).toBeFocused();
    await crear.getByLabel('Nombre del espacio').fill('Otro salón');
    await crear.getByLabel(/Capacidad/).fill('20');
    const selector = page.waitForEvent('filechooser');
    await crear.getByRole('button', { name: 'Seleccionar imagen', exact: true }).click();
    await (await selector).setFiles({ name: 'salon.png', mimeType: 'image/png', buffer: Buffer.from('foto simulada para interfaz') });
    await expect(crear.getByText('salon.png', { exact: true })).toBeVisible();
    await expect(crear.getByAltText('Vista previa de la imagen seleccionada')).toBeVisible();
    await crear.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(estado.peticiones).toEqual([]);
    await page.getByRole('button', { name: 'Editar espacio', exact: true }).click();
    const editar = page.getByRole('dialog', { name: 'Editar espacio', exact: true });
    await expect(editar).toBeVisible();
    expect(await editar.evaluate(el => el.closest('[class*="card"]') === null)).toBe(true);
    const limites = (await editar.boundingBox())!;
    expect(limites.x).toBeGreaterThanOrEqual(0); expect(limites.x + limites.width).toBeLessThanOrEqual(width);
    await editar.getByLabel('Nombre del espacio').fill('Salón editado');
    await editar.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Salón editado' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eliminar espacio', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Editar espacio', exact: true }).click();
    await page.getByRole('dialog', { name: 'Editar espacio', exact: true }).getByRole('button', { name: 'Eliminar espacio', exact: true }).click();
    const confirmar = page.getByRole('dialog', { name: 'Eliminar espacio', exact: true });
    await expect(confirmar.getByText('Reservas afectadas (100)')).toBeVisible();
    await expect(confirmar).toHaveAttribute('aria-describedby', /.+/);
    await expect(confirmar.getByRole('listitem')).toHaveCount(5);
    await confirmar.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(confirmar.getByText('Página 2 de 20')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await confirmar.getByRole('button', { name: 'Cancelar reservas y eliminar espacio', exact: true }).click();
    await expect(page.getByText('No hay espacios registrados.')).toBeVisible();
    expect(estado.peticiones).toEqual(['PUT /api/espacios/7', 'DELETE /api/espacios/7']);
    expect(nativos).toBe(0);
  });
}

test('los coordinadores consultan espacios sin controles de gestión', async ({ page }) => {
  await preparar(page, 2);
  await page.goto('/espacios');
  await expect(page.getByRole('heading', { name: 'Salón parroquial' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear espacio', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Editar espacio', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Eliminar espacio', exact: true })).toHaveCount(0);
});


test('crear refresca el listado aunque la disponibilidad esté a medio completar', async ({ page }) => {
  const estado = await preparar(page);
  await page.goto('/espacios');
  await page.getByLabel('Fecha', { exact: true }).fill('2099-11-01');
  await expect(page.getByText('Completa fecha, hora inicio y hora fin para consultar disponibilidad.')).toBeVisible();
  await page.getByRole('button', { name: 'Crear espacio', exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: 'Crear espacio', exact: true });
  await dialogo.getByLabel('Nombre del espacio').fill('Nuevo salón');
  await dialogo.getByLabel(/Capacidad/).fill('20');
  await dialogo.getByRole('button', { name: 'Crear espacio', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nuevo salón', exact: true })).toBeVisible();
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('');
  expect(estado.peticiones).toEqual(['POST /api/espacios']);
});
