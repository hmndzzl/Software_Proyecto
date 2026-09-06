import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import pool from '../../config/db';
import {
  solicitarCambioTurno,
  getCambiosTurno,
  responderCambioTurno,
} from '../cambioTurno.controller';

vi.mock('../../config/db', () => ({
  default: {
    execute: vi.fn(),
    getConnection: vi.fn(),
  },
}));

describe('CambioTurno Controller - Pruebas Unitarias (HU-23)', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;
  let sendMock: any;
  let mockConnection: any;

  beforeEach(() => {
    req = {
      user: { id: 1 } as any,
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

    mockConnection = {
      beginTransaction: vi.fn(),
      execute: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    (pool.getConnection as any).mockResolvedValue(mockConnection);

    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const tareaBase = { id: 5, descripcion: 'Lectura misa 10am', fecha: '2026-09-20', hora_inicio: '10:00:00', hora_fin: '11:00:00' };

  describe('solicitarCambioTurno', () => {
    it('debería retornar 400 si faltan tarea_id o destinatario_id', async () => {
      req.body = { tarea_id: 5 };

      await solicitarCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('debería retornar 400 si el destinatario es el mismo solicitante', async () => {
      req.body = { tarea_id: 5, destinatario_id: 1 };

      await solicitarCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('debería retornar 404 si la tarea no existe', async () => {
      req.body = { tarea_id: 99, destinatario_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[]]); // SELECT tarea -> no hay

      await solicitarCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 403 si el solicitante no está asignado a la tarea', async () => {
      req.body = { tarea_id: 5, destinatario_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]); // SELECT tarea
      (pool.execute as any).mockResolvedValueOnce([[]]); // SELECT asignacion -> no está asignado

      await solicitarCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería retornar 404 si el ministro destinatario no existe', async () => {
      req.body = { tarea_id: 5, destinatario_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ nombre: 'Juan' }]]); // asignacion ok
      (pool.execute as any).mockResolvedValueOnce([[]]); // SELECT persona destinatario -> no existe

      await solicitarCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 409 si ya existe una solicitud pendiente para ese destinatario en esa tarea', async () => {
      req.body = { tarea_id: 5, destinatario_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ nombre: 'Juan' }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }]]); // destinatario existe
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]); // ya hay pendiente

      await solicitarCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(pool.getConnection).not.toHaveBeenCalled();
    });

    it('debería retornar 409 si el destinatario ya tiene una tarea asignada en ese horario', async () => {
      req.body = { tarea_id: 5, destinatario_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ nombre: 'Juan' }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]); // sin pendientes
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]); // conflicto de horario

      await solicitarCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(pool.getConnection).not.toHaveBeenCalled();
    });

    it('debería retornar 201 y crear la solicitud con notificación en una transacción', async () => {
      req.body = { tarea_id: 5, destinatario_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ nombre: 'Juan' }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      mockConnection.execute
        .mockResolvedValueOnce([{ insertId: 50 }]) // INSERT notificacion
        .mockResolvedValueOnce([{}]) // INSERT persona_notificacion
        .mockResolvedValueOnce([{ insertId: 7 }]); // INSERT cambio_turno

      await solicitarCambioTurno(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        cambio_turno: expect.objectContaining({
          id: 7,
          tarea_id: 5,
          solicitante_id: 1,
          destinatario_id: 2,
          estado: 'pendiente',
        }),
      }));
    });

    it('debería hacer rollback y retornar 500 si falla la transacción', async () => {
      req.body = { tarea_id: 5, destinatario_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ nombre: 'Juan' }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      mockConnection.execute.mockRejectedValueOnce(new Error('DB Error'));

      await solicitarCambioTurno(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debería retornar 500 sin rollback si falla antes de obtener conexión', async () => {
      req.body = { tarea_id: 5, destinatario_id: 2 };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error pre-conn'));

      await solicitarCambioTurno(req as Request, res as Response);

      expect(mockConnection.rollback).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getCambiosTurno', () => {
    it('debería retornar 200 con las solicitudes del usuario', async () => {
      const mockRows = [{ id: 1, tarea_id: 5, estado: 'pendiente' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getCambiosTurno(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(expect.any(String), [1, 1]);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });

    it('debería retornar 500 en caso de error', async () => {
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await getCambiosTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('responderCambioTurno', () => {
    const cambioBase = { id: 7, tarea_id: 5, solicitante_id: 1, destinatario_id: 2, estado: 'pendiente', notificacion_id: 50 };

    beforeEach(() => {
      req.user = { id: 2 } as any; // el destinatario es quien responde
      req.params = { id: '7' };
    });

    it('debería retornar 400 si aceptar no es boolean', async () => {
      req.body = {};

      await responderCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('debería retornar 404 si la solicitud no existe', async () => {
      req.body = { aceptar: true };
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await responderCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 403 si quien responde no es el destinatario', async () => {
      req.body = { aceptar: true };
      req.user = { id: 99 } as any;
      (pool.execute as any).mockResolvedValueOnce([[cambioBase]]);

      await responderCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería retornar 409 si la solicitud ya fue respondida', async () => {
      req.body = { aceptar: true };
      (pool.execute as any).mockResolvedValueOnce([[{ ...cambioBase, estado: 'aceptado' }]]);

      await responderCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    });

    it('debería retornar 404 si la tarea asociada ya no existe', async () => {
      req.body = { aceptar: true };
      (pool.execute as any).mockResolvedValueOnce([[cambioBase]]);
      (pool.execute as any).mockResolvedValueOnce([[]]); // SELECT tarea -> no existe

      await responderCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería rechazar la solicitud y notificar al solicitante en una transacción', async () => {
      req.body = { aceptar: false };
      (pool.execute as any).mockResolvedValueOnce([[cambioBase]]);
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE cambio_turno rechazado
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // marcarNotificacionLeida
        .mockResolvedValueOnce([{ insertId: 51 }]) // INSERT notificacion al solicitante
        .mockResolvedValueOnce([{}]); // INSERT persona_notificacion

      await responderCambioTurno(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ mensaje: 'Cambio de turno rechazado', tarea_id: 5 }));
    });

    it('debería retornar 409 al aceptar si el solicitante ya no está asignado a la tarea', async () => {
      req.body = { aceptar: true };
      (pool.execute as any).mockResolvedValueOnce([[cambioBase]]);
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[]]); // ya no está asignado

      await responderCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(pool.getConnection).not.toHaveBeenCalled();
    });

    it('debería retornar 409 al aceptar si el destinatario ya tiene otra tarea en ese horario', async () => {
      req.body = { aceptar: true };
      (pool.execute as any).mockResolvedValueOnce([[cambioBase]]);
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]); // sigue asignado
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]); // conflicto de horario

      await responderCambioTurno(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(pool.getConnection).not.toHaveBeenCalled();
    });

    it('debería aceptar el cambio y actualizar el titular de la tarea automáticamente', async () => {
      req.body = { aceptar: true };
      (pool.execute as any).mockResolvedValueOnce([[cambioBase]]);
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]); // solicitante sigue asignado
      (pool.execute as any).mockResolvedValueOnce([[]]); // sin conflicto de horario

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // DELETE asignacion_tarea del solicitante
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // INSERT IGNORE asignacion_tarea del destinatario
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE cambio_turno aceptado
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // marcarNotificacionLeida
        .mockResolvedValueOnce([{ insertId: 52 }]) // INSERT notificacion al solicitante
        .mockResolvedValueOnce([{}]); // INSERT persona_notificacion

      await responderCambioTurno(req as Request, res as Response);

      expect(mockConnection.execute).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('DELETE FROM asignacion_tarea'),
        [5, 1]
      );
      expect(mockConnection.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT IGNORE INTO asignacion_tarea'),
        [5, 2]
      );
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        mensaje: 'Cambio de turno aceptado, titular actualizado automáticamente',
        tarea_id: 5,
        nuevo_titular: 2,
      }));
    });

    it('debería hacer rollback y retornar 500 si falla la transacción al aceptar', async () => {
      req.body = { aceptar: true };
      (pool.execute as any).mockResolvedValueOnce([[cambioBase]]);
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      mockConnection.execute.mockRejectedValueOnce(new Error('DB Error'));

      await responderCambioTurno(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debería retornar 500 sin rollback si falla antes de obtener conexión', async () => {
      req.body = { aceptar: true };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error pre-conn'));

      await responderCambioTurno(req as Request, res as Response);

      expect(mockConnection.rollback).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
