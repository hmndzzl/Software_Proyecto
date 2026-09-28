import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { BASE_URL, futureDate } from './config.js';
import { json, login, params, USERS } from './auth.js';

const completed = new Counter('journeys_completed');
const journeySuccess = new Rate('journey_success');
const journeyDuration = new Trend('journey_duration_ms', true);

export function espacios(token, phase = 'measure') {
  const date = __ENV.TEST_DATE || futureDate(7 + (__VU % 5));
  const start = 7 + (__VU % 10);
  const query = `fecha=${date}&hora_inicio=${String(start).padStart(2, '0')}:00:00&hora_fin=${String(start + 1).padStart(2, '0')}:00:00`;
  const res = http.get(`${BASE_URL}/api/espacios?${query}`, params('GET /api/espacios disponibilidad', token, phase));
  const body = json(res);
  return check(res, {
    'espacios: HTTP 200': r => r.status === 200,
    'espacios: listado con disponibilidad': () => Array.isArray(body) && body.length > 0
      && body.every(e => Number.isInteger(e.id) && typeof e.disponible === 'boolean'),
  });
}

export function notificaciones(token, phase = 'measure') {
  const res = http.get(`${BASE_URL}/api/notificaciones`, params('GET /api/notificaciones', token, phase));
  const body = json(res);
  return check(res, {
    'notificaciones: HTTP 200': r => r.status === 200,
    'notificaciones: listado válido': () => Array.isArray(body)
      && body.every(n => Number.isInteger(n.id) && typeof n.mensaje === 'string'),
  });
}

export function calendario(token, phase = 'measure') {
  // La vista mensual filtra en el cliente: la API no admite filtros de mes.
  const res = http.get(`${BASE_URL}/api/eventos`, params('GET /api/eventos', token, phase));
  const body = json(res);
  return check(res, {
    'calendario: HTTP 200': r => r.status === 200,
    'calendario: eventos y relaciones': () => Array.isArray(body) && body.length > 0
      && body.every(e => Number.isInteger(e.reserva_id) && Number.isInteger(e.encargado_id)
        && typeof e.nombre_encargado === 'string' && 'nombre_espacio' in e && typeof e.fecha === 'string'),
  });
}

export function journey(includeCalendar = false, phase = 'measure') {
  const start = Date.now();
  const session = login(USERS[(__VU - 1) % USERS.length], phase);
  let ok = session.ok;
  if (session.token) {
    ok = notificaciones(session.token, phase) && ok;
    ok = espacios(session.token, phase) && ok;
    if (includeCalendar) ok = calendario(session.token, phase) && ok;
  }
  const duration = Date.now() - start;
  journeySuccess.add(ok, { phase });
  journeyDuration.add(duration, { phase });
  if (ok) completed.add(1, { phase });
  return { ok, duration };
}
