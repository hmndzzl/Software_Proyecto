import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from './config.js';

export const SEED_USERS = [
  { correo: 'hugo@parroquia.com', password: 'admin123' },
  { correo: 'sacerdote@parroquia.com', password: 'password123' },
  { correo: 'coord.min@parroquia.com', password: 'password123' },
  { correo: 'coord.grupos@parroquia.com', password: 'password123' },
  { correo: 'ministro@parroquia.com', password: 'password123' },
];
export const USERS = __ENV.USERS_JSON ? JSON.parse(__ENV.USERS_JSON)
  : __ENV.K6_FIXTURES === 'true'
    ? Array.from({ length: 120 }, (_, i) => ({ correo: `k6.user.${i + 1}@example.test`, password: 'password123' }))
    : SEED_USERS;
if (!Array.isArray(USERS) || !USERS.length || USERS.some(u => !u.correo || !u.password)) {
  throw new Error('USERS_JSON debe ser un array no vacío de {correo,password}');
}
export const DEFAULT_USER = USERS[0];

export function json(response) {
  try { return response.json(); } catch (_) { return null; }
}

export function params(name, token, phase = 'measure', status = 200) {
  return {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    tags: { name, phase }, timeout: '10s', redirects: 0,
    responseCallback: http.expectedStatuses(status),
  };
}

export function login(user = DEFAULT_USER, phase = 'measure') {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(user), params('POST /api/auth/login', null, phase));
  const body = json(res);
  const ok = check(res, {
    'login: HTTP 200': r => r.status === 200,
    'login: token JWT': () => typeof body?.token === 'string' && body.token.split('.').length === 3,
  });
  return { ok, token: ok ? body.token : null, response: res, user: body?.usuario };
}

export function sessions(count = USERS.length) {
  return USERS.slice(0, count).map(user => {
    const session = login(user, 'setup');
    if (!session.ok) throw new Error(`Login de preparación falló (HTTP ${session.response.status}). Verifica credenciales y límite por IP.`);
    return { token: session.token, user: session.user };
  });
}

// Compatibilidad con los helpers anteriores.
export function getAuthToken(baseUrl, correo = DEFAULT_USER.correo, password = DEFAULT_USER.password) {
  if (baseUrl !== BASE_URL) throw new Error('Configura BASE_URL para todos los helpers');
  return login({ correo, password }, 'setup').token;
}
export function authHeaders(token) { return { headers: params('', token).headers }; }
