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
options.thresholds.reservas_accepted = ['count==1'];
options.thresholds.reservas_rejected = [`count==${vus - 1}`];
options.thresholds['http_reqs{phase:measure}'] = [`count==${vus}`];
// Una barrera temporal no garantiza simultaneidad física; falla si hay deriva >250ms.
options.thresholds.collision_dispatch_delay_ms = ['max<250'];
export function setup() { return prepareReservations(vus, 1); }
export default function (data) {
  const token = data.users[__VU - 1].token;
  const body = JSON.stringify(payload(data, data.spaces[0].id));
  sleep(Math.max(0, (data.releaseAt - Date.now()) / 1000));
  dispatchDelay.add(Math.max(0, Date.now() - data.releaseAt));
  const requestParams = params('POST /api/reservas colisión', token);
  requestParams.responseCallback = http.expectedStatuses(201, 400);
  const res = http.post(`${BASE_URL}/api/reservas`, body, requestParams);
  accepted.add(res.status === 201 ? 1 : 0);
  rejected.add(res.status === 400 ? 1 : 0);
  check(res, {
    'colisión: 201 o rechazo 400': r => r.status === 201 || r.status === 400,
    'colisión: aceptación con ID o rechazo por ocupación': r => r.status === 201
      ? Number.isInteger(json(r)?.reservaId)
      : /ocupad|reserva.*(existe|aprobada)|conflicto|no.*disponible/i.test(json(r)?.message || ''),
  });
}
export function teardown(data) { cleanup(data, 1); }
