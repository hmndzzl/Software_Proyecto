import { expect, test, type Page } from '@playwright/test';

async function preparar(page: Page) {
  const mutaciones: string[] = [];
  let nativos = 0;
  page.on('dialog', async dialog => { nativos++; await dialog.dismiss(); });
  await page.addInitScript(() => {
    localStorage.setItem('token', 'jwt-de-regresion');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Admin', correo: 'admin@test.com', rol_id: 5 }));
  });
  const persona = { id: 9, nombre: 'Ana', correo: 'ana@test.com', disponible: true, estado_cuenta: 'activa' };
  const reserva = { id: 7, espacio_id: 2, espacio_nombre: 'Salón', fecha: '2099-11-01', hora_inicio: '10:00', hora_fin: '11:00',
    estado_reserva_id: 2, solicitante_id: 1, solicitante_nombre: 'Admin', evento_id: 7, evento_titulo: 'Misa mayor', evento_descripcion: 'Celebración', cantidad_personas: 20 };
  await page.route('http://api.test/**', async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() !== 'GET') { mutaciones.push(`${req.method()} ${path}`); await route.fulfill({ json: {} }); return; }
    const data = path === '/api/grupos' ? [{ id: 3, nombre: 'Coro', coordinadores: [{ id: 7, nombre: 'Coordinador' }] }]
      : path === '/api/personas/coordinadores-grupo' || path === '/api/personas/encargados-evento' ? [{ id: 7, nombre: 'Coordinador' }]
      : path === '/api/eventos' ? [{ id: 7, titulo: 'Misa mayor', descripcion: 'Celebración', encargado_id: 7, reserva_id: 7, fecha: '2099-11-01', hora_inicio: '10:00', hora_fin: '11:00' }]
      : path === '/api/reservas' || path === '/api/reservas/mis-reservas' ? [reserva]
      : path === '/api/espacios' ? [{ id: 2, nombre: 'Salón', capacidad: 100 }]
      : path === '/api/personas' || path === '/api/coordinadores-ministros/7/ministros' ? [persona]
      : path === '/api/coordinadores-ministros' ? [{ id: 7, nombre: 'Coordinador', estado_cuenta: 'activa' }]
      : path === '/api/cuentas' ? [{ id: 12, nombre: 'Ana', correo: 'ana@test.com', rol_id: 4, estado_cuenta: 'pendiente' }]
      : path === '/api/notificaciones/papelera' ? [{ id: 9, mensaje: 'Aviso eliminado', fecha: '2099-10-01', tipo: 'individual', eliminada_en: '2099-10-02', leida: true }]
      : path === '/api/tareas' ? [{ id: 1, titulo: 'Lectura', descripcion: 'Preparar la misa', fecha: '2099-11-01', hora_inicio: '10:00', hora_fin: '11:00', asignados: [{ persona_id: 9, nombre: 'Ana' }] }]
      : [];
    await route.fulfill({ json: data });
  });
  return { mutaciones, nativos: () => nativos };
}

const casos = [
  { nombre: 'eventos', ruta: '/eventos', titulo: 'Eliminar evento', accion: 'Eliminar evento', peticion: 'DELETE /api/eventos/7' },
  { nombre: 'grupos', ruta: '/grupos', titulo: 'Eliminar grupo', accion: 'Eliminar grupo', peticion: 'DELETE /api/grupos/3' },
  { nombre: 'mis reservas', ruta: '/mis-reservas', titulo: 'Cancelar reserva', accion: 'Cancelar reserva', peticion: 'PUT /api/reservas/7/estado' },
  { nombre: 'edición de reservas', ruta: '/reservas', titulo: 'Cancelar reserva', accion: 'Cancelar reserva', peticion: 'PUT /api/reservas/7/estado' },
  { nombre: 'papelera', ruta: '/notificaciones', titulo: 'Vaciar papelera', accion: 'Vaciar papelera', peticion: 'DELETE /api/notificaciones/papelera' },
  { nombre: 'cuentas', ruta: '/cuentas', titulo: 'Rechazar cuenta', accion: 'Rechazar cuenta', peticion: 'PATCH /api/cuentas/12/rechazar' },
  { nombre: 'coordinadores', ruta: '/ministros/coordinadores', titulo: 'Quitar ministro del coordinador', accion: 'Confirmar retiro', peticion: 'DELETE /api/coordinadores-ministros/7/ministros/9' },
  { nombre: 'tareas', ruta: '/tareas', titulo: 'Eliminar tarea', accion: 'Eliminar tarea', peticion: 'DELETE /api/tareas/1' },
];

async function abrir(page: Page, caso: typeof casos[number]) {
  await page.goto(caso.ruta);
  if (caso.nombre === 'eventos') {
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  } else if (caso.nombre === 'grupos') {
    await page.getByRole('button', { name: 'Coro', exact: true }).click(); // abre el detalle
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar grupo', exact: true }).click();
  } else if (caso.nombre === 'mis reservas') await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  else if (caso.nombre === 'edición de reservas') {
    await page.getByRole('button', { name: '7', exact: true }).click(); // abre el detalle
    await page.getByRole('button', { name: 'Cancelar reserva', exact: true }).click();
  } else if (caso.nombre === 'papelera') {
    await page.getByRole('button', { name: 'Papelera', exact: true }).click();
    await page.getByRole('button', { name: 'Vaciar papelera', exact: true }).click();
  } else if (caso.nombre === 'cuentas') await page.getByRole('button', { name: 'Rechazar', exact: true }).click();
  else if (caso.nombre === 'coordinadores') {
    await page.getByLabel('Coordinador de ministros', { exact: true }).selectOption('7');
    await page.getByRole('button', { name: 'Quitar a Ana', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'Lectura', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar tarea', exact: true }).click();
  }
}

for (const caso of casos) {
  test(`confirmación propia en ${caso.nombre}: cancelar conserva datos y confirmar ejecuta una petición`, async ({ page }) => {
    const estado = await preparar(page);
    await page.setViewportSize({ width: 375, height: 900 });
    await abrir(page, caso);
    let dialogo = page.getByRole('dialog', { name: caso.titulo, exact: true });
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(dialogo).toHaveAttribute('aria-describedby', /.+/);
    await expect(dialogo.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialogo).toHaveCount(0);
    expect(estado.mutaciones).toEqual([]);
    await abrir(page, caso);
    dialogo = page.getByRole('dialog', { name: caso.titulo, exact: true });
    await dialogo.getByRole('button', { name: caso.accion, exact: true }).click();
    await expect.poll(() => estado.mutaciones).toEqual([caso.peticion]);
    await expect(dialogo).toHaveCount(0);
    expect(estado.nativos()).toBe(0);
  });
}

test('la confirmación bloquea cierres y duplicados mientras espera la respuesta', async ({ page }) => {
  await preparar(page);
  let resolver!: () => void;
  const espera = new Promise<void>(resolve => { resolver = resolve; });
  let solicitudes = 0;
  await page.route('http://api.test/api/grupos/3', async route => {
    solicitudes++; await espera; await route.fulfill({ json: {} });
  });
  try {
    await abrir(page, casos[1]);
    const dialogo = page.getByRole('dialog', { name: 'Eliminar grupo' });
    await dialogo.getByRole('button', { name: 'Eliminar grupo', exact: true }).click();
    await expect(dialogo.getByRole('button', { name: 'Procesando…', exact: true })).toBeDisabled();
    await expect(dialogo.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled();
    await expect(dialogo.getByRole('button', { name: 'Cerrar', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.mouse.click(2, 2);
    await expect(dialogo).toBeVisible();
    expect(solicitudes).toBe(1);
    resolver();
    await expect(dialogo).toHaveCount(0);
  } finally { resolver(); }
});
