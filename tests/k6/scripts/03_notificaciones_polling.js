import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SEED_USERS, getAuthToken, authHeaders } from '../helpers/auth.js';

const notifFailRate = new Rate('notificaciones_failed_rate');
const notifDuration = new Trend('notificaciones_poll_duration_ms', true);

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:3001';

export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Simulación de 20 clientes concurrentes
    { duration: '20s', target: 50 },  // 50 clientes realizando polling activo
    { duration: '15s', target: 100 }, // Rampa a 100 clientes concurrentes
    { duration: '20s', target: 120 }, // Pico extremo de polling (120 clientes en simultáneo)
    { duration: '10s', target: 0 },   // Recuperación y vaciado de colas
  ],
  thresholds: {
    'http_req_failed': ['rate<0.02'],
    'notificaciones_failed_rate': ['rate<0.02'],
    'http_req_duration': ['p(90)<500', 'p(95)<1000'],
  },
};

export function setup() {
  // Autenticamos los diferentes usuarios semilla para simular sesiones heterogéneas
  const tokens = [];
  for (const user of SEED_USERS) {
    const token = getAuthToken(BASE_URL, user.correo, user.password);
    if (token) {
      tokens.push({ email: user.correo, token });
    }
  }

  if (tokens.length === 0) {
    throw new Error('No se pudo autenticar ningún usuario para la prueba de notificaciones');
  }

  return { tokens };
}

export default function (data) {
  // Cada VU asume una sesión de usuario
  const userSession = data.tokens[__VU % data.tokens.length];
  const url = `${BASE_URL}/api/notificaciones`;

  const params = {
    ...authHeaders(userSession.token),
    tags: { name: 'GET_api_notificaciones_polling' },
  };

  const start = Date.now();
  const res = http.get(url, params);
  const duration = Date.now() - start;
  notifDuration.add(duration);

  const success = check(res, {
    'notificaciones: status 200': (r) => r.status === 200,
    'notificaciones: respuesta es array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch (e) {
        return false;
      }
    },
    'notificaciones: tiempo de respuesta < 1200ms': (r) => r.timings.duration < 1200,
  });

  notifFailRate.add(!success);

  // Simulación del intervalo entre sondeos y peticiones activas
  sleep(Math.random() * 0.5 + 0.2);
}
