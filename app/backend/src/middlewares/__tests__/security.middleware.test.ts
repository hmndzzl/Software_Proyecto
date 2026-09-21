import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../app';

describe('HTTP security middleware', () => {
  it('adds Helmet headers and allows the configured frontend origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not add CORS headers for an origin outside the allowlist', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://untrusted.example');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('blocks the eleventh login attempt from the same IP with 429', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    }

    const response = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      mensaje: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en 15 minutos.',
    });
    expect(response.headers.ratelimit).toBeDefined();
    expect(response.headers['retry-after']).toBeDefined();
  });
});
