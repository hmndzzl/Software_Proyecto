import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyToken, createClerkClient } from '@clerk/express';
import { verifyClerkSessionToken, isClerkEnabled, getClerkClient } from '../clerk';

// verifyToken de @clerk/express devuelve el payload del JWT y lanza si no es válido.
vi.mock('@clerk/express', () => ({
  verifyToken: vi.fn(),
  createClerkClient: vi.fn(),
}));

describe('verifyClerkSessionToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('devuelve el id del usuario de Clerk (claim sub) si el token es válido', async () => {
    (verifyToken as any).mockResolvedValue({ sub: 'user_123', azp: 'http://localhost:5173' });

    expect(await verifyClerkSessionToken('token')).toBe('user_123');
    expect(verifyToken).toHaveBeenCalledWith('token', expect.objectContaining({
      authorizedParties: expect.arrayContaining(['http://localhost:5173']),
    }));
  });

  it('devuelve null si Clerk rechaza el token', async () => {
    (verifyToken as any).mockRejectedValue(new Error('JWT is expired'));

    expect(await verifyClerkSessionToken('token')).toBeNull();
  });

  it('devuelve null si el payload no trae sub', async () => {
    (verifyToken as any).mockResolvedValue({ azp: 'http://localhost:5173' });

    expect(await verifyClerkSessionToken('token')).toBeNull();
  });
});

describe('isClerkEnabled', () => {
  const original = process.env.CLERK_SECRET_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = original;
  });

  it('es false cuando CLERK_SECRET_KEY no está definida', () => {
    delete process.env.CLERK_SECRET_KEY;
    expect(isClerkEnabled()).toBe(false);
  });

  it('es true cuando CLERK_SECRET_KEY está definida', () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_x';
    expect(isClerkEnabled()).toBe(true);
  });
});

describe('getClerkClient', () => {
  it('crea el cliente una sola vez y lo reutiliza en llamadas siguientes', () => {
    vi.mocked(createClerkClient).mockReturnValue({} as any);
    const primero = getClerkClient();
    const segundo = getClerkClient();
    expect(segundo).toBe(primero);
    expect(createClerkClient).toHaveBeenCalledTimes(1);
  });
});
