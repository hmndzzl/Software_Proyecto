import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, futureDate } from './config.js';
import { json, login, params, sessions } from './auth.js';

export function prepareReservations(count, spaceCount) {
  const users = sessions(count);
  if (users.length < count || new Set(users.map(s => s.user?.id)).size !== count || users.some(s => ![2, 3].includes(s.user?.rol_id))) {
    throw new Error(`Se necesitan ${count} cuentas de coordinador diferentes. Usa el stack Docker de tests/k6 o USERS_JSON.`);
  }
  const admin = login({
    correo: __ENV.ADMIN_EMAIL || 'hugo@parroquia.com',
    password: __ENV.ADMIN_PASSWORD || 'admin123',
  }, 'setup');
  if (!admin.ok || ![1, 5].includes(admin.user?.rol_id)) throw new Error('Se requiere Admin/Sacerdote para preparar y cancelar reservas de prueba');
  const response = http.get(`${BASE_URL}/api/espacios`, params('GET /api/espacios fixtures', admin.token, 'setup'));
  const all = json(response);
  if (response.status !== 200 || !Array.isArray(all)) throw new Error('No se pudieron consultar los espacios');
  const ids = __ENV.RESERVA_SPACE_IDS ? __ENV.RESERVA_SPACE_IDS.split(',').map(Number) : null;
  const spaces = all.filter(s => ids ? ids.includes(s.id) : s.nombre.startsWith('k6-'));
  if (spaces.length < spaceCount) throw new Error(`Se necesitan ${spaceCount} espacios exclusivos. Usa fixtures Docker o RESERVA_SPACE_IDS.`);
  const date = __ENV.TEST_DATE || futureDate(30);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))
    || new Date(date).toISOString().slice(0, 10) !== date
    || date <= new Date().toISOString().slice(0, 10)) throw new Error('TEST_DATE debe ser una fecha futura válida YYYY-MM-DD');
  const marker = `k6-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  return { users, spaces: spaces.slice(0, spaceCount), admin: admin.token, date, marker, releaseAt: Date.now() + 5000 };
}

export function payload(data, spaceId, suffix = '') {
  return {
    fecha: data.date, hora_inicio: '08:00:00', hora_fin: '09:00:00', espacio_id: spaceId,
    titulo: `${data.marker}${suffix}`, descripcion: `${data.marker}${suffix}`,
  };
}

export function cancel(id, token) {
  const res = http.put(`${BASE_URL}/api/reservas/${id}/estado`, JSON.stringify({ estado_id: 4 }),
    params('PUT /api/reservas/:id/estado cleanup', token, 'cleanup'));
  return check(res, { 'limpieza: reserva cancelada': r => r.status === 200 });
}

export function verifyReservation(id, body, token) {
  const res = http.get(`${BASE_URL}/api/reservas/mis-reservas`, params('GET /api/reservas/mis-reservas verificación', token, 'verify'));
  const rows = json(res);
  const matches = Array.isArray(rows) ? rows.filter(r => r.id === id) : [];
  return check(res, {
    'reserva: lectura posterior HTTP 200': r => r.status === 200,
    'reserva: una fila Pendiente y evento asociado': () => matches.length === 1 && matches[0].estado_reserva_id === 1
      && matches[0].espacio_id === body.espacio_id && matches[0].fecha === body.fecha
      && matches[0].hora_inicio === body.hora_inicio && matches[0].hora_fin === body.hora_fin
      && Number.isInteger(matches[0].evento_id) && matches[0].evento_titulo === body.titulo
      && matches[0].evento_descripcion === body.descripcion,
  });
}

// Auditoría y limpieza por marcador: incluye inserciones cuya respuesta se perdió.
export function cleanup(data, expectedCount) {
  let found = 0;
  for (const space of data.spaces) {
    const res = http.get(`${BASE_URL}/api/reservas?espacio_id=${space.id}`,
      params('GET /api/reservas auditoría', data.admin, 'verify'));
    const rows = json(res);
    if (!check(res, { 'auditoría: listado de reservas': r => r.status === 200 && Array.isArray(rows) })) continue;
    for (const row of rows.filter(r => r.evento_titulo?.startsWith(data.marker))) {
      found++;
      if (row.estado_reserva_id !== 4) cancel(row.id, data.admin);
    }
  }
  if (expectedCount !== undefined) check(found, { 'colisión: exactamente una reserva persistida': n => n === expectedCount });
}
