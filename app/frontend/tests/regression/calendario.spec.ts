import { expect, test } from '@playwright/test';

test('consulta semana y mes, filtra por ministro y conserva legibilidad en móvil', async ({ page }) => {
  const tarea = { id: 1, titulo: 'Preparar altar', descripcion: 'Preparación de la celebración', fecha: '2026-10-05', hora_inicio: '09:30', hora_fin: '10:00', evento_id: 8, asignados: [{ persona_id: 9, nombre: 'Ana Ministra' }, { persona_id: 10, nombre: 'Luis Ministro' }] };
  const evento = { id: 8, titulo: 'Misa del lunes', descripcion: 'Celebración', fecha: '2026-10-05', hora_inicio: '10:00', hora_fin: '11:00', encargado_id: 1, nombre_encargado: 'Padre Pedro', nombre_espacio: 'Templo', estado_reserva_id: 2, tareas: [tarea] };
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Diego Calderon', correo: 'diego@parroquia.com', rol_id: 5 }));
  });
  await page.clock.setFixedTime(new Date('2026-10-05T08:00:00'));
  await page.route('http://api.test/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/calendario') await route.fulfill({ json: { eventos: [evento], tareas: [tarea] } });
    else if (url.pathname === '/api/personas') await route.fulfill({ json: [{ id: 9, nombre: 'Ana Ministra' }] });
    else await route.fulfill({ json: [] });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/calendario');
  await expect(page.getByText('Preparar altar', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Ana Ministra, Luis Ministro')).toBeVisible();
  const filtrado = page.waitForRequest(req => new URL(req.url()).searchParams.get('persona_id') === '9');
  await page.getByLabel('Ver horario de un ministro').selectOption('9');
  await filtrado;
  await expect(page.getByRole('status')).toHaveText('Horario de Ana Ministra');
  const abrir = page.getByRole('button', { name: 'Ver detalle del evento Misa del lunes' });
  for (const tema of ['claro', 'oscuro']) {
    await page.evaluate(tema => document.documentElement.setAttribute('data-tema', tema), tema);
    for (const control of [page.getByRole('button', { name: 'Semana', exact: true }), page.getByRole('button', { name: 'Hoy', exact: true }), abrir]) {
      const contraste = await control.evaluate(el => {
        const estilo = getComputedStyle(el);
        const luminancia = (color: string) => {
          const canales = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
          return canales[0] * 0.2126 + canales[1] * 0.7152 + canales[2] * 0.0722;
        };
        const valores = [luminancia(estilo.color), luminancia(estilo.backgroundColor)].sort((a, b) => a - b);
        return (valores[1] + 0.05) / (valores[0] + 0.05);
      });
      expect(contraste).toBeGreaterThanOrEqual(4.5);
      expect(await control.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    }
  }
  await page.evaluate(() => document.documentElement.setAttribute('data-tema', 'claro'));
  await abrir.click();
  await expect(page.getByRole('dialog', { name: 'Misa del lunes' })).toContainText('Horario de servicio: 09:30 – 10:00');
  await page.keyboard.press('Escape');
  await expect(abrir).toBeFocused();
  await page.getByRole('button', { name: 'Mes', exact: true }).click();
  await page.getByRole('table').getByRole('cell', { name: /lunes.*5 de octubre.*1 compromiso/ })
    .getByRole('button', { name: /Ver todos los compromisos/ }).click();
  await expect(page.getByRole('region', { name: /Compromisos del lunes/ }).getByText('Preparar altar')).toBeVisible();
  for (const viewport of [{ width: 320, height: 720 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('region', { name: 'Agenda de octubre de 2026' }).getByText('Preparar altar')).toBeVisible();
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))).toBeLessThanOrEqual(viewport.width + 1);
  }
});
