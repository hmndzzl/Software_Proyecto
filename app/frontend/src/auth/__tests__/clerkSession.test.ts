import { describe, it, expect, vi } from 'vitest';

// CLERK_ENABLED se calcula al importar el módulo: la key se define antes de los imports.
vi.hoisted(() => {
  vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_123');
});

import {
  CLERK_ENABLED,
  clearClerkSession,
  getClerkToken,
  registerClerkSession,
  signOutClerk,
} from '../clerkSession';

// El módulo guarda estado entre pruebas, por eso el orden importa.
describe('clerkSession', () => {
  it('detecta Clerk activo cuando hay publishable key', () => {
    expect(CLERK_ENABLED).toBe(true);
  });

  it('no bloquea las peticiones si Clerk nunca termina de cargar', async () => {
    vi.useFakeTimers();
    const token = getClerkToken();
    await vi.advanceTimersByTimeAsync(5_000);
    vi.useRealTimers();

    expect(await token).toBeNull();
  });

  it('no falla al cerrar sesión si no hay sesión registrada', async () => {
    await expect(signOutClerk()).resolves.toBeUndefined();
  });

  it('devuelve el token de la sesión registrada', async () => {
    registerClerkSession(vi.fn().mockResolvedValue('token-clerk'), vi.fn());

    expect(await getClerkToken()).toBe('token-clerk');
  });

  it('devuelve null si Clerk falla al entregar el token', async () => {
    registerClerkSession(vi.fn().mockRejectedValue(new Error('sin red')), vi.fn());

    expect(await getClerkToken()).toBeNull();
  });

  it('cierra la sesión de Clerk registrada', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    registerClerkSession(vi.fn(), signOut);

    await signOutClerk();

    expect(signOut).toHaveBeenCalled();
  });

  it('no falla al cerrar sesión si Clerk da error', async () => {
    registerClerkSession(vi.fn(), vi.fn().mockRejectedValue(new Error('sin red')));

    await expect(signOutClerk()).resolves.toBeUndefined();
  });

  it('devuelve null después de que la sesión de Clerk termina', async () => {
    registerClerkSession(vi.fn().mockResolvedValue('token-clerk'), vi.fn());
    clearClerkSession();

    expect(await getClerkToken()).toBeNull();
  });
});

describe('mensaje de error de login', () => {
  it('guarda, notifica y limpia el mensaje', async () => {
    const { getLoginError, setLoginError, subscribeLoginError } = await import('../clerkSession');
    const listener = vi.fn();
    const unsubscribe = subscribeLoginError(listener);

    setLoginError('Tu cuenta está pendiente de aprobación.');
    expect(getLoginError()).toBe('Tu cuenta está pendiente de aprobación.');
    expect(sessionStorage.getItem('loginError')).toBe('Tu cuenta está pendiente de aprobación.');
    expect(listener).toHaveBeenCalledTimes(1);

    setLoginError(null);
    expect(getLoginError()).toBeNull();
    expect(sessionStorage.getItem('loginError')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setLoginError('otro');
    expect(listener).toHaveBeenCalledTimes(2);
    setLoginError(null);
  });
});
