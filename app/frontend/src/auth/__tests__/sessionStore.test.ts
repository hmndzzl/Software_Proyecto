import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSession,
  esClaveDeSesion,
  readAuthProvider,
  readToken,
  readUsuario,
  saveAuthProvider,
  saveSession,
  saveToken,
  saveUsuario,
} from '../sessionStore';

const usuario = { id: 1, nombre: 'Ana', correo: 'ana@test.com', rol_id: 4 };

describe('sessionStore', () => {
  beforeEach(() => localStorage.clear());

  it('guarda y lee la sesión completa', () => {
    saveSession('tok', usuario);
    expect(readToken()).toBe('tok');
    expect(readUsuario()).toEqual(usuario);
  });

  it('saveUsuario actualiza el usuario sin tocar el token', () => {
    saveSession('tok', usuario);
    saveUsuario({ ...usuario, rol_id: 1 });
    expect(readToken()).toBe('tok');
    expect(readUsuario()?.rol_id).toBe(1);
  });

  it('saveToken reemplaza solo el token', () => {
    saveSession('tok', usuario);
    saveToken('nuevo');
    expect(readToken()).toBe('nuevo');
    expect(readUsuario()).toEqual(usuario);
  });

  it('devuelve null si no hay usuario, si no es JSON o si no es un objeto', () => {
    expect(readUsuario()).toBeNull();
    localStorage.setItem('usuario', 'no es json');
    expect(readUsuario()).toBeNull();
    localStorage.setItem('usuario', '"texto"');
    expect(readUsuario()).toBeNull();
    localStorage.setItem('usuario', 'null');
    expect(readUsuario()).toBeNull();
  });

  it('recuerda el proveedor de la sesión', () => {
    expect(readAuthProvider()).toBeNull();
    saveAuthProvider('clerk');
    expect(readAuthProvider()).toBe('clerk');
  });

  it('clearSession borra token, usuario y proveedor', () => {
    saveSession('tok', usuario);
    saveAuthProvider('clerk');
    clearSession();
    expect(readToken()).toBeNull();
    expect(readUsuario()).toBeNull();
    expect(readAuthProvider()).toBeNull();
  });

  it('identifica las claves que significan un cambio de sesión', () => {
    expect(esClaveDeSesion('usuario')).toBe(true);
    expect(esClaveDeSesion('token')).toBe(true);
    expect(esClaveDeSesion(null)).toBe(true); // localStorage.clear() en otra pestaña
    expect(esClaveDeSesion('otra')).toBe(false);
  });
});
