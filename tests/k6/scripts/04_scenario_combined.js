import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { SEED_USERS, authHeaders } from '../helpers/auth.js';

// Métricas desglosadas por operación
const tLogin = new Trend('journey_login_duration_ms', true);
const tNotif = new Trend('journey_notif_duration_ms', true);
const tEspacios = new Trend('journey_espacios_duration_ms', true);
const completedJourneys = new Counter('journeys_completed_total');

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:3001';

export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Rampa de inicio (10 usuarios completos)
    { duration: '25s', target: 25 },  // Carga sostenida mixta
    { duration: '15s', target: 50 },  // Pico de estrés concurrente mixto
    { duration: '20s', target: 60 },  // Saturación combinada (CPU + DB Pool + Network)
    { duration: '10s', target: 0 },   // Rampa descendente
  ],
  thresholds: {
    'http_req_failed': ['rate<0.03'],
    'journey_login_duration_ms': ['p(90)<1200'],
    'journey_notif_duration_ms': ['p(90)<600'],
    'journey_espacios_duration_ms': ['p(90)<600'],
  },
};

export default function () {
  const user = SEED_USERS[__VU % SEED_USERS.length];
  let token = null;

  // Paso 1: Autenticación (POST /api/auth/login)
  group('01_Auth_Login', () => {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ correo: user.correo, password: user.password }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST_auth_login' } }
    );
    tLogin.add(Date.now() - start);

    const ok = check(res, {
      'login 200': (r) => r.status === 200,
    });

    if (ok) {
      try {
        token = JSON.parse(res.body).token;
      } catch (e) {
        token = null;
      }
    }
  });

  if (!token) {
    sleep(1);
    return;
  }

  const headers = authHeaders(token);

  // Paso 2: Carga de TopBar (GET /api/notificaciones)
  group('02_TopBar_Notificaciones', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/notificaciones`, {
      ...headers,
      tags: { name: 'GET_notificaciones' },
    });
    tNotif.add(Date.now() - start);

    check(res, {
      'notificaciones 200': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 0.5 + 0.2);

  // Paso 3: Consulta de Disponibilidad de Espacios (GET /api/espacios?...)
  group('03_Consulta_Espacios', () => {
    const fecha = '2026-09-15';
    const hora_inicio = '08:00:00';
    const hora_fin = '12:00:00';
    const url = `${BASE_URL}/api/espacios?fecha=${fecha}&hora_inicio=${hora_inicio}&hora_fin=${hora_fin}`;

    const start = Date.now();
    const res = http.get(url, {
      ...headers,
      tags: { name: 'GET_espacios_disponibilidad' },
    });
    tEspacios.add(Date.now() - start);

    check(res, {
      'espacios 200': (r) => r.status === 200,
      'espacios tiene disponibilidad': (r) => {
        try {
          const arr = JSON.parse(r.body);
          return Array.isArray(arr) && arr.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
  });

  sleep(Math.random() * 0.5 + 0.2);

  // Paso 4: Segundo Sondeo de TopBar (Simulación de Polling continuo)
  group('04_TopBar_Polling_Ciclo', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/notificaciones`, {
      ...headers,
      tags: { name: 'GET_notificaciones_polling' },
    });
    tNotif.add(Date.now() - start);

    check(res, {
      'polling notificaciones 200': (r) => r.status === 200,
    });
  });

  completedJourneys.add(1);
  sleep(Math.random() * 0.4 + 0.1);
}
