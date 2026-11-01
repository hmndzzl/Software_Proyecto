import { expect, test } from '@playwright/test';

const imagen = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
const fotoUrl = '/uploads/perfiles/subidas/00000000-0000-0000-0000-000000000001.webp';
for (const viewport of [{ width: 320, height: 720 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`el perfil se abre desde la cuenta y Configuración y permite cambiar foto a ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      localStorage.setItem('token', 'jwt-de-regresion');
      if (!localStorage.getItem('usuario')) localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Diego Calderon', correo: 'diego@parroquia.com', rol_id: 5 }));
    });
    let foto: string | null = null;
    await page.route('**/uploads/perfiles/**', route => route.fulfill({ contentType: 'image/png', body: imagen }));
    await page.route('http://api.test/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/personas/1/foto') {
        expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=');
        expect(route.request().postDataBuffer()?.toString()).toContain('name="imagen"');
        foto = fotoUrl;
        return route.fulfill({ json: { foto_url: foto } });
      }
      if (url.pathname === '/api/personas/1') return route.fulfill({ json: { telefono: null, foto_url: foto } });
      return route.fulfill({ json: [] });
    });
    await page.goto('/dashboard');
    await expect(page.locator('aside a[href="/perfil"]')).toHaveCount(0);
    await page.locator('header a[href="/perfil"]').click();
    await expect(page.getByRole('heading', { name: 'Mi Perfil', exact: true })).toBeVisible();
    await page.getByLabel('Subir o cambiar foto').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: imagen });
    await expect(page.getByRole('img', { name: 'Vista previa de tu nueva foto' })).toBeVisible();
    await page.getByRole('button', { name: 'Guardar foto', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Tu foto de perfil se actualizó correctamente.');
    const avatar = page.locator('header a[href="/perfil"] img');
    await expect(avatar).toHaveAttribute('src', fotoUrl);
    await page.reload();
    await expect(avatar).toHaveAttribute('src', fotoUrl);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.goto('/configuracion');
    await page.getByRole('link', { name: 'Ir a mi perfil' }).click();
    await expect(page).toHaveURL('/perfil');
  });
}
