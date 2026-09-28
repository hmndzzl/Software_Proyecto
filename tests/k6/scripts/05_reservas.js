import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, PROFILE, SMOKE, baseOptions, stages } from '../helpers/config.js';
import { json, params } from '../helpers/auth.js';
import { prepareReservations, payload, verifyReservation, cancel, cleanup } from '../helpers/reservas.js';
if (PROFILE !== 'load') throw new Error('Para PE-RES-01 usa 07_reservas_colisiones.js');
export const options = baseOptions('PC-RES-01', { traffic: stages(10, 15) }, ['p(90)<500']);
export function setup() { return prepareReservations(SMOKE ? 1 : 15, SMOKE ? 1 : 15); }
export default function (data) {
  const i = (__VU - 1) % data.users.length;
  const token = data.users[i].token;
  const body = payload(data, data.spaces[i].id, `-vu${__VU}-iter${__ITER}`);
  const res = http.post(`${BASE_URL}/api/reservas`, JSON.stringify(body), params('POST /api/reservas', token, 'measure', 201));
  const id = json(res)?.reservaId;
  check(res, {
    'reserva: HTTP 201': r => r.status === 201,
    'reserva: identificador creado': () => Number.isInteger(id) && id > 0,
  });
  if (Number.isInteger(id) && id > 0) {
    verifyReservation(id, body, token);
    cancel(id, token);
  }
  sleep(1);
}
export function teardown(data) { cleanup(data); }
