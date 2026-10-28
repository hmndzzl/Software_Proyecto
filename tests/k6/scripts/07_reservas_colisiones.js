import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, baseOptions, numberEnv } from '../helpers/config.js';
import { json, params } from '../helpers/auth.js';
import { prepareReservations, payload, cleanup } from '../helpers/reservas.js';

const vus = numberEnv('COLLISION_VUS', 40, 30, 40);
if (!Number.isInteger(vus)) throw new Error('COLLISION_VUS debe ser entero');
const accepted = new Counter('reservas_accepted');
const rejected = new Counter('reservas_rejected');
const dispatchDelay = new Trend('collision_dispatch_delay_ms', true);
export const options = baseOptions('PE-RES-01', {
  collision: { executor: 'per-vu-iterations', vus, iterations: 1, maxDuration: '30s' },
});
// Se permiten solicitudes Pendientes superpuestas. La colisión debe resolverse
// cuando varios aprobadores intentan confirmar el mismo salón y horario.
options.thresholds.reservas_accepted = ['count==1'];
options.thresholds.reservas_rejected = [`count==${vus - 1}`];
options.thresholds['http_reqs{phase:measure}'] = [`count==${vus * 2}`];
// Una barrera temporal no garantiza simultaneidad física; falla si hay deriva >250ms.
options.thresholds.collision_dispatch_delay_ms = ['max<250'];
export function setup() { return prepareReservations(vus, 1); }
export default function (data) {
  const token = data.users[__VU - 1].token;
  const body = JSON.stringify(payload(data, data.spaces[0].id));
  sleep(Math.max(0, (data.releaseAt - Date.now()) / 1000));
  const creada = http.post(`${BASE_URL}/api/reservas`, body,
    params('POST /api/reservas solicitudes superpuestas', token, 'measure', 201));
  const id = json(creada)?.reservaId;
  check(creada, {
    'colisión: solicitud Pendiente creada': r => r.status === 201 && Number.isInteger(id) && id > 0,
  });
  if (!Number.isInteger(id) || id <= 0) return;

  const approveAt = data.releaseAt + 2000;
  sleep(Math.max(0, (approveAt - Date.now()) / 1000));
  dispatchDelay.add(Math.max(0, Date.now() - approveAt));
  const requestParams = params('PUT /api/reservas/:id/estado aprobación concurrente', data.admin);
  requestParams.responseCallback = http.expectedStatuses(200, 400);
  const res = http.put(`${BASE_URL}/api/reservas/${id}/estado`,
    JSON.stringify({ estado_id: 2 }), requestParams);
  accepted.add(res.status === 200 ? 1 : 0);
  rejected.add(res.status === 400 ? 1 : 0);
  check(res, {
    'colisión: aprobación o conflicto': r => r.status === 200 || r.status === 400,
    'colisión: rechazo explica ocupación': r => r.status === 200
      || /ocupad|reserva.*(existe|aprobada)|conflicto|no.*disponible/i.test(json(r)?.message || ''),
  });
}
export function teardown(data) {
  const res = http.get(`${BASE_URL}/api/reservas?espacio_id=${data.spaces[0].id}`,
    params('GET /api/reservas auditoría de colisión', data.admin, 'verify'));
  const rows = json(res);
  const propias = Array.isArray(rows) ? rows.filter(r => r.evento_titulo?.startsWith(data.marker)) : [];
  check(res, {
    'colisión: todas las solicitudes persisten': r => r.status === 200 && propias.length === vus,
    'colisión: exactamente una confirmada': () => propias.filter(r => r.estado_reserva_id === 2).length === 1,
  });
  cleanup(data, vus);
}
