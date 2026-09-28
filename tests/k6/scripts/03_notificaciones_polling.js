import { sleep } from 'k6';
import { PROFILE, SMOKE, baseOptions, stages } from '../helpers/config.js';
import { sessions } from '../helpers/auth.js';
import { notificaciones } from '../helpers/requests.js';
const stress = PROFILE === 'stress';
export const options = baseOptions(stress ? 'PE-NOTIF-01' : 'PC-NOTIF-01', {
  traffic: stages(stress ? 100 : 30, stress ? 120 : 50, stress ? '1m' : '2m'),
}, [stress ? 'p(95)<10' : 'p(95)<15']);
export function setup() { return sessions(SMOKE ? 1 : stress ? 120 : 50); }
export default function (data) {
  const start = Date.now();
  notificaciones(data[(__VU - 1) % data.length].token);
  // Cadencia entre inicios de solicitudes; estrés ejecuta sondeos sin pausa.
  if (!SMOKE && !stress) sleep(Math.max(0, 60 - (Date.now() - start) / 1000));
}
