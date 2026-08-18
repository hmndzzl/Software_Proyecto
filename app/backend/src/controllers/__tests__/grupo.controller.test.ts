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
  });

  describe('getGrupos', () => {
    it('debería retornar 200 y la lista de grupos', async () => {
      const mockRows = [{ id: 1, nombre: 'Grupo A' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getGrupos(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await getGrupos(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getGrupoById', () => {
    it('debería retornar 200 y el grupo si existe', async () => {
      req.params = { id: '1' };
      const mockRows = [{ id: 1, nombre: 'Grupo A' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getGrupoById(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(expect.any(String), ['1']);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows[0]);
    });

    it('debería retornar 404 si no existe', async () => {
      req.params = { id: '99' };
      (pool.execute as any).mockResolvedValue([[]]);

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
    it('debería retornar 400 si faltan campos obligatorios', async () => {
      req.body = { nombre: 'Grupo A' }; // falta coordinador_id

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Los campos nombre y coordinador_id son requeridos' });
    });

    it('debería retornar 404 si el coordinador no existe', async () => {
      req.body = { nombre: 'Grupo A', coordinador_id: 99 };
      (pool.execute as any).mockResolvedValueOnce([[]]); // Coordinador no encontrado

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'El coordinador indicado no existe' });
    });

    it('debería retornar 201 y crear el grupo si todo es válido', async () => {
      req.body = { nombre: 'Grupo A', coordinador_id: 1 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // Coordinador
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 5 }]); // Insert

      await createGrupo(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledTimes(2);
      expect(pool.execute).toHaveBeenLastCalledWith(
        'INSERT INTO grupo (nombre, coordinador_id) VALUES (?, ?)',
        ['Grupo A', 1]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith({
        mensaje: 'Grupo creado exitosamente',
        grupo: { id: 5, nombre: 'Grupo A', coordinador_id: 1 }
      });
    });

    it('debería retornar 400 si hay error ER_DUP_ENTRY por nombre', async () => {
      req.body = { nombre: 'Grupo A', coordinador_id: 1 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // Coordinador
      
      const dupError: any = new Error('Duplicate entry uq_grupo_nombre');
      dupError.code = 'ER_DUP_ENTRY';
      dupError.message = 'uq_grupo_nombre';
      (pool.execute as any).mockRejectedValueOnce(dupError);

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Ya existe un grupo con ese nombre' });
    });

    it('debería retornar 400 si hay error ER_DUP_ENTRY por coordinador', async () => {
      req.body = { nombre: 'Grupo A', coordinador_id: 1 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // Coordinador
      
      const dupError: any = new Error('Duplicate entry');
      dupError.code = 'ER_DUP_ENTRY';
      dupError.message = 'other_constraint';
      (pool.execute as any).mockRejectedValueOnce(dupError);

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Este coordinador ya tiene un grupo asignado' });
    });

    it('debería retornar 500 en caso de otros errores de BD', async () => {
      req.body = { nombre: 'Grupo A', coordinador_id: 1 };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await createGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('updateGrupo', () => {
    it('debería retornar 400 si faltan campos obligatorios', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Grupo A' };

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Los campos nombre y coordinador_id son requeridos' });
    });

    it('debería retornar 404 si el coordinador no existe', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Grupo A', coordinador_id: 99 };
      (pool.execute as any).mockResolvedValueOnce([[]]); // Coordinador no encontrado

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'El coordinador indicado no existe' });
    });

    it('debería retornar 200 al actualizar un grupo exitosamente', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Grupo B', coordinador_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }]]); // Coordinador
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]); // Update

      await updateGrupo(req as Request, res as Response);

      expect(pool.execute).toHaveBeenLastCalledWith(
        'UPDATE grupo SET nombre = ?, coordinador_id = ? WHERE id = ?',
        ['Grupo B', 2, '1']
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({
        mensaje: 'Grupo actualizado exitosamente',
        grupo: { id: 1, nombre: 'Grupo B', coordinador_id: 2 }
      });
    });

    it('debería retornar 404 si el grupo no se encuentra (affectedRows === 0)', async () => {
      req.params = { id: '99' };
      req.body = { nombre: 'Grupo B', coordinador_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }]]); // Coordinador
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 0 }]); // Update fallido

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Grupo no encontrado' });
    });

    it('debería retornar 400 si hay error ER_DUP_ENTRY por nombre', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Grupo A', coordinador_id: 1 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // Coordinador
      
      const dupError: any = new Error('Duplicate entry uq_grupo_nombre');
      dupError.code = 'ER_DUP_ENTRY';
      dupError.message = 'uq_grupo_nombre';
      (pool.execute as any).mockRejectedValueOnce(dupError);

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Ya existe un grupo con ese nombre' });
    });

    it('debería retornar 400 si hay error ER_DUP_ENTRY por coordinador', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Grupo A', coordinador_id: 1 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]); // Coordinador
      
      const dupError: any = new Error('Duplicate entry');
      dupError.code = 'ER_DUP_ENTRY';
      dupError.message = 'other_constraint';
      (pool.execute as any).mockRejectedValueOnce(dupError);

      await updateGrupo(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Este coordinador ya tiene un grupo asignado' });
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Grupo B', coordinador_id: 2 };
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
