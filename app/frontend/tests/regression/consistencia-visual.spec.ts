import { expect, test, type Page } from '@playwright/test';

const evento = { id: 7, titulo: 'Misa de prueba', descripcion: 'Celebración', encargado_id: 1, nombre_encargado: 'Ana', fecha: '2099-10-20', hora_inicio: '14:00:00', hora_fin: '15:00:00', reserva_id: 4 };

async function preparar(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana López', correo: 'ana@test.com', rol_id: 5 }));
  });
  await page.route('http://api.test/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const data = pathname === '/api/eventos' || pathname === '/api/public/agenda' ? [evento]
      : pathname === '/api/grupos' ? [{ id: 3, nombre: 'Coro', coordinador_id: 1, nombre_coordinador: 'Ana' }]
      : pathname === '/api/personas/coordinadores-grupo' || pathname === '/api/personas/encargados-evento' ? [{ id: 1, nombre: 'Ana' }]
      : [];
    await route.fulfill({ json: data });
  });
}

test('los formularios conservan un único título de tarjeta', async ({ page }) => {
  await preparar(page);
  for (const [ruta, titulo] of [['/reservas', 'Solicitar Reserva'], ['/cambios-turno', 'Solicitar Cambio de Turno'], ['/tareas', 'Crear y asignar tarea'], ['/grupos', 'Crear Nuevo Grupo']]) {
    await page.goto(ruta);
    await expect(page.getByRole('heading', { name: titulo, exact: true })).toHaveCount(1);
  }
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar Grupo', exact: true })).toHaveCount(1);
  await page.goto('/eventos');
  await expect(page.getByRole('cell', { name: '14:00 – 15:00' })).toBeVisible();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar Evento', exact: true })).toHaveCount(1);
});

test('el logo abre el portal sin perder sesión y la barra cabe desde 320px', async ({ page }) => {
  await preparar(page);
  await page.goto('/perfil');
  await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toHaveCount(0);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const enlace = page.getByRole('link', { name: /Ir al sitio público/ });
    await expect(enlace).toBeVisible();
    const limites = await enlace.boundingBox();
    expect(limites!.x).toBeGreaterThanOrEqual(0);
    expect(limites!.x + limites!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(page.getByText('Sitio público', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: /Ir al sitio público/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: /iniciar sesión/i })).toHaveCount(0);
  await page.locator('.nav-login').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/agenda');
  await expect(page.getByText('14:00 – 15:00', { exact: true })).toBeVisible();
  await expect(page.locator('.nav-login')).toHaveText('Ir al panel');
  await page.evaluate(() => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    window.dispatchEvent(new StorageEvent('storage', { key: 'usuario' }));
  });
  await expect(page.locator('.nav-login')).toHaveText('Iniciar sesión');
  await expect(page.locator('.nav-login')).toHaveAttribute('href', '/login');
});

test('el botón 404 usa la paleta compartida y vuelve al panel', async ({ page }) => {
  await preparar(page);
  await page.goto('/ruta-inexistente-p4');
  const volver = page.getByRole('link', { name: 'Volver al dashboard' });
  await expect(volver).toHaveClass(/btn-primary/);
  await expect(volver).toHaveCSS('background-color', 'rgb(157, 47, 56)');
  await volver.click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
