import { sleep } from 'k6';
import { PROFILE, baseOptions, stages } from '../helpers/config.js';
import { sessions } from '../helpers/auth.js';
import { espacios } from '../helpers/requests.js';
const stress = PROFILE === 'stress';
export const options = baseOptions(stress ? 'PE-ESP-01' : 'PC-ESP-01', {
  traffic: stages(stress ? 60 : 15, stress ? 80 : 25),
}, stress ? ['p(95)<5'] : ['avg<5', 'p(95)<50']);
export function setup() { return sessions(1); }
export default function (data) {
  espacios(data[0].token);
  if (!stress) sleep(0.3);
}
