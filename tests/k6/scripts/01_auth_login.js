import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SEED_USERS } from '../helpers/auth.js';

// Métricas personalizadas
const loginFailRate = new Rate('login_failed_rate');
const loginDuration = new Trend('login_duration_ms', true);

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:3001';

export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Calentamiento / Línea base (5 VUs)
    { duration: '20s', target: 15 },  // Carga normal esperada (15 VUs)
    { duration: '15s', target: 35 },  // Rampa de estrés (35 VUs)
    { duration: '20s', target: 50 },  // Pico de estrés extremo CPU Bcrypt (50 VUs)
    { duration: '10s', target: 0 },   // Rampa de descenso / Recuperación
  ],
  thresholds: {
    'http_req_failed': ['rate<0.02'],              // Menos de 2% de fallos
    'login_failed_rate': ['rate<0.02'],
    'http_req_duration': ['p(90)<1200', 'p(95)<2000'], // Bcrypt genera latencia bajo concurrencia
  },
};

export default function () {
  // Rotación pseudo-aleatoria entre los usuarios registrados para variedad
  const user = SEED_USERS[Math.floor(Math.random() * SEED_USERS.length)];

  const url = `${BASE_URL}/api/auth/login`;
  const payload = JSON.stringify({
    correo: user.correo,
    password: user.password,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST_api_auth_login' },
  };

  const start = Date.now();
  const res = http.post(url, payload, params);
  const duration = Date.now() - start;
  loginDuration.add(duration);

  const success = check(res, {
    'login: status 200': (r) => r.status === 200,
    'login: devuelve token JWT': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token && body.token.length > 20;
      } catch (e) {
        return false;
      }
    },
    'login: tiempo de respuesta < 2500ms': (r) => r.timings.duration < 2500,
  });

  loginFailRate.add(!success);

  // Pausa realista entre intentos de 100ms a 500ms
  sleep(Math.random() * 0.4 + 0.1);
}
