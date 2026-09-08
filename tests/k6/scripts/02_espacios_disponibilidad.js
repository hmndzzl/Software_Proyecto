import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { getAuthToken, authHeaders } from '../helpers/auth.js';

const espaciosFailRate = new Rate('espacios_failed_rate');
const espaciosDuration = new Trend('espacios_query_duration_ms', true);

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:3001';

export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Rampa inicial (10 VUs)
    { duration: '20s', target: 25 },  // Carga moderada (25 VUs - excede pool de 10)
    { duration: '15s', target: 60 },  // Rampa de estrés intenso (60 VUs)
    { duration: '20s', target: 80 },  // Pico de saturación de pool MariaDB (80 VUs)
    { duration: '10s', target: 0 },   // Enfriamiento
  ],
  thresholds: {
    'http_req_failed': ['rate<0.02'],
    'espacios_failed_rate': ['rate<0.02'],
    'http_req_duration': ['p(90)<600', 'p(95)<1200'],
  },
};

// Generación de un token Bearer en la fase de setup para todas las iteraciones
export function setup() {
  const token = getAuthToken(BASE_URL);
  if (!token) {
    throw new Error('No se pudo autenticar para la prueba de espacios');
  }
  return { token };
}

// Ventanas horarias y fechas de simulación
const HORARIOS = [
  { inicio: '07:00:00', fin: '09:00:00' },
  { inicio: '09:00:00', fin: '12:00:00' },
  { inicio: '13:00:00', fin: '16:00:00' },
  { inicio: '17:00:00', fin: '19:00:00' },
  { inicio: '19:00:00', fin: '21:00:00' },
];

const FECHAS = [
  '2026-09-10',
  '2026-09-15',
  '2026-09-20',
  '2026-09-25',
  '2026-10-01',
];

export default function (data) {
  const token = data.token;
  const fecha = FECHAS[Math.floor(Math.random() * FECHAS.length)];
  const horario = HORARIOS[Math.floor(Math.random() * HORARIOS.length)];

  const url = `${BASE_URL}/api/espacios?fecha=${fecha}&hora_inicio=${horario.inicio}&hora_fin=${horario.fin}`;
  const params = {
    ...authHeaders(token),
    tags: { name: 'GET_api_espacios_disponibilidad' },
  };

  const start = Date.now();
  const res = http.get(url, params);
  const duration = Date.now() - start;
  espaciosDuration.add(duration);

  const success = check(res, {
    'espacios: status 200': (r) => r.status === 200,
    'espacios: formato JSON válido': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) && body.length > 0;
      } catch (e) {
        return false;
      }
    },
    'espacios: campo disponible evaluado': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.every((item) => typeof item.disponible !== 'undefined');
      } catch (e) {
        return false;
      }
    },
    'espacios: tiempo de respuesta < 1500ms': (r) => r.timings.duration < 1500,
  });

  espaciosFailRate.add(!success);

  // Pacing entre consultas de espacios (simula navegación de usuario)
  sleep(Math.random() * 0.3 + 0.1);
}
