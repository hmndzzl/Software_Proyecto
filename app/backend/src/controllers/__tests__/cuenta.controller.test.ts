import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import pool from '../../config/db';
import { HttpStatus } from '../../utils/httpStatus';
import { ROLES } from '../../config/roles';
import { listarCuentas, aprobarCuenta, rechazarCuenta } from '../cuenta.controller';

vi.mock('../../config/db', () => ({
  default: { execute: vi.fn() },
}));

describe('Cuenta Controller - aprobación de cuentas', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
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
    it('Admin aprueba la cuenta y le asigna el rol elegido', async () => {
      req.body = { rol_id: ROLES.COORDINADOR_MINISTROS };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      await aprobarCuenta(req as Request, res as Response);

      const [sql, params] = (pool.execute as any).mock.calls[0];
      expect(sql).toContain('UPDATE persona SET estado_cuenta');
      expect(params).toEqual(['activa', ROLES.COORDINADOR_MINISTROS, 12, 'activa']);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('Sacerdote aprueba la cuenta con un rol que no es Admin', async () => {
      req.user = { id: 6, rol_id: ROLES.SACERDOTE };
      req.body = { rol_id: ROLES.MINISTRO };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

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

    it('rechaza una cuenta pendiente', async () => {
      cuenta(ROLES.MINISTRO, 'pendiente');
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      await rechazarCuenta(req as Request, res as Response);

      expect((pool.execute as any).mock.calls[1][1]).toEqual(['rechazada', 12, 'pendiente', 'activa']);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('rechaza (desactiva) una cuenta que ya estaba activa', async () => {
      cuenta(ROLES.MINISTRO, 'activa');
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      await rechazarCuenta(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Cuenta rechazada' });
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

    it('un Admin sí puede rechazar la cuenta de otro Administrador', async () => {
      cuenta(ROLES.ADMIN, 'activa');
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

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
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 0 }]);

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
});
