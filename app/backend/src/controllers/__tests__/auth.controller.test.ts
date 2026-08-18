import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, logout, register, refresh } from '../auth.controller';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import pool from '../../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mocked-token'),
    verify: vi.fn(),
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
      cookies: {},
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
    
    // Silenciamos el console.error para que no ensucie la salida de las pruebas
    vi.spyOn(console, 'error').mockImplementation(() => {});
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
  // 2. Prueba Login
  // ----------------------------------------------------
  describe('login', () => {
    it('debería hacer login exitoso con credenciales correctas', async () => {
      req.body = { correo: 'test@test.com', password: 'password123' };
      const userFromDb = { id: 1, nombre: 'Test', correo: 'test@test.com', password: 'hashedpassword', rol_id: 2 };

      (pool.execute as any).mockResolvedValue([[userFromDb]]);
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
      (bcrypt.compare as any).mockResolvedValue(false);

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Credenciales inválidas' });
    });

    it('debería fallar si faltan campos (400)', async () => {
      req.body = { correo: 'test@test.com' }; // Falta password

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Por favor, ingrese correo y contraseña' });
    });

    it('debería fallar si el usuario no existe (401)', async () => {
      req.body = { correo: 'noexiste@test.com', password: 'password123' };
      
      (pool.execute as any).mockResolvedValue([[]]); // Array vacío, no encontró nada

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Credenciales inválidas' });
    });

    it('debería manejar errores de base de datos (500)', async () => {
      req.body = { correo: 'test@test.com', password: 'password123' };
      
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Error interno del servidor' });
    });
  });

  // ----------------------------------------------------
  // 3. Prueba Register
  // ----------------------------------------------------
  describe('register', () => {
    it('debería registrar un nuevo usuario exitosamente (201)', async () => {
      req.body = { nombre: 'Nuevo', correo: 'nuevo@test.com', password: 'pass', rol_id: 2 };

      (pool.execute as any).mockResolvedValueOnce([[]]);
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);
      (bcrypt.hash as any).mockResolvedValue('hashedpass');

      await register(req as Request, res as Response);

      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
      expect(pool.execute).toHaveBeenCalledTimes(2);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Usuario registrado exitosamente' });
    });

    it('debería fallar si el correo ya está registrado (400)', async () => {
      req.body = { nombre: 'Existe', correo: 'existe@test.com', password: 'pass', rol_id: 2 };

      (pool.execute as any).mockResolvedValue([[{ id: 1 }]]);

      await register(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'El correo ya está registrado' });
    });

    it('debería fallar si faltan campos (400)', async () => {
      req.body = { nombre: 'Incompleto' }; // Faltan correo, password, rol_id

      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Faltan campos obligatorios' });
    });

    it('debería manejar errores de base de datos (500)', async () => {
      req.body = { nombre: 'Error', correo: 'error@test.com', password: 'pass', rol_id: 2 };

      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Error interno del servidor' });
    });
  });

  // ----------------------------------------------------
  // 4. Prueba Refresh
  // ----------------------------------------------------
  describe('refresh', () => {
    it('debería retornar 401 si no hay token en cookies', async () => {
      req.cookies = {}; // Sin refreshToken

      await refresh(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'No hay sesión activa' });
    });

    it('debería refrescar el token si es válido', async () => {
      req.cookies = { refreshToken: 'valid-token' };
      
      // Simulamos que jwt.verify funciona y devuelve los datos del usuario
      (jwt.verify as any).mockReturnValue({ id: 1, rol_id: 2 });
      // jwt.sign ya está mockeado globalmente para retornar 'mocked-token'

      await refresh(req as Request, res as Response);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect(jwt.sign).toHaveBeenCalledTimes(2); // accessToken y refreshToken
      expect(cookieMock).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({ token: 'mocked-token' });
    });

    it('debería retornar 401 si el token es inválido o expirado', async () => {
      req.cookies = { refreshToken: 'invalid-token' };
      
      (jwt.verify as any).mockImplementation(() => {
        throw new Error('Token expired');
      });

      await refresh(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Sesión expirada, inicia sesión nuevamente' });
    });
  });
});
