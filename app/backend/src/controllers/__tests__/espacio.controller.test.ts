import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import pool from '../../config/db';
import {
  obtenerEspacios,
  obtenerEspacioPorId,
  crearEspacio,
  actualizarEspacio,
  eliminarEspacio
} from '../espacio.controller';

vi.mock('../../config/db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

describe('Espacio Controller - Pruebas Unitarias', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    res = {
      status: statusMock,
      json: jsonMock,
    };

    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('obtenerEspacios', () => {
    it('debería retornar 400 si se envía un parámetro de fecha/hora pero faltan otros', async () => {
      req.query = { fecha: '2026-08-11' }; // Faltan hora_inicio y hora_fin
      await obtenerEspacios(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Debe enviar fecha, hora_inicio y hora_fin para consultar disponibilidad' });
    });

    it('debería retornar todos los espacios si no se envía ningún parámetro', async () => {
      req.query = {};
      const mockEspacios = [{ id: 1, nombre: 'Sala A' }];
      (pool.execute as any).mockResolvedValue([mockEspacios]);

      await obtenerEspacios(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith('SELECT * FROM espacio ORDER BY nombre ASC');
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockEspacios);
    });

    it('debería retornar 400 si hora_inicio >= hora_fin', async () => {
      req.query = { fecha: '2026-08-11', hora_inicio: '10:00', hora_fin: '09:00' };
      await obtenerEspacios(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'La hora de inicio debe ser menor que la hora de fin' });
    });

    it('debería retornar los espacios con el flag de disponible correctamente calculado', async () => {
      req.query = { fecha: '2026-08-11', hora_inicio: '10:00', hora_fin: '11:00' };
      const mockEspacios = [
        { id: 1, nombre: 'Sala A', disponible: 1 },
        { id: 2, nombre: 'Sala B', disponible: 0 }
      ];
      (pool.execute as any).mockResolvedValue([mockEspacios]);

      await obtenerEspacios(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith([
        { id: 1, nombre: 'Sala A', disponible: true },
        { id: 2, nombre: 'Sala B', disponible: false }
      ]);
    });

    it('debería retornar 500 en caso de error de base de datos', async () => {
      req.query = {};
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await obtenerEspacios(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Error interno al obtener los espacios' });
    });
  });

  describe('obtenerEspacioPorId', () => {
    it('debería retornar 200 y el espacio si se encuentra el ID', async () => {
      req.params = { id: '1' };
      const mockEspacio = [{ id: 1, nombre: 'Sala A' }];
      (pool.execute as any).mockResolvedValue([mockEspacio]);

      await obtenerEspacioPorId(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith('SELECT * FROM espacio WHERE id = ?', ['1']);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockEspacio[0]);
    });

    it('debería retornar 404 si el espacio no existe', async () => {
      req.params = { id: '99' };
      (pool.execute as any).mockResolvedValue([[]]); // Array vacío

      await obtenerEspacioPorId(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Espacio no encontrado' });
    });

    it('debería retornar 500 en caso de error de base de datos', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await obtenerEspacioPorId(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('crearEspacio', () => {
    it('debería retornar 201 al crearlo con nombre y capacidad válidos', async () => {
      req.body = { nombre: 'Sala Nueva', capacidad: 10 };
      (pool.execute as any).mockResolvedValue([{ insertId: 5 }]);

      await crearEspacio(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(
        'INSERT INTO espacio (nombre, capacidad) VALUES (?, ?)',
        ['Sala Nueva', 10]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Espacio creado exitosamente', espacioId: 5 });
    });

    it('debería usar null para capacidad si no se envía, retornando 201', async () => {
      req.body = { nombre: 'Sala Sin Capacidad' };
      (pool.execute as any).mockResolvedValue([{ insertId: 6 }]);

      await crearEspacio(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(
        'INSERT INTO espacio (nombre, capacidad) VALUES (?, ?)',
        ['Sala Sin Capacidad', null]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('debería retornar 400 si falta el nombre', async () => {
      req.body = { capacidad: 10 };

      await crearEspacio(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'El nombre del espacio es obligatorio' });
    });

    it('debería retornar 400 si la capacidad es menor o igual a 0', async () => {
      req.body = { nombre: 'Sala Mala', capacidad: 0 };

      await crearEspacio(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'La capacidad debe ser mayor a 0' });
    });

    it('debería retornar 500 en caso de error de base de datos', async () => {
      req.body = { nombre: 'Sala' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await crearEspacio(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('actualizarEspacio', () => {
    it('debería retornar 200 al actualizar un espacio existente', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Sala Editada', capacidad: 20 };
      
      // Primera llamada: verificar existencia
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]);
      // Segunda llamada: update
      (pool.execute as any).mockResolvedValueOnce([{}]);

      await actualizarEspacio(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledTimes(2);
      expect(pool.execute).toHaveBeenLastCalledWith(
        'UPDATE espacio SET nombre = ?, capacidad = ? WHERE id = ?',
        ['Sala Editada', 20, '1']
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Espacio actualizado exitosamente' });
    });

    it('debería usar null si no se envía capacidad al actualizar, retornando 200', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Sala Editada' }; // Sin capacidad
      
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([{}]);

      await actualizarEspacio(req as Request, res as Response);

      expect(pool.execute).toHaveBeenLastCalledWith(
        'UPDATE espacio SET nombre = ?, capacidad = ? WHERE id = ?',
        ['Sala Editada', null, '1']
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería retornar 400 si falta el nombre', async () => {
      req.params = { id: '1' };
      req.body = { capacidad: 20 };

      await actualizarEspacio(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'El nombre del espacio es obligatorio' });
    });

    it('debería retornar 400 si la capacidad es menor o igual a 0', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'A', capacidad: -5 };

      await actualizarEspacio(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'La capacidad debe ser mayor a 0' });
    });

    it('debería retornar 404 si el espacio a actualizar no existe', async () => {
      req.params = { id: '99' };
      req.body = { nombre: 'Sala' };
      
      // Simular array vacío en la verificación
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await actualizarEspacio(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Espacio no encontrado' });
    });

    it('debería retornar 500 en caso de error de base de datos', async () => {
      req.params = { id: '1' };
      req.body = { nombre: 'Sala' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await actualizarEspacio(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('eliminarEspacio', () => {
    it('debería retornar 200 al eliminar un espacio existente', async () => {
      req.params = { id: '1' };
      
      // Primera llamada: verificar existencia
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1 }]]);
      // Segunda llamada: delete
      (pool.execute as any).mockResolvedValueOnce([{}]);

      await eliminarEspacio(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledTimes(2);
      expect(pool.execute).toHaveBeenLastCalledWith('DELETE FROM espacio WHERE id = ?', ['1']);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Espacio eliminado exitosamente' });
    });

    it('debería retornar 404 si el espacio a eliminar no existe', async () => {
      req.params = { id: '99' };
      
      // Simular array vacío en la verificación
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await eliminarEspacio(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Espacio no encontrado' });
    });

    it('debería retornar 500 en caso de error de base de datos', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await eliminarEspacio(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
