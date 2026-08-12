import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import pool from '../../config/db';
import {
  getEventos,
  getEventoById,
  getReservasDisponibles,
  createEvento,
  updateEvento,
  deleteEvento
} from '../evento.controller';

vi.mock('../../config/db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

describe('Evento Controller - Pruebas Unitarias', () => {
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

  describe('getEventos', () => {
    it('debería retornar 200 y la lista de eventos', async () => {
      const mockRows = [{ id: 1, descripcion: 'Evento 1' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getEventos(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      (pool.execute as any).mockRejectedValue(new Error('DB Error'));

      await getEventos(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getEventoById', () => {
    it('debería retornar 200 y el evento si existe', async () => {
      req.params = { id: '1' };
      const mockRows = [{ id: 1, descripcion: 'Evento 1' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getEventoById(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(expect.any(String), ['1']);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows[0]);
    });

    it('debería retornar 404 si no existe', async () => {
      req.params = { id: '99' };
      (pool.execute as any).mockResolvedValue([[]]);

      await getEventoById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Evento no encontrado' });
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockRejectedValue(new Error('DB Error'));

      await getEventoById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getReservasDisponibles', () => {
    it('debería retornar 200 y las reservas disponibles', async () => {
      const mockRows = [{ id: 1, fecha: '2026-08-11' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getReservasDisponibles(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      (pool.execute as any).mockRejectedValue(new Error('DB Error'));

      await getReservasDisponibles(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('createEvento', () => {
    it('debería retornar 400 si faltan campos obligatorios', async () => {
      req.body = { descripcion: 'Hola' }; // falta reserva_id

      await createEvento(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Los campos descripcion y reserva_id son requeridos' });
    });

    it('debería retornar 404 si la reserva no existe', async () => {
      req.body = { descripcion: 'Hola', reserva_id: 99 };
      (pool.execute as any).mockResolvedValueOnce([[]]); // No se encontró reserva

      await createEvento(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'La reserva indicada no existe' });
    });

    it('debería retornar 400 si la reserva no está confirmada (estado !== 2)', async () => {
      req.body = { descripcion: 'Hola', reserva_id: 1 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, estado_reserva_id: 1, solicitante_id: 5 }]]); // Estado 1

      await createEvento(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Solo se pueden asociar eventos a reservas confirmadas' });
    });

    it('debería retornar 201 y crear evento si todo es válido', async () => {
      req.body = { descripcion: 'Hola', reserva_id: 1 };
      // Select reserva
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, estado_reserva_id: 2, solicitante_id: 5 }]]);
      // Insert evento
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 10 }]);

      await createEvento(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledTimes(2);
      expect(pool.execute).toHaveBeenLastCalledWith(
        'INSERT INTO evento (descripcion, encargado_id, reserva_id) VALUES (?, ?, ?)',
        ['Hola', 5, 1]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith({
        mensaje: 'Evento creado exitosamente',
        evento: { id: 10, descripcion: 'Hola', encargado_id: 5, reserva_id: 1 }
      });
    });

    it('debería retornar 400 si hay error ER_DUP_ENTRY', async () => {
      req.body = { descripcion: 'Hola', reserva_id: 1 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, estado_reserva_id: 2, solicitante_id: 5 }]]);
      
      const dupError: any = new Error('Duplicate');
      dupError.code = 'ER_DUP_ENTRY';
      (pool.execute as any).mockRejectedValueOnce(dupError);

      await createEvento(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Esta reserva ya tiene un evento asignado' });
    });

    it('debería retornar 500 en caso de otros errores de BD', async () => {
      req.body = { descripcion: 'Hola', reserva_id: 1 };
      (pool.execute as any).mockRejectedValue(new Error('DB Error'));

      await createEvento(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('updateEvento', () => {
    it('debería retornar 400 si falta descripcion', async () => {
      req.params = { id: '1' };
      req.body = {};

      await updateEvento(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'El campo descripcion es requerido' });
    });

    it('debería retornar 200 al actualizar un evento exitosamente', async () => {
      req.params = { id: '1' };
      req.body = { descripcion: 'Nueva desc' };
      (pool.execute as any).mockResolvedValue([{ affectedRows: 1 }]);

      await updateEvento(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith('UPDATE evento SET descripcion = ? WHERE id = ?', ['Nueva desc', '1']);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Evento actualizado exitosamente' });
    });

    it('debería retornar 404 si el evento no se encuentra (affectedRows === 0)', async () => {
      req.params = { id: '99' };
      req.body = { descripcion: 'Nueva desc' };
      (pool.execute as any).mockResolvedValue([{ affectedRows: 0 }]);

      await updateEvento(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Evento no encontrado' });
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      req.body = { descripcion: 'Nueva desc' };
      (pool.execute as any).mockRejectedValue(new Error('DB Error'));

      await updateEvento(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('deleteEvento', () => {
    it('debería retornar 204 al eliminar un evento exitosamente', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockResolvedValue([{ affectedRows: 1 }]);

      await deleteEvento(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith('DELETE FROM evento WHERE id = ?', ['1']);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
      expect(sendMock).toHaveBeenCalled();
    });

    it('debería retornar 404 si el evento no existe (affectedRows === 0)', async () => {
      req.params = { id: '99' };
      (pool.execute as any).mockResolvedValue([{ affectedRows: 0 }]);

      await deleteEvento(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Evento no encontrado' });
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockRejectedValue(new Error('DB Error'));

      await deleteEvento(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
