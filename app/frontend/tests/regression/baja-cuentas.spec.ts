import { expect, test } from '@playwright/test';

for (const width of [375, 1280]) {
  test(`la baja de una cuenta activa exige confirmación y conserva su consulta a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('token', 'regresion');
      localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: 5 }));
    });
    let baja = false;
    let peticiones = 0;
    const cuenta = { id: 9, nombre: 'Ana López', correo: 'ana@test.com', rol_id: 4 };
    await page.route('http://api.test/**', async route => {
      const req = route.request();
      const url = new URL(req.url());
      if (req.method() === 'PATCH') {
        expect(url.pathname).toBe('/api/cuentas/9/baja');
        peticiones++;
        baja = true;
        await route.fulfill({ json: { mensaje: 'Cuenta dada de baja' } });
        return;
      }
      const estado = url.searchParams.get('estado');
      const data = url.pathname === '/api/cuentas'
        ? estado === (baja ? 'baja' : 'activa') ? [{ ...cuenta, estado_cuenta: baja ? 'baja' : 'activa' }] : []
        : url.pathname === '/api/cuentas/9/decisiones'
          ? [{ id: 1, resultado: 'baja', actor_id: 1, actor_nombre: 'Admin', fecha: '2026-10-27T14:00:00Z' }] : [];
      await route.fulfill({ json: data });
    });
    await page.goto('/cuentas');
    await page.getByRole('tab', { name: 'Activas', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Rechazar', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    const dialogo = page.getByRole('dialog', { name: 'Eliminar cuenta', exact: true });
    await expect(dialogo).toContainText('Se conservarán sus tareas, reservas e historial');
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(peticiones).toBe(0);
    await expect(page.getByRole('cell', { name: 'ana@test.com' })).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await dialogo.getByRole('button', { name: 'Eliminar cuenta', exact: true }).click();
    await expect(dialogo).toHaveCount(0);
    expect(peticiones).toBe(1);
    await expect(page.getByRole('cell', { name: 'ana@test.com' })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Dadas de baja' }).click();
    await expect(page.getByRole('cell', { name: 'ana@test.com' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Eliminar', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Ver detalle' }).click();
    const detalle = page.getByRole('dialog', { name: 'Detalle de cuenta: Ana López' });
    await expect(detalle.getByText('Dada de baja', { exact: true })).toHaveCount(2);
    await expect(detalle).toContainText('Por Admin');
  });
}
