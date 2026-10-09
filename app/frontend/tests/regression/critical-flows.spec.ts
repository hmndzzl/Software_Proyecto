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

// El login ahora es solo con Clerk (el formulario de correo/contraseña se eliminó),
// y Clerk no se puede ejercitar sin red ni clave. Por eso la regresión del acceso se
// divide en: sesión válida abre el dashboard, y sin sesión se redirige al login.
test('una sesión válida conserva el acceso y abre el dashboard', async ({ page }) => {
  await authenticate(page);
  await mockApi(page);

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Bienvenido, Diego' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('jwt-de-regresion');
});

test('sin sesión se redirige al login y no se ofrece el formulario heredado', async ({ page }) => {
  await mockApi(page);

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Hola, de nuevo' })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('un ministro no puede abrir la administración de cuentas', async ({ page }) => {
  await authenticate(page, ministro);
  await mockApi(page);

  await page.goto('/cuentas');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Cuentas' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Bienvenido, Ministro' })).toBeVisible();
});

// DT-10: el estado de autenticación vive en un solo lugar, así que las rutas protegidas
// reaccionan en vivo cuando la sesión cambia en otra pestaña (evento storage).
test('si la sesión se cierra en otra pestaña, la ruta protegida redirige al login sin recargar', async ({ page }) => {
  await authenticate(page);
  await mockApi(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Bienvenido, Diego' })).toBeVisible();

  await page.evaluate(() => {
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
  });

  await expect(page).toHaveURL(/\/login$/);
});

test('si el rol cambia mientras se navega, la ruta protegida pierde el acceso', async ({ page }) => {
  await authenticate(page);
  await mockApi(page);
  await page.goto('/cuentas');
  await expect(page).toHaveURL(/\/cuentas$/);

  await page.evaluate((user) => {
    localStorage.setItem('usuario', JSON.stringify(user));
    window.dispatchEvent(new StorageEvent('storage', { key: 'usuario' }));
  }, ministro);

  await expect(page).toHaveURL(/\/dashboard$/);
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
