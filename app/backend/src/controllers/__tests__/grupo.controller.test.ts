import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import pool from '../../config/db';
import {
  getGrupos,
  getGrupoById,
  createGrupo,
  updateGrupo,
  deleteGrupo
} from '../grupo.controller';

vi.mock('../../config/db', () => ({
  default: {
    execute: vi.fn(),
    getConnection: vi.fn(),
  },
}));

describe('Grupo Controller - Pruebas Unitarias', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;
  let sendMock: any;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
    };

    jsonMock = vi.fn();
    sendMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock, send: sendMock });

    res = {
      status: statusMock,
      json: jsonMock,
      send: sendMock
    };

    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // El mock de la conexión transaccional comparte la cola de pool.execute, igual
    // que en cuenta.controller.test.ts: así los conn.execute() dentro de
    // withTransaction consumen los mismos mockResolvedValueOnce en orden.
    vi.mocked(pool.getConnection).mockResolvedValue({
      execute: pool.execute, beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
    } as never);
  });

  describe('getGrupos', () => {
    it('debería retornar 200 y la lista de grupos con sus coordinadores', async () => {
      const mockGrupos = [{ id: 1, nombre: 'Grupo A' }];
      const mockCoordinadores = [{ id: 7, nombre: 'Ana' }];
      (pool.execute as any).mockResolvedValueOnce([mockGrupos]);
      (pool.execute as any).mockResolvedValueOnce([mockCoordinadores]);

      await getGrupos(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith([{ id: 1, nombre: 'Grupo A', coordinadores: mockCoordinadores }]);
    });

    it('un grupo sin coordinadores retorna coordinadores: []', async () => {
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2, nombre: 'Acólitos' }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await getGrupos(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith([{ id: 2, nombre: 'Acólitos', coordinadores: [] }]);
    });

    it('un grupo con varios coordinadores los incluye a todos', async () => {
      (pool.execute as any).mockResolvedValueOnce([[{ id: 3, nombre: 'Coro' }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 7, nombre: 'Ana' }, { id: 8, nombre: 'Luis' }]]);

      await getGrupos(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith([{
        id: 3, nombre: 'Coro', coordinadores: [{ id: 7, nombre: 'Ana' }, { id: 8, nombre: 'Luis' }],
      }]);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await getGrupos(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getGrupoById', () => {
    it('debería retornar 200 y el grupo con sus coordinadores si existe', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, nombre: 'Grupo A' }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 7, nombre: 'Ana' }]]);

      await getGrupoById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({ id: 1, nombre: 'Grupo A', coordinadores: [{ id: 7, nombre: 'Ana' }] });
    });

    it('debería retornar 404 si no existe', async () => {
      req.params = { id: '99' };
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await getGrupoById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Grupo no encontrado' });
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await getGrupoById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('createGrupo', () => {
    it('debería retornar 400 si falta el nombre', async () => {
      req.body = { coordinador_ids: [1] };

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'El campo nombre es requerido' });
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('debería retornar 400 si coordinador_ids no es un arreglo no vacío', async () => {
      req.body = { nombre: 'Grupo A', coordinador_ids: [] };

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'El campo coordinador_ids debe ser un arreglo con al menos un id' });
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('debería retornar 404 si alguno de los coordinadores no existe', async () => {
      req.body = { nombre: 'Grupo A', coordinador_ids: [99] };
      (pool.execute as any).mockResolvedValueOnce([[]]); // ninguna persona activa con ese id

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Alguno de los coordinadores indicados no existe' });
    });

    it('debería retornar 400 si alguno de los coordinadores ya está a cargo de otro grupo', async () => {
      req.body = { nombre: 'Grupo A', coordinador_ids: [1] };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // validar coordinador
      (pool.execute as any).mockResolvedValueOnce([[{ coordinador_id: 1 }]]); // ya coordina otro grupo

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Alguno de los coordinadores ya está a cargo de otro grupo' });
    });

    it('debería retornar 201 y crear el grupo con un coordinador', async () => {
      req.body = { nombre: 'Grupo A', coordinador_ids: [1] };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // validar coordinador
      (pool.execute as any).mockResolvedValueOnce([[]]); // ningún coordinador ocupado
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 5 }]); // insert grupo
      (pool.execute as any).mockResolvedValueOnce([{}]); // insert grupo_coordinador
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, nombre: 'Ana' }]]); // coordinadores final

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith({
        mensaje: 'Grupo creado exitosamente',
        grupo: { id: 5, nombre: 'Grupo A', coordinadores: [{ id: 1, nombre: 'Ana' }] },
      });
    });

    it('debería retornar 201 y crear el grupo con varios coordinadores', async () => {
      req.body = { nombre: 'Grupo A', coordinador_ids: [1, 2] };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]]); // validar coordinadores
      (pool.execute as any).mockResolvedValueOnce([[]]); // ningún coordinador ocupado
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 6 }]); // insert grupo
      (pool.execute as any).mockResolvedValueOnce([{}]); // insert grupo_coordinador #1
      (pool.execute as any).mockResolvedValueOnce([{}]); // insert grupo_coordinador #2
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, nombre: 'Ana' }, { id: 2, nombre: 'Luis' }]]); // coordinadores final

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith({
        mensaje: 'Grupo creado exitosamente',
        grupo: { id: 6, nombre: 'Grupo A', coordinadores: [{ id: 1, nombre: 'Ana' }, { id: 2, nombre: 'Luis' }] },
      });
    });

    it('debería retornar 400 si hay error ER_DUP_ENTRY por nombre', async () => {
      req.body = { nombre: 'Grupo A', coordinador_ids: [1] };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // validar coordinador
      (pool.execute as any).mockResolvedValueOnce([[]]); // ningún coordinador ocupado

      const dupError: any = new Error('Duplicate entry uq_grupo_nombre');
      dupError.code = 'ER_DUP_ENTRY';
      (pool.execute as any).mockRejectedValueOnce(dupError); // insert grupo falla

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Ya existe un grupo con ese nombre' });
    });

    it('debería retornar 500 en caso de otros errores de BD', async () => {
      req.body = { nombre: 'Grupo A', coordinador_ids: [1] };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('updateGrupo', () => {
    it('debería retornar 400 si falta el nombre', async () => {
      req.params = { id: '1' };
      req.body = { coordinador_ids: [1] };

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'El campo nombre es requerido' });
    });

    it('debería retornar 400 si coordinador_ids no es un arreglo no vacío', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Grupo A', coordinador_ids: 'no-es-arreglo' };

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'El campo coordinador_ids debe ser un arreglo con al menos un id' });
    });

    it('debería retornar 404 si alguno de los coordinadores no existe', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Grupo A', coordinador_ids: [99] };
      (pool.execute as any).mockResolvedValueOnce([[]]); // ninguna persona activa con ese id

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Alguno de los coordinadores indicados no existe' });
    });

    it('debería retornar 400 si alguno de los coordinadores ya está a cargo de otro grupo', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Grupo B', coordinador_ids: [2] };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }]]); // validar coordinador
      (pool.execute as any).mockResolvedValueOnce([[{ coordinador_id: 2 }]]); // ocupado en otro grupo

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Alguno de los coordinadores ya está a cargo de otro grupo' });
      // La verificación de "ocupado" debe excluir al propio grupo que se está editando.
      expect((pool.execute as any).mock.calls[1][0]).toContain('grupo_id <> ?');
      expect((pool.execute as any).mock.calls[1][1]).toEqual([2, 1]);
    });

    it('debería retornar 200 al actualizar un grupo con varios coordinadores (reemplaza el set anterior)', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Grupo B', coordinador_ids: [2, 3] };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }, { id: 3 }]]); // validar coordinadores
      (pool.execute as any).mockResolvedValueOnce([[]]); // ningún coordinador ocupado en otro grupo
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // el grupo existe
      (pool.execute as any).mockResolvedValueOnce([{}]); // update nombre
      (pool.execute as any).mockResolvedValueOnce([{}]); // delete grupo_coordinador
      (pool.execute as any).mockResolvedValueOnce([{}]); // insert #1
      (pool.execute as any).mockResolvedValueOnce([{}]); // insert #2
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2, nombre: 'Luis' }, { id: 3, nombre: 'Marta' }]]); // coordinadores final

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({
        mensaje: 'Grupo actualizado exitosamente',
        grupo: { id: 1, nombre: 'Grupo B', coordinadores: [{ id: 2, nombre: 'Luis' }, { id: 3, nombre: 'Marta' }] },
      });
    });

    it('debería retornar 404 si el grupo no se encuentra', async () => {
      req.params = { id: '99' };
      req.body = { nombre: 'Grupo B', coordinador_ids: [2] };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }]]); // validar coordinador
      (pool.execute as any).mockResolvedValueOnce([[]]); // ningún coordinador ocupado
      (pool.execute as any).mockResolvedValueOnce([[]]); // el grupo no existe

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Grupo no encontrado' });
    });

    it('debería retornar 400 si hay error ER_DUP_ENTRY por nombre', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Grupo A', coordinador_ids: [1] };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // validar coordinador
      (pool.execute as any).mockResolvedValueOnce([[]]); // ningún coordinador ocupado
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // el grupo existe

      const dupError: any = new Error('Duplicate entry uq_grupo_nombre');
      dupError.code = 'ER_DUP_ENTRY';
      (pool.execute as any).mockRejectedValueOnce(dupError); // update nombre falla

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Ya existe un grupo con ese nombre' });
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Grupo B', coordinador_ids: [2] };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('deleteGrupo', () => {
    it('debería retornar 204 al eliminar un grupo exitosamente', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockResolvedValue([{ affectedRows: 1 }]);

      await deleteGrupo(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith('DELETE FROM grupo WHERE id = ?', ['1']);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
      expect(sendMock).toHaveBeenCalled();
    });

    it('debería retornar 404 si el grupo no existe (affectedRows === 0)', async () => {
      req.params = { id: '99' };
      (pool.execute as any).mockResolvedValue([{ affectedRows: 0 }]);

      await deleteGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Grupo no encontrado' });
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await deleteGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
