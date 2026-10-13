import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyToken } from '@clerk/express';
import { verifyClerkSessionToken } from '../clerk';

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
