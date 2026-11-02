import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, logout, register, refresh, me } from '../auth.controller';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import pool from '../../config/db';
import bcrypt from 'bcryptjs';
import bcryptNative from 'bcrypt';
import { ROLES } from '../../config/roles';
import { crearSesionJwt, renovarSesionJwt, cerrarSesionJwt, ErrorSesionJwt } from '../../services/jwtSesion.service';
vi.mock('../../services/jwtSesion.service', async original => ({
  ...await original<typeof import('../../services/jwtSesion.service')>(),
  crearSesionJwt: vi.fn(), renovarSesionJwt: vi.fn(), cerrarSesionJwt: vi.fn(),
}));

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

vi.mock('bcrypt', () => ({
  default: { compare: vi.fn() },
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
    vi.mocked(pool.execute).mockReset();
    vi.mocked(crearSesionJwt).mockReset().mockResolvedValue({ accessToken: 'mocked-token', refreshToken: 'mocked-refresh', refreshExpiresAt: Math.floor(Date.now() / 1000) + 900 });
    vi.mocked(renovarSesionJwt).mockReset().mockResolvedValue(null);
    vi.mocked(cerrarSesionJwt).mockReset().mockResolvedValue(undefined);
    
    // Silenciamos el console.error para que no ensucie la salida de las pruebas
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ----------------------------------------------------
  // 1. Prueba Logout
  // ----------------------------------------------------
  describe('logout', () => {
    it('envía la cookie y el bearer al servicio que revoca la sesión', async () => {
      req.cookies = { refreshToken: 'cookie-firmada' };
      req.headers = { authorization: 'Bearer acceso-firmado' };
      await logout(req as Request, res as Response);
      expect(cerrarSesionJwt).toHaveBeenCalledWith('cookie-firmada', 'acceso-firmado');
    });
    it('no afirma que la sesión se cerró si la base de datos falla', async () => {
      vi.mocked(cerrarSesionJwt).mockRejectedValueOnce(new Error('BD no disponible'));
      await logout(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
    it('debería limpiar la cookie refreshToken y devolver status 200 (OK)', async () => {
      await logout(req as Request, res as Response);

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
    it('rechaza un cambio de credenciales detectado durante el login', async () => {
      req.body = { correo: 'test@test.com', password: 'password123' };
      vi.mocked(pool.execute).mockResolvedValue([[{ id: 1, password: 'hash', estado_cuenta: 'activa' }]] as never);
      vi.mocked(bcryptNative.compare).mockImplementation(async () => true);
      vi.mocked(crearSesionJwt).mockRejectedValueOnce(new ErrorSesionJwt(401, 'Las credenciales cambiaron'));
      await login(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(cookieMock).not.toHaveBeenCalled();
    });
    it('debería hacer login exitoso con credenciales correctas', async () => {
      req.body = { correo: 'test@test.com', password: 'password123' };
      const userFromDb = { id: 1, nombre: 'Test', correo: 'test@test.com', password: 'hashedpassword', rol_id: 2, estado_cuenta: 'activa', foto_url: '/uploads/perfiles/subidas/00000000-0000-0000-0000-000000000001.webp' };

      (pool.execute as any).mockResolvedValue([[userFromDb]]);
      (bcryptNative.compare as any).mockResolvedValue(true);

      await login(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(
        'SELECT id, nombre, correo, password, rol_id, estado_cuenta, foto_url FROM persona WHERE correo = ?',
        ['test@test.com']
      );
      expect(bcryptNative.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(cookieMock).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        mensaje: 'Autenticación exitosa',
        usuario: { id: 1, nombre: 'Test', correo: 'test@test.com', rol_id: 2, foto_url: userFromDb.foto_url }
      }));
    });

    it('debería fallar si la contraseña es incorrecta (401)', async () => {
      req.body = { correo: 'test@test.com', password: 'wrongpassword' };
      const userFromDb = { id: 1, password: 'hashedpassword' };

      (pool.execute as any).mockResolvedValue([[userFromDb]]);
      (bcryptNative.compare as any).mockResolvedValue(false);

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Credenciales inválidas' });
    });

    it.each([
      ['pendiente', 'CUENTA_PENDIENTE'],
      ['rechazada', 'CUENTA_RECHAZADA'],
      ['baja', 'CUENTA_BAJA'],
    ])('debería rechazar con 403 una cuenta %s aunque la contraseña sea correcta', async (estado, codigo) => {
      req.body = { correo: 'test@test.com', password: 'password123' };
      (pool.execute as any).mockResolvedValue([[{ id: 1, nombre: 'Test', correo: 'test@test.com', password: 'hashedpassword', rol_id: 4, estado_cuenta: estado }]]);
      (bcryptNative.compare as any).mockResolvedValue(true);

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ codigo }));
      expect(cookieMock).not.toHaveBeenCalled();
    });

    it('no revela el estado de la cuenta si la contraseña es incorrecta', async () => {
      req.body = { correo: 'test@test.com', password: 'mala' };
      (pool.execute as any).mockResolvedValue([[{ id: 1, password: 'hashedpassword', estado_cuenta: 'pendiente' }]]);
      (bcryptNative.compare as any).mockResolvedValue(false);

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

    it('crea la cuenta como pendiente de aprobación', async () => {
      req.body = { nombre: 'Nuevo', correo: 'nuevo@test.com', password: 'pass', rol_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[]]);
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);
      (bcrypt.hash as any).mockResolvedValue('hashedpass');

      await register(req as Request, res as Response);

      const [sql, params] = (pool.execute as any).mock.calls[1];
      expect(sql).toContain('estado_cuenta');
      expect(params).toContain('pendiente');
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
      
      vi.mocked(renovarSesionJwt).mockResolvedValue({ accessToken: 'mocked-token', refreshToken: 'nuevo-refresh', refreshExpiresAt: Math.floor(Date.now() / 1000) + 900 });

      await refresh(req as Request, res as Response);

      expect(renovarSesionJwt).toHaveBeenCalledWith('valid-token');
      expect(cookieMock).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({ token: 'mocked-token' });
    });

    it('entrega únicamente el access token del servicio de sesiones y renueva la cookie', async () => {
      req.cookies = { refreshToken: 'valid-token' };
      vi.mocked(renovarSesionJwt).mockResolvedValue({ accessToken: 'acceso-actualizado', refreshToken: 'nuevo-refresh', refreshExpiresAt: Math.floor(Date.now() / 1000) + 900 });

      await refresh(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({ token: 'acceso-actualizado' });
      expect(cookieMock).toHaveBeenCalledWith('refreshToken', 'nuevo-refresh', expect.any(Object));
    });

    it('retorna 401 y limpia la cookie cuando el servicio rechaza la sesión', async () => {
      req.cookies = { refreshToken: 'valid-token' };

      await refresh(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(clearCookieMock).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    });


    it('retorna 500 (sin cerrar la sesión) si falla la BD', async () => {
      req.cookies = { refreshToken: 'valid-token' };
      vi.mocked(renovarSesionJwt).mockRejectedValueOnce(new Error('BD caída'));

      await refresh(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(clearCookieMock).not.toHaveBeenCalled();
    });

    it('debería retornar 401 si el token es inválido o expirado', async () => {
      req.cookies = { refreshToken: 'invalid-token' };
      

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
