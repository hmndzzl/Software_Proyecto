import { expect, test } from '@playwright/test';

for (const width of [375, 1280]) {
  test(`crea un evento desde gestión sin duplicar su reserva a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('token', 'regresion');
      localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: 5 }));
    });
    let creado = false;
    const envios: object[] = [];
    await page.route('http://api.test/**', async route => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      if (req.method() === 'POST') {
        expect(path).toBe('/api/reservas');
        envios.push(req.postDataJSON());
        creado = true;
        await route.fulfill({ json: { reservaId: 30 } });
        return;
      }
      const data = path === '/api/espacios' ? [{ id: 2, nombre: 'Salón', capacidad: 80 }]
        : path === '/api/eventos' && creado ? [{ id: 30, titulo: 'Encuentro parroquial', descripcion: 'Actividad de la comunidad',
          encargado_id: 1, nombre_encargado: 'Admin', reserva_id: 30, fecha: '2099-12-12', hora_inicio: '09:00', hora_fin: '10:00', nombre_espacio: 'Salón' }] : [];
      await route.fulfill({ json: data });
    });
    await page.goto('/eventos');
    await page.getByRole('button', { name: 'Nuevo evento' }).click();
    let modal = page.getByRole('dialog', { name: 'Crear evento' });
    await modal.getByRole('button', { name: 'Cerrar' }).click();
    expect(envios).toHaveLength(0);
    await page.getByRole('button', { name: 'Nuevo evento' }).click();
    modal = page.getByRole('dialog', { name: 'Crear evento' });
    await modal.getByRole('button', { name: /^Salón, capacidad/ }).click();
    await modal.getByLabel(/Cantidad de personas esperadas/).fill('30');
    await modal.getByLabel('Fecha:', { exact: true }).fill('2099-12-12');
    await modal.getByLabel('Hora de Inicio:', { exact: true }).fill('09:00');
    await modal.getByLabel('Hora de Fin:', { exact: true }).fill('10:00');
    await modal.getByLabel('Título del Evento:', { exact: true }).fill('Encuentro parroquial');
    await modal.getByLabel('Descripción del Evento:', { exact: true }).fill('Actividad de la comunidad');
    const overflow = await modal.evaluate(el => el.scrollWidth > el.clientWidth);
    expect(overflow).toBe(false);
    await modal.getByRole('button', { name: 'Crear evento', exact: true }).click();
    await expect(modal).toHaveCount(0);
    expect(envios).toEqual([{ fecha: '2099-12-12', hora_inicio: '09:00', hora_fin: '10:00', espacio_id: 2,
      titulo: 'Encuentro parroquial', descripcion: 'Actividad de la comunidad', cantidad_personas: 30, publico: false }]);
    await expect(page.getByRole('status')).toContainText('Evento creado');
    await expect(page.getByRole('status')).toContainText('pendiente de aprobación');
    await expect(page.getByRole('cell', { name: 'Actividad de la comunidad', exact: true })).toBeVisible();
  });
}
