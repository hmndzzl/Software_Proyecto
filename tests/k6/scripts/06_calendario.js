import { sleep } from 'k6';
import { PROFILE, baseOptions, stages } from '../helpers/config.js';
import { sessions } from '../helpers/auth.js';
import { calendario } from '../helpers/requests.js';
if (PROFILE !== 'load') throw new Error('PC-CAL-01 usa PROFILE=load');
export const options = baseOptions('PC-CAL-01', { traffic: stages(20, 30) }, ['max<150']);
export function setup() { return sessions(1); }
export default function (data) { calendario(data[0].token); sleep(0.3); }
