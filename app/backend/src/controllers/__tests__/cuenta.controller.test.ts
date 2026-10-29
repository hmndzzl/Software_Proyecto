import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import pool from '../../config/db';
import { HttpStatus } from '../../utils/httpStatus';
import { ROLES } from '../../config/roles';
import { enviarCorreoCuenta } from '../../services/email.service';
import { listarCuentas, aprobarCuenta, rechazarCuenta, darDeBajaCuenta } from '../cuenta.controller';

vi.mock('../../config/db', () => ({
  default: { execute: vi.fn(), getConnection: vi.fn() },
}));

vi.mock('../../services/email.service', () => ({
  enviarCorreoCuenta: vi.fn().mockResolvedValue(true),
}));

describe('Cuenta Controller - aprobación de cuentas', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pool.execute).mockResolvedValue([{ affectedRows: 1 }] as never);
    vi.mocked(pool.getConnection).mockResolvedValue({
      execute: pool.execute, beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
    } as never);
    vi.mocked(enviarCorreoCuenta).mockResolvedValue(true);
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    res = { status: statusMock, json: jsonMock };
    req = { params: { id: '12' }, body: {}, query: {}, user: { id: 1, rol_id: ROLES.ADMIN } };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('listarCuentas', () => {
    it('lista las cuentas pendientes por defecto', async () => {
      const filas = [{ id: 12, nombre: 'Ana', correo: 'ana@gmail.com', rol_id: ROLES.MINISTRO, estado_cuenta: 'pendiente' }];
      (pool.execute as any).mockResolvedValueOnce([filas]);

      await listarCuentas(req as Request, res as Response);

      expect((pool.execute as any).mock.calls[0][1]).toEqual(['pendiente']);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(filas);
    });

    it('filtra por el estado indicado', async () => {
      req.query = { estado: 'rechazada' };
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await listarCuentas(req as Request, res as Response);

      expect((pool.execute as any).mock.calls[0][1]).toEqual(['rechazada']);
    });

    it('retorna 400 con un estado inválido', async () => {
      req.query = { estado: 'cualquiera' };

      await listarCuentas(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('retorna 500 si falla la BD', async () => {
      (pool.execute as any).mockRejectedValueOnce(new Error('BD caída'));

      await listarCuentas(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('aprobarCuenta', () => {
    it('Admin aprueba la cuenta y le asigna el rol elegido, y notifica a la persona', async () => {
      req.body = { rol_id: ROLES.COORDINADOR_MINISTROS };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 201 }]); // INSERT notificacion
      (pool.execute as any).mockResolvedValueOnce([{}]); // INSERT persona_notificacion

      await aprobarCuenta(req as Request, res as Response);

      const [sql, params] = (pool.execute as any).mock.calls[0];
      expect(sql).toContain('UPDATE persona SET estado_cuenta');
      expect(params).toEqual(['activa', ROLES.COORDINADOR_MINISTROS, 12, 'pendiente', 'rechazada']);
      expect(pool.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO notificacion'),
        ['Tu cuenta fue aprobada. Ya puedes iniciar sesión.', expect.any(String), 1]
      );
      expect(pool.execute).toHaveBeenNthCalledWith(
        3,
        'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
        [12, 201]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('envía el correo de aprobación a la persona', async () => {
      req.body = { rol_id: ROLES.MINISTRO };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 204 }]); // INSERT notificacion
      (pool.execute as any).mockResolvedValueOnce([{}]); // INSERT persona_notificacion
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT decision
      (pool.execute as any).mockResolvedValueOnce([[{ correo: 'ana@gmail.com', nombre: 'Ana' }]]); // SELECT destinatario

      await aprobarCuenta(req as Request, res as Response);

      await vi.waitFor(() => expect(enviarCorreoCuenta).toHaveBeenCalledWith('ana@gmail.com', 'Ana', 'aprobada'));
    });

    it('responde 200 aunque falle la consulta del destinatario para el correo', async () => {
      req.body = { rol_id: ROLES.MINISTRO };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 205 }]);
      (pool.execute as any).mockResolvedValueOnce([{}]);
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT decision
      (pool.execute as any).mockRejectedValueOnce(new Error('BD caída'));

      await aprobarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(enviarCorreoCuenta).not.toHaveBeenCalled();
    });

    it('Sacerdote aprueba la cuenta con un rol que no es Admin', async () => {
      req.user = { id: 6, rol_id: ROLES.SACERDOTE };
      req.body = { rol_id: ROLES.MINISTRO };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 202 }]);
      (pool.execute as any).mockResolvedValueOnce([{}]);

      await aprobarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('Sacerdote no puede otorgar el rol de Administrador', async () => {
      req.user = { id: 6, rol_id: ROLES.SACERDOTE };
      req.body = { rol_id: ROLES.ADMIN };

      await aprobarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('Admin sí puede otorgar el rol de Administrador', async () => {
      req.body = { rol_id: ROLES.ADMIN };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 203 }]);
      (pool.execute as any).mockResolvedValueOnce([{}]);

      await aprobarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it.each([[undefined], [0], [99], ['abc']])('retorna 400 si el rol es inválido (%s)', async (rol) => {
      req.body = { rol_id: rol };

      await aprobarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('retorna 400 si el id no es válido', async () => {
      req.params = { id: 'abc' };
      req.body = { rol_id: ROLES.MINISTRO };

      await aprobarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('retorna 404 si la cuenta no existe', async () => {
      req.body = { rol_id: ROLES.MINISTRO };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 0 }]).mockResolvedValueOnce([[]]);

      await aprobarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('retorna 409 si la cuenta ya estaba activa', async () => {
      req.body = { rol_id: ROLES.MINISTRO };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 0 }]).mockResolvedValueOnce([[{ id: 12 }]]);

      await aprobarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    });

    it('retorna 500 si falla la BD', async () => {
      req.body = { rol_id: ROLES.MINISTRO };
      (pool.execute as any).mockRejectedValueOnce(new Error('BD caída'));

      await aprobarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('rechazarCuenta', () => {
    const cuenta = (rol_id: number, estado_cuenta: string) =>
      (pool.execute as any).mockResolvedValueOnce([[{ rol_id, estado_cuenta }]]);

    it('rechaza una cuenta pendiente y notifica a la persona', async () => {
      cuenta(ROLES.MINISTRO, 'pendiente');
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 301 }]); // INSERT notificacion
      (pool.execute as any).mockResolvedValueOnce([{}]); // INSERT persona_notificacion

      await rechazarCuenta(req as Request, res as Response);

      expect((pool.execute as any).mock.calls[1][1]).toEqual(['rechazada', 12, 'pendiente']);
      expect(pool.execute).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO notificacion'),
        ['Tu cuenta fue rechazada. Si crees que es un error, contacta al administrador parroquial.', expect.any(String), 1]
      );
      expect(pool.execute).toHaveBeenNthCalledWith(
        4,
        'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
        [12, 301]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('envía el correo de rechazo a la persona', async () => {
      cuenta(ROLES.MINISTRO, 'pendiente');
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 304 }]); // INSERT notificacion
      (pool.execute as any).mockResolvedValueOnce([{}]); // INSERT persona_notificacion
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT decision
      (pool.execute as any).mockResolvedValueOnce([[{ correo: 'luis@gmail.com', nombre: 'Luis' }]]); // SELECT destinatario

      await rechazarCuenta(req as Request, res as Response);

      await vi.waitFor(() => expect(enviarCorreoCuenta).toHaveBeenCalledWith('luis@gmail.com', 'Luis', 'rechazada'));
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it.each(['activa', 'rechazada', 'baja'])('no usa el rechazo para una cuenta %s', async estado => {
      cuenta(ROLES.MINISTRO, estado);
      await rechazarCuenta(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    it('no permite rechazar la propia cuenta (403)', async () => {
      req.params = { id: '1' }; // req.user.id = 1

      await rechazarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('un Sacerdote no puede rechazar la cuenta de un Administrador (403)', async () => {
      req.user = { id: 6, rol_id: ROLES.SACERDOTE };
      cuenta(ROLES.ADMIN, 'activa');

      await rechazarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    it('un Admin sí puede rechazar una solicitud de otro Administrador', async () => {
      cuenta(ROLES.ADMIN, 'pendiente');
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 303 }]);
      (pool.execute as any).mockResolvedValueOnce([{}]);

      await rechazarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('retorna 404 si la cuenta no existe', async () => {
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await rechazarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('retorna 409 si la cuenta ya estaba rechazada', async () => {
      cuenta(ROLES.MINISTRO, 'rechazada');

      await rechazarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    });

    it('retorna 500 si falla la BD', async () => {
      (pool.execute as any).mockRejectedValueOnce(new Error('BD caída'));

      await rechazarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('retorna 400 si el id no es válido', async () => {
      req.params = { id: '-3' };

      await rechazarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(pool.execute).not.toHaveBeenCalled();
    });
  });
  describe('darDeBajaCuenta', () => {
    it.each([ROLES.ADMIN, ROLES.SACERDOTE])('da de baja como rol %s y audita sin eliminar relaciones', async rol => {
      req.user = { id: 1, rol_id: rol };
      vi.mocked(pool.execute)
        .mockResolvedValueOnce([[{ rol_id: ROLES.MINISTRO, estado_cuenta: 'activa', nombre: 'Ana' }]] as never)
        .mockResolvedValueOnce([[]] as never) // tareas futuras: ninguna
        .mockResolvedValueOnce([[]] as never) // reservas futuras: ninguna
        .mockResolvedValueOnce([{ affectedRows: 1 }] as never)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as never)
        .mockResolvedValueOnce([[{ nombre: 'Ana', correo: 'ana@example.com' }]] as never);
      await darDeBajaCuenta(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(pool.execute).toHaveBeenCalledWith('UPDATE persona SET estado_cuenta = ? WHERE id = ?', ['baja', 12]);
      expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO cuenta_decision'), [12, 'baja', 1]);
      expect(vi.mocked(pool.execute).mock.calls.some(([sql]) => /DELETE/i.test(String(sql)))).toBe(false);
      await vi.waitFor(() => expect(enviarCorreoCuenta).toHaveBeenCalledWith('ana@example.com', 'Ana', 'desactivada'));
    });
    it.each(['pendiente', 'rechazada', 'baja'])('impide dar de baja una cuenta %s', async estado => {
      vi.mocked(pool.execute).mockResolvedValueOnce([[{ rol_id: 4, estado_cuenta: estado }]] as never);
      await darDeBajaCuenta(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(pool.execute).toHaveBeenCalledTimes(1);
    });
    it.each(['0', '-1', 'texto', '9007199254740992'])('rechaza id inválido %s', async id => {
      req.params = { id };
      await darDeBajaCuenta(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(pool.getConnection).not.toHaveBeenCalled();
    });
    it('impide la baja propia', async () => {
      req.params = { id: '1' };
      await darDeBajaCuenta(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(pool.execute).not.toHaveBeenCalled();
    });
    it('impide que Sacerdote dé de baja a Admin', async () => {
      req.user = { id: 1, rol_id: ROLES.SACERDOTE };
      vi.mocked(pool.execute).mockResolvedValueOnce([[{ rol_id: ROLES.ADMIN, estado_cuenta: 'activa' }]] as never);
      await darDeBajaCuenta(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(pool.execute).toHaveBeenCalledTimes(1);
    });
    it('retorna 404 para cuenta inexistente', async () => {
      vi.mocked(pool.execute).mockResolvedValueOnce([[]] as never);
      await darDeBajaCuenta(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(404);
    });
    it('revierte si falla la auditoría', async () => {
      const rollback = vi.fn();
      vi.mocked(pool.getConnection).mockResolvedValue({ execute: pool.execute, beginTransaction: vi.fn(), commit: vi.fn(), rollback, release: vi.fn() } as never);
      vi.mocked(pool.execute).mockResolvedValueOnce([[{ rol_id: 4, estado_cuenta: 'activa' }]] as never)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as never).mockRejectedValueOnce(new Error('Auditoría caída'));
      await darDeBajaCuenta(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(rollback).toHaveBeenCalled();
      expect(enviarCorreoCuenta).not.toHaveBeenCalled();
    });
  });

});
