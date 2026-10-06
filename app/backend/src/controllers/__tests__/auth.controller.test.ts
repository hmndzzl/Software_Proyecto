import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, logout, register, refresh, me } from '../auth.controller';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import pool from '../../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ROLES } from '../../config/roles';

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
      const userFromDb = { id: 1, nombre: 'Test', correo: 'test@test.com', password: 'hashedpassword', rol_id: 2, estado_cuenta: 'activa' };

      (pool.execute as any).mockResolvedValue([[userFromDb]]);
      (bcrypt.compare as any).mockResolvedValue(true);

      await login(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(
        'SELECT id, nombre, correo, password, rol_id, estado_cuenta FROM persona WHERE correo = ?',
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

    it.each([
      ['pendiente', 'CUENTA_PENDIENTE'],
      ['rechazada', 'CUENTA_RECHAZADA'],
    ])('debería rechazar con 403 una cuenta %s aunque la contraseña sea correcta', async (estado, codigo) => {
      req.body = { correo: 'test@test.com', password: 'password123' };
      (pool.execute as any).mockResolvedValue([[{ id: 1, nombre: 'Test', correo: 'test@test.com', password: 'hashedpassword', rol_id: 4, estado_cuenta: estado }]]);
      (bcrypt.compare as any).mockResolvedValue(true);

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ codigo }));
      expect(cookieMock).not.toHaveBeenCalled();
    });

    it('no revela el estado de la cuenta si la contraseña es incorrecta', async () => {
      req.body = { correo: 'test@test.com', password: 'mala' };
      (pool.execute as any).mockResolvedValue([[{ id: 1, password: 'hashedpassword', estado_cuenta: 'pendiente' }]]);
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

    it('un Sacerdote no puede registrar a un Administrador (403)', async () => {
      req.user = { id: 6, rol_id: ROLES.SACERDOTE };
      req.body = { nombre: 'Nuevo', correo: 'nuevo@test.com', password: 'pass', rol_id: ROLES.ADMIN };

      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('un Admin sí puede registrar a un Administrador (201)', async () => {
      req.user = { id: 1, rol_id: ROLES.ADMIN };
      req.body = { nombre: 'Nuevo', correo: 'nuevo@test.com', password: 'pass', rol_id: ROLES.ADMIN };
      (pool.execute as any).mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ insertId: 3 }]);
      (bcrypt.hash as any).mockResolvedValue('hashedpass');

      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('debería fallar si el rol no existe (400)', async () => {
      req.body = { nombre: 'Nuevo', correo: 'nuevo@test.com', password: 'pass', rol_id: 99 };

      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Rol inválido' });
      expect(pool.execute).not.toHaveBeenCalled();
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
      (pool.execute as any).mockResolvedValueOnce([[{ rol_id: 2, estado_cuenta: 'activa' }]]);
      // jwt.sign ya está mockeado globalmente para retornar 'mocked-token'

      await refresh(req as Request, res as Response);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect(jwt.sign).toHaveBeenCalledTimes(2); // accessToken y refreshToken
      expect(cookieMock).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({ token: 'mocked-token' });
    });

    it('el nuevo token usa el rol actual de la BD, no el del refresh token', async () => {
      req.cookies = { refreshToken: 'valid-token' };
      (jwt.verify as any).mockReturnValue({ id: 1, rol_id: 4 });
      (pool.execute as any).mockResolvedValueOnce([[{ rol_id: 2, estado_cuenta: 'activa' }]]);

      await refresh(req as Request, res as Response);

      expect((jwt.sign as any).mock.calls[0][0]).toEqual({ id: 1, rol_id: 2 });
    });

    it.each(['rechazada', 'pendiente'])('retorna 401 y limpia la cookie si la cuenta está %s', async (estado) => {
      req.cookies = { refreshToken: 'valid-token' };
      (jwt.verify as any).mockReturnValue({ id: 1, rol_id: 2 });
      (pool.execute as any).mockResolvedValueOnce([[{ rol_id: 2, estado_cuenta: estado }]]);

      await refresh(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(clearCookieMock).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('retorna 401 si la persona ya no existe', async () => {
      req.cookies = { refreshToken: 'valid-token' };
      (jwt.verify as any).mockReturnValue({ id: 99, rol_id: 2 });
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await refresh(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it('retorna 500 (sin cerrar la sesión) si falla la BD', async () => {
      req.cookies = { refreshToken: 'valid-token' };
      (jwt.verify as any).mockReturnValue({ id: 1, rol_id: 2 });
      (pool.execute as any).mockRejectedValueOnce(new Error('BD caída'));

      await refresh(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(clearCookieMock).not.toHaveBeenCalled();
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

  // ----------------------------------------------------
  // 5. Prueba Me
  // ----------------------------------------------------
  describe('me', () => {
    it('debería retornar los datos y el rol del usuario autenticado', async () => {
      req.user = { id: 5, rol_id: 2 };
      (pool.execute as any).mockResolvedValue([[{ id: 5, nombre: 'Ana', correo: 'ana@parroquia.com', rol_id: 2 }]]);

      await me(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ?'), [5]);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({
        usuario: { id: 5, nombre: 'Ana', correo: 'ana@parroquia.com', rol_id: 2 },
      });
    });

    it('debería retornar 404 si la persona ya no existe', async () => {
      req.user = { id: 99, rol_id: 4 };
      (pool.execute as any).mockResolvedValue([[]]);

      await me(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });
  });
});
