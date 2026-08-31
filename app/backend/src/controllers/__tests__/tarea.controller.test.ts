import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import pool from '../../config/db';
import {
  getTareas,
  getTareaById,
  createTarea,
  updateTarea,
  deleteTarea,
  asignarTarea,
  desasignarTarea
} from '../tarea.controller';

vi.mock('../../config/db', () => ({
  default: {
    execute: vi.fn(),
    getConnection: vi.fn(),
  },
}));

describe('Tarea Controller - Pruebas Unitarias', () => {
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
      query: {},
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

  describe('getTareas', () => {
    it('debería retornar 200 y tareas sin filtros', async () => {
      req.query = {};
      const mockTareas = [{ id: 1, descripcion: 'Tarea 1' }];
      const mockAsignados = [{ persona_id: 1, nombre: 'Juan' }];
      
      // Primera query (tareas)
      (pool.execute as any).mockResolvedValueOnce([mockTareas]);
      // Segunda query (asignados para la tarea 1)
      (pool.execute as any).mockResolvedValueOnce([mockAsignados]);

      await getTareas(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledTimes(2);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith([
        { ...mockTareas[0], asignados: mockAsignados, persona_nombre: 'Juan' },
      ]);
    });

    it('debería retornar 200 y tareas con filtros (fecha_inicio, fecha_fin, persona_id)', async () => {
      req.query = { fecha_inicio: '2026-08-01', fecha_fin: '2026-08-31', persona_id: '1' };
      const mockTareas = [{ id: 1, descripcion: 'Tarea 1' }];
      const mockAsignados = [{ persona_id: 1, nombre: 'Juan' }];
      
      (pool.execute as any).mockResolvedValueOnce([mockTareas]);
      (pool.execute as any).mockResolvedValueOnce([mockAsignados]);

      await getTareas(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.fecha >= ? AND t.fecha <= ? AND at.persona_id = ?'),
        ['2026-08-01', '2026-08-31', 1]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería retornar 200 con solo filtro de fecha_inicio', async () => {
      req.query = { fecha_inicio: '2026-08-01' };
      (pool.execute as any).mockResolvedValue([[]]);
      await getTareas(req as Request, res as Response);
      expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('WHERE t.fecha >= ?'), ['2026-08-01']);
    });

    it('debería retornar 200 con solo filtro de fecha_fin', async () => {
      req.query = { fecha_fin: '2026-08-31' };
      (pool.execute as any).mockResolvedValue([[]]);
      await getTareas(req as Request, res as Response);
      expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('WHERE t.fecha <= ?'), ['2026-08-31']);
    });

    it('no debe unir con asignacion_tarea al filtrar solo por fechas (evita duplicados)', async () => {
      req.query = { fecha_inicio: '2026-08-31', fecha_fin: '2026-09-06' };
      (pool.execute as any).mockResolvedValue([[]]);

      await getTareas(req as Request, res as Response);

      const [query] = (pool.execute as any).mock.calls[0];
      expect(query).not.toContain('JOIN asignacion_tarea');
    });

    it('une con asignacion_tarea solo cuando se filtra por persona_id', async () => {
      req.query = { persona_id: '1' };
      (pool.execute as any).mockResolvedValue([[]]);

      await getTareas(req as Request, res as Response);

      const [query] = (pool.execute as any).mock.calls[0];
      expect(query).toContain('JOIN asignacion_tarea');
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await getTareas(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getTareaById', () => {
    it('debería retornar 200 y la tarea con asignados', async () => {
      req.params = { id: '1' };
      const mockTarea = { id: 1, descripcion: 'Tarea 1' };
      const mockAsignados = [{ persona_id: 1, nombre: 'Juan' }];
      
      (pool.execute as any).mockResolvedValueOnce([[mockTarea]]);
      (pool.execute as any).mockResolvedValueOnce([mockAsignados]);

      await getTareaById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({ ...mockTarea, asignados: mockAsignados });
    });

    it('debería retornar 404 si la tarea no existe', async () => {
      req.params = { id: '99' };
      (pool.execute as any).mockResolvedValueOnce([[]]); // No tarea

      await getTareaById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await getTareaById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('createTarea', () => {
    it('debería retornar 400 si faltan campos', async () => {
      req.body = { fecha: '2026-08-12' };

      await createTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 400 si hora_inicio >= hora_fin', async () => {
      req.body = { fecha: '2026-08-12', hora_inicio: '15:40', hora_fin: '15:40', descripcion: 'D' };

      await createTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('debería retornar 201 y crear la tarea', async () => {
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      (pool.execute as any).mockResolvedValueOnce([{ insertId: 5 }]);

      await createTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ mensaje: 'Tarea creada exitosamente' }));
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await createTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('updateTarea', () => {
    it('debería retornar 400 si faltan campos', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12' };

      await updateTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 400 si hora_inicio >= hora_fin', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '16:00', hora_fin: '15:00', descripcion: 'D' };

      await updateTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('debería retornar 200 al actualizar exitosamente', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      await updateTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería retornar 404 si la tarea no existe', async () => {
      req.params = { id: '99' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 0 }]);

      await updateTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await updateTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('deleteTarea', () => {
    it('debería retornar 204 al eliminar', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      await deleteTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
    });

    it('debería retornar 404 si no se encuentra', async () => {
      req.params = { id: '99' };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 0 }]);

      await deleteTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await deleteTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('asignarTarea', () => {
    it('debería retornar 400 si faltan ids', async () => {
      req.body = { tarea_id: 1 };

      await asignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 404 si la tarea no existe', async () => {
      req.body = { tarea_id: 99, persona_id: 1 };
      (pool.execute as any).mockResolvedValueOnce([[]]); // SELECT tarea -> no hay

      await asignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 404 si la persona no existe', async () => {
      req.body = { tarea_id: 1, persona_id: 99 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, descripcion: 'D' }]]); // SELECT tarea
      (pool.execute as any).mockResolvedValueOnce([[]]); // SELECT persona -> no hay

      await asignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 201 y asignar creando notificación', async () => {
      req.body = { tarea_id: 1, persona_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, descripcion: 'D' }]]); // SELECT tarea
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }]]); // SELECT persona
      
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT asignacion (nueva)
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 10 }]); // INSERT notif
      mockConnection.execute.mockResolvedValueOnce([{}]); // INSERT persona_notif

      await asignarTarea(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('debería retornar 201 y no crear notificación si la asignación ya existía (IGNORE)', async () => {
      req.body = { tarea_id: 1, persona_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, descripcion: 'D' }]]); 
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }]]); 
      
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 0 }]); // INSERT asignacion (ya existía)

      await asignarTarea(req as Request, res as Response);

      expect(mockConnection.execute).toHaveBeenCalledTimes(1); // Solo el primer insert
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('debería hacer rollback y retornar 500 en caso de error de BD', async () => {
      req.body = { tarea_id: 1, persona_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, descripcion: 'D' }]]); 
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2 }]]); 
      
      mockConnection.execute.mockRejectedValueOnce(new Error('DB Error'));

      await asignarTarea(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debería retornar 500 sin rollback si falla antes de obtener conexión', async () => {
      req.body = { tarea_id: 1, persona_id: 2 };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error pre-conn')); 

      await asignarTarea(req as Request, res as Response);

      expect(mockConnection.rollback).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('desasignarTarea', () => {
    it('debería retornar 400 si faltan ids', async () => {
      req.body = { tarea_id: 1 };

      await desasignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 204 al eliminar asignación exitosamente', async () => {
      req.body = { tarea_id: 1, persona_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      await desasignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
    });

    it('debería retornar 404 si la asignación no existe', async () => {
      req.body = { tarea_id: 1, persona_id: 99 };
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 0 }]);

      await desasignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.body = { tarea_id: 1, persona_id: 2 };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await desasignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
