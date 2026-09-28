import { sleep } from 'k6';
import { SMOKE, baseOptions, numberEnv } from '../helpers/config.js';
import { journey } from '../helpers/requests.js';
const minutes = numberEnv('SOAK_MINUTES', 30, 30, 45);
export const options = baseOptions('PE-SOAK-01', {
  sustained: { executor: 'constant-vus', vus: SMOKE ? 1 : 25,
    duration: SMOKE ? '5s' : `${minutes}m`, gracefulStop: '15s' },
});
options.thresholds.journey_success = ['rate==1'];
options.thresholds.journeys_completed = ['count>0'];
// Login por ciclo: JWT renovado continuamente, también después de sus 15 min de vigencia.
export default function () { journey(true); sleep(1); }
