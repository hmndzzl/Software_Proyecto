import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, logout, register } from '../auth.controller';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import pool from '../../config/db';
import bcrypt from 'bcryptjs';

// Mocks de dependencias externas
vi.mock('../../config/db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

describe('Auth Controller - Pruebas Unitarias', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;
  let clearCookieMock: any;
  let cookieMock: any;

  beforeEach(() => {
    req = {
      body: {},
    };

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    clearCookieMock = vi.fn();
    cookieMock = vi.fn();

    res = {
      status: statusMock,
      json: jsonMock,
      clearCookie: clearCookieMock,
      cookie: cookieMock,
    };

    process.env.NODE_ENV = 'development';
    vi.clearAllMocks();
  });

  // ----------------------------------------------------
  // 1. Prueba Logout
  // ----------------------------------------------------
  describe('logout', () => {
    it('debería limpiar la cookie refreshToken y devolver status 200 (OK)', () => {
      logout(req as Request, res as Response);

      expect(clearCookieMock).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
      });
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Sesión cerrada correctamente' });
    });
  });

  // ----------------------------------------------------
  // 2. Prueba Login (2 casos)
  // ----------------------------------------------------
  describe('login', () => {
    it('debería hacer login exitoso con credenciales correctas', async () => {
      req.body = { correo: 'test@test.com', password: 'password123' };
      const userFromDb = { id: 1, nombre: 'Test', correo: 'test@test.com', password: 'hashedpassword', rol_id: 2 };

      // Mock de la base de datos simulando que encuentra al usuario
      (pool.execute as any).mockResolvedValue([[userFromDb]]);
      // Mock de bcrypt simulando que la contraseña es correcta
      (bcrypt.compare as any).mockResolvedValue(true);

      await login(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(
        'SELECT id, nombre, correo, password, rol_id FROM persona WHERE correo = ?',
        ['test@test.com']
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(cookieMock).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        mensaje: 'Autenticación exitosa',
        usuario: { id: 1, nombre: 'Test', correo: 'test@test.com', rol_id: 2 }
      }));
    });

    it('debería fallar si la contraseña es incorrecta (401)', async () => {
      req.body = { correo: 'test@test.com', password: 'wrongpassword' };
      const userFromDb = { id: 1, password: 'hashedpassword' };

      (pool.execute as any).mockResolvedValue([[userFromDb]]);
      (bcrypt.compare as any).mockResolvedValue(false); // Contraseña incorrecta

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Credenciales inválidas' });
    });
  });

  // ----------------------------------------------------
  // 3. Prueba Register (2 casos)
  // ----------------------------------------------------
});
