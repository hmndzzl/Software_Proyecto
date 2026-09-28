import { sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Trend } from 'k6/metrics';
import { SMOKE, baseOptions } from '../helpers/config.js';
import { journey } from '../helpers/requests.js';

const recovered = new Counter('spike_recovered');
const recoverySeconds = new Trend('spike_recovery_seconds');
let streak = 0;
let recorded = false;
export const options = baseOptions('PE-SPIKE-01', {
  spike: {
    executor: 'ramping-arrival-rate', startRate: 0, timeUnit: '1s',
    preAllocatedVUs: SMOKE ? 2 : 100, maxVUs: SMOKE ? 2 : 100,
    stages: [{ duration: '5s', target: SMOKE ? 1 : 100 }, { duration: SMOKE ? '1s' : '10s', target: SMOKE ? 1 : 100 },
      { duration: '1s', target: 0 }], gracefulStop: '10s',
  },
  recovery: { executor: 'constant-vus', vus: 1, duration: '15s',
    startTime: SMOKE ? '7s' : '16s', exec: 'recovery', gracefulStop: '10s' },
});
options.thresholds.dropped_iterations = ['count==0'];
options.thresholds.spike_recovered = ['count==1'];
options.thresholds.spike_recovery_seconds = ['max<15'];
options.thresholds['journey_success{phase:measure}'] = ['rate==1'];
export default function () { journey(true); }
export function recovery() {
  if (!recorded) recovered.add(0);
  const result = journey(true, 'recovery');
  streak = result.ok && result.duration < 400 ? streak + 1 : 0;
  if (streak >= 3 && !recorded) {
    recorded = true;
    recovered.add(1);
    recoverySeconds.add((Date.now() - exec.scenario.startTime) / 1000);
  }
  sleep(1);
}
