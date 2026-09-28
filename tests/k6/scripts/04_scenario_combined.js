import { sleep } from 'k6';
import { PROFILE, baseOptions, stages } from '../helpers/config.js';
import { journey } from '../helpers/requests.js';
if (PROFILE !== 'load') throw new Error('PC-E2E-01 usa PROFILE=load; para estrés usa spike o soak');
export const options = baseOptions('PC-E2E-01', { traffic: stages(15, 25) }, ['p(90)<400']);
options.thresholds.journey_success = ['rate==1'];
options.thresholds.journeys_completed = ['count>0'];
export default function () { journey(); sleep(0.3); }
