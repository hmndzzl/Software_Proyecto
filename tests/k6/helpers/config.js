export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
export const PROFILE = __ENV.PROFILE || 'load';
if (!['load', 'stress'].includes(PROFILE)) throw new Error('PROFILE debe ser load o stress');
export const SMOKE = __ENV.SMOKE === 'true';

export function numberEnv(name, fallback, min = 0, max = Infinity) {
  const value = __ENV[name] === undefined ? fallback : Number(__ENV[name]);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} debe estar entre ${min} y ${max}`);
  }
  return value;
}

export function futureDate(days = 7) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function baseOptions(id, scenarios, latency = []) {
  return {
    tags: { test_id: id, profile: PROFILE, smoke: String(SMOKE) },
    scenarios,
    setupTimeout: '3m',
    teardownTimeout: '1m',
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
    thresholds: {
      'http_req_failed{phase:measure}': ['rate==0'],
      checks: ['rate==1'],
      'http_reqs{phase:measure}': ['count>0'],
      ...(latency.length ? { 'http_req_duration{phase:measure}': latency } : {}),
    },
  };
}

// Las mesetas miden cada extremo del intervalo indicado en las tablas.
export function stages(low, high, hold = '1m') {
  if (SMOKE) return { executor: 'per-vu-iterations', vus: 1, iterations: 1, maxDuration: '30s' };
  return {
    executor: 'ramping-vus', startVUs: 0, gracefulRampDown: '65s', gracefulStop: '65s',
    stages: [
      { duration: '15s', target: low }, { duration: hold, target: low },
      { duration: '15s', target: high }, { duration: hold, target: high },
      { duration: '10s', target: 0 },
    ],
  };
}
