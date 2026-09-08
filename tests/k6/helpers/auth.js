import http from 'k6/http';
import { check } from 'k6';

export const DEFAULT_USER = {
  correo: 'hugo@parroquia.com',
  password: 'admin123',
};

export const SEED_USERS = [
  { correo: 'hugo@parroquia.com', password: 'admin123', rol: 'Admin' },
  { correo: 'diego@parroquia.com', password: 'admin123', rol: 'Admin' },
  { correo: 'sacerdote@parroquia.com', password: 'password123', rol: 'Sacerdote' },
  { correo: 'coord.min@parroquia.com', password: 'password123', rol: 'CoordMinistros' },
  { correo: 'ministro@parroquia.com', password: 'password123', rol: 'Ministro' },
];

/**
 * Realiza login contra POST /api/auth/login y retorna el token JWT
 */
export function getAuthToken(baseUrl, correo = DEFAULT_USER.correo, password = DEFAULT_USER.password) {
  const url = `${baseUrl}/api/auth/login`;
  const payload = JSON.stringify({ correo, password });
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'POST_auth_login' },
  };

  const res = http.post(url, payload, params);

  const ok = check(res, {
    'login: status es 200': (r) => r.status === 200,
    'login: retorna token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token && body.token.length > 10;
      } catch (e) {
        return false;
      }
    },
  });

  if (!ok) {
    console.error(`Fallo de login para ${correo}: status ${res.status} body: ${res.body}`);
    return null;
  }

  const json = JSON.parse(res.body);
  return json.token;
}

/**
 * Retorna headers estándar con Bearer token
 */
export function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}
