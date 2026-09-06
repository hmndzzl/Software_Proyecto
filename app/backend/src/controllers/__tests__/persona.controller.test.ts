import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { HttpStatus } from '../../utils/httpStatus';
import pool from '../../config/db';
import { ROLES } from '../../config/roles';
import {
  getCoordinadoresGrupo,
  getEncargadosEvento,
  getMinistros,
  getPersonaById,
  editarPerfil,
  actualizarDisponibilidad
} from '../persona.controller';

vi.mock('../../config/db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

describe('Persona Controller - Pruebas Unitarias', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;
  let sendMock: any;

  beforeEach(() => {
    req = {
      user: { id: 1, rol_id: ROLES.ADMIN, correo: 'admin@test.com' } as any,
      body: {},
      params: {},
    };

    jsonMock = vi.fn();
    sendMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock, send: sendMock });

    res = {
      status: statusMock,
      json: jsonMock,
      send: sendMock,
    };

    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getCoordinadoresGrupo', () => {
    it('debería retornar 200 y los coordinadores', async () => {
      const mockRows = [{ id: 1, nombre: 'Coord' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getCoordinadoresGrupo(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await getCoordinadoresGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getMinistros', () => {
    it('debería retornar 200 y los ministros', async () => {
      const mockRows = [{ id: 1, nombre: 'Ministro' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getMinistros(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await getMinistros(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debería filtrar por coordinador_ministro cuando el solicitante es Coordinador de Ministros', async () => {
      req.user = { id: 7, rol_id: ROLES.COORDINADOR_MINISTROS, correo: 'coord@test.com' } as any;
      const mockRows = [{ id: 9, nombre: 'Ministro Propio' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getMinistros(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('coordinador_ministro'),
        [7]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });
  });

  describe('getEncargadosEvento', () => {
    it('debería retornar 200 y las personas que pueden ser encargadas', async () => {
      const mockRows = [{ id: 1, nombre: 'Ana' }, { id: 2, nombre: 'Luis' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getEncargadosEvento(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(
        'SELECT id, nombre FROM persona ORDER BY nombre ASC'
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await getEncargadosEvento(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getPersonaById', () => {
    it('debería retornar 200 y la persona si existe', async () => {
      req.params = { id: '1' };
      const mockRows = [{ id: 1, nombre: 'Juan' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getPersonaById(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(expect.any(String), ['1']);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows[0]);
    });

    it('debería retornar 404 si la persona no existe', async () => {
      req.params = { id: '99' };
      (pool.execute as any).mockResolvedValue([[]]);

      await getPersonaById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await getPersonaById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('actualizarDisponibilidad', () => {
    it('debería retornar 400 si disponible no es boolean', async () => {
      req.params = { id: '1' };
      req.body = { disponible: 'no' };

      await actualizarDisponibilidad(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 404 si la persona no existe', async () => {
      req.params = { id: '99' };
      req.body = { disponible: false };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 0 }]);

      await actualizarDisponibilidad(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 200 y marcar como disponible', async () => {
      req.params = { id: '1' };
      req.body = { disponible: true };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      await actualizarDisponibilidad(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE persona SET disponible = ? WHERE id = ?'),
        [1, '1']
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        mensaje: 'Ministro marcado como disponible',
        disponible: true,
      }));
    });

    it('debería retornar 200 y marcar como no disponible', async () => {
      req.params = { id: '1' };
      req.body = { disponible: false };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      await actualizarDisponibilidad(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE persona SET disponible = ? WHERE id = ?'),
        [0, '1']
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ disponible: false }));
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      req.body = { disponible: true };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await actualizarDisponibilidad(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('editarPerfil', () => {
    it('debería retornar 403 si un usuario normal intenta editar otro perfil', async () => {
      req.user = { id: 2, rol_id: ROLES.MINISTRO } as any; // Not admin
      req.params = { id: '3' }; // target is 3

      await editarPerfil(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería retornar 400 si no se envían campos para actualizar', async () => {
      req.params = { id: '1' };
      req.body = {}; // empty

      await editarPerfil(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 403 si se intenta cambiar rol sin ser Admin', async () => {
      req.user = { id: 2, rol_id: ROLES.MINISTRO } as any;
      req.params = { id: '2' };
      req.body = { rol_id: 3 };

      await editarPerfil(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería retornar 404 si la persona no existe en BD', async () => {
      req.params = { id: '99' };
      req.body = { nombre: 'Nuevo Nombre' };
      (pool.execute as any).mockResolvedValueOnce([[]]); // SELECT user => not found

      await editarPerfil(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 409 si el correo ya está en uso', async () => {
      req.params = { id: '1' };
      req.body = { correo: 'usado@test.com' };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // SELECT user => found
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }]]); // SELECT correo => found other user

      await editarPerfil(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    });

    it('debería retornar 404 si el update falla por affectedRows 0', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Nuevo' };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // SELECT user => found
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 0 }]); // UPDATE => 0

      await editarPerfil(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 200 y actualizar correctamente (incluyendo password y rol por Admin)', async () => {
      req.user = { id: 1, rol_id: ROLES.ADMIN } as any;
      req.params = { id: '1' };
      req.body = { nombre: 'Nuevo', correo: 'nuevo@test.com', password: '123', rol_id: 2 };
      
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // SELECT user => found
      (pool.execute as any).mockResolvedValueOnce([[]]); // SELECT correo => not used by others
      (bcrypt.hash as any).mockResolvedValue('hashedpass');
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, nombre: 'Nuevo', correo: 'nuevo@test.com', rol_id: 2 }]]); // SELECT updated

      await editarPerfil(req as Request, res as Response);

      expect(bcrypt.hash).toHaveBeenCalledWith('123', 10);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE persona SET nombre = ?, correo = ?, password = ?, rol_id = ? WHERE id = ?'),
        ['Nuevo', 'nuevo@test.com', 'hashedpass', 2, 1]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ mensaje: 'Perfil actualizado correctamente' }));
    });

    it('debería retornar 200 al actualizar solo correo (sin nombre)', async () => {
      req.user = { id: 1, rol_id: ROLES.ADMIN } as any;
      req.params = { id: '1' };
      req.body = { correo: 'solocorreo@test.com' };
      
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // SELECT user => found
      (pool.execute as any).mockResolvedValueOnce([[]]); // SELECT correo => not used by others
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, correo: 'solocorreo@test.com' }]]); // SELECT updated

      await editarPerfil(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE persona SET correo = ? WHERE id = ?'),
        ['solocorreo@test.com', 1]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Nuevo Nombre' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await editarPerfil(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
