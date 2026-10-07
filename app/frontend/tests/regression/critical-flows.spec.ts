import { expect, test, type Page, type Route } from '@playwright/test';

const admin = { id: 1, nombre: 'Diego Calderon', correo: 'diego@parroquia.com', rol_id: 5 };
const ministro = { id: 9, nombre: 'Ministro Test', correo: 'ministro@parroquia.com', rol_id: 4 };

async function authenticate(page: Page, usuario = admin) {
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify(user));
  }, usuario);
}

async function mockApi(page: Page, handler?: (route: Route, url: URL) => Promise<boolean>) {
  await page.route('http://api.test/**', async (route) => {
    const url = new URL(route.request().url());
    if (handler && await handler(route, url)) return;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

test('el acceso válido conserva la sesión y abre el dashboard', async ({ page }) => {
  await mockApi(page, async (route, url) => {
    if (url.pathname !== '/api/auth/login') return false;
    expect(route.request().postDataJSON()).toEqual({
      correo: 'diego@parroquia.com',
      password: 'admin123',
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'jwt-de-regresion', usuario: admin, mensaje: 'Inicio de sesión exitoso' }),
    });
    return true;
  });

  await page.goto('/login');
  await page.locator('input[type="email"]').fill('diego@parroquia.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Bienvenido, Diego' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('jwt-de-regresion');
});

test('un ministro no puede abrir la administración de cuentas', async ({ page }) => {
  await authenticate(page, ministro);
  await mockApi(page);

  await page.goto('/cuentas');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Cuentas' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Bienvenido, Ministro' })).toBeVisible();
});

test('una solicitud de reserva válida envía todos los datos y confirma el resultado', async ({ page }) => {
  await authenticate(page);
  let reserva: Record<string, unknown> | undefined;
  await mockApi(page, async (route, url) => {
    if (route.request().method() === 'GET' && url.pathname === '/api/espacios') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 2, nombre: 'Salón Parroquial', capacidad: 150 }]),
      });
      return true;
    }
    if (route.request().method() === 'POST' && url.pathname === '/api/reservas') {
      reserva = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{"reservaId":99}' });
      return true;
    }
    return false;
  });

  await page.goto('/reservas?nueva=1');
  await page.locator('#espacio_id').selectOption('2');
  await page.locator('#fecha').fill('2099-10-20');
  await page.locator('#hora_inicio').fill('14:00');
  await page.locator('#hora_fin').fill('15:00');
  await page.locator('#titulo').fill('Reunión parroquial');
  await page.locator('#descripcion').fill('Planificación mensual');
  await page.getByRole('button', { name: 'Solicitar Reserva' }).click();

  await expect(page.getByText('Solicitud enviada')).toBeVisible();
  expect(reserva).toEqual({
    fecha: '2099-10-20',
    hora_inicio: '14:00',
    hora_fin: '15:00',
    espacio_id: 2,
    titulo: 'Reunión parroquial',
    descripcion: 'Planificación mensual',
  });
});
