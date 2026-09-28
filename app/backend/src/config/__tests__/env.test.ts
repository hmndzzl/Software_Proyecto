import { describe, it, expect, afterEach } from 'vitest';
import { validateEnv } from '../env';

const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
];

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe('validateEnv (DT-08)', () => {
  it('no lanza en NODE_ENV=test aunque falten todas las variables obligatorias', () => {
    process.env.NODE_ENV = 'test';
    for (const key of REQUIRED_ENV_VARS) delete process.env[key];

    expect(() => validateEnv()).not.toThrow();
  });

  it('no lanza fuera de test si todas las variables obligatorias están presentes', () => {
    process.env.NODE_ENV = 'production';
    for (const key of REQUIRED_ENV_VARS) process.env[key] = 'valor';

    expect(() => validateEnv()).not.toThrow();
  });

  it.each(REQUIRED_ENV_VARS)('lanza fuera de test si falta %s', (faltante) => {
    process.env.NODE_ENV = 'production';
    for (const key of REQUIRED_ENV_VARS) process.env[key] = 'valor';
    delete process.env[faltante];

    expect(() => validateEnv()).toThrowError(new RegExp(faltante));
  });

  it('reporta todas las variables faltantes en un único mensaje', () => {
    process.env.NODE_ENV = 'development';
    for (const key of REQUIRED_ENV_VARS) delete process.env[key];

    let error: Error | undefined;
    try {
      validateEnv();
    } catch (err) {
      error = err as Error;
    }

    expect(error).toBeDefined();
    for (const key of REQUIRED_ENV_VARS) {
      expect(error!.message).toContain(key);
    }
  });

  it('trata un valor vacío como faltante', () => {
    process.env.NODE_ENV = 'production';
    for (const key of REQUIRED_ENV_VARS) process.env[key] = 'valor';
    process.env.DB_PASSWORD = '';

    expect(() => validateEnv()).toThrowError(/DB_PASSWORD/);
  });
});
