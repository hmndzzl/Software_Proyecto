import { sleep } from 'k6';
import { PROFILE, SMOKE, baseOptions, stages } from '../helpers/config.js';
import { login, USERS } from '../helpers/auth.js';

const stress = PROFILE === 'stress';
export const options = baseOptions(stress ? 'PE-AUTH-01' : 'PC-AUTH-01', {
  traffic: stages(stress ? 35 : 10, stress ? 50 : 15),
  ...(!SMOKE && stress ? { recovery: { executor: 'constant-vus', vus: 1, duration: '20s', startTime: '225s', exec: 'recovery' } } : {}),
}, [stress ? 'p(95)<3000' : 'p(90)<800']);
if (stress && !SMOKE) {
  options.thresholds['http_req_duration{phase:recovery}'] = ['p(90)<800'];
  options.thresholds['http_reqs{phase:recovery}'] = ['count>0'];
}
export default function () {
  login(USERS[(__VU - 1) % USERS.length]);
  if (!stress) sleep(0.3);
}
export function recovery() {
  login(USERS[0], 'recovery');
  sleep(1);
}
