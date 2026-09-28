import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllEnvs());

describe('aislamiento del límite de login para k6', () => {
  it.each([
    ['production', 'true', 429],
    ['development', 'true', 429],
    ['performance', 'false', 429],
    ['performance', 'true', 200],
  ])('NODE_ENV=%s, flag=%s: intento 11 devuelve %s', async (environment, flag, status) => {
    vi.stubEnv('NODE_ENV', environment);
    vi.stubEnv('K6_DISABLE_LOGIN_RATE_LIMIT', flag);
    vi.resetModules();
    const { loginRateLimiter } = await import('../login-rate-limit.middleware');
    const app = express();
    app.post('/login', loginRateLimiter, (_req, res) => res.sendStatus(200));
    for (let i = 0; i < 10; i++) {
      expect((await request(app).post('/login')).status).toBe(200);
    }
    expect((await request(app).post('/login')).status).toBe(status);
  });
});
