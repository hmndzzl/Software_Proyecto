import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import { ROLES } from '../../config/roles';
import { TOPE_SERVICIOS_MES } from '../../config/constants';
import pool from '../../config/db';
import {
  getTareas,
  getTareaById,
  createTarea,
  updateTarea,
  deleteTarea,
  asignarTarea,
  desasignarTarea,
  reasignarTarea
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

    it('debería retornar persona_nombre como null si la tarea no tiene asignados', async () => {
      req.query = {};
      const mockTareas = [{ id: 1, descripcion: 'Tarea Sin Asignados' }];
      const mockAsignados: any[] = [];

      (pool.execute as any).mockResolvedValueOnce([mockTareas]);
      (pool.execute as any).mockResolvedValueOnce([mockAsignados]);

      await getTareas(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith([
        { ...mockTareas[0], asignados: [], persona_nombre: null },
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

    it('debería retornar 200 al actualizar exitosamente (Admin)', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      req.user = { id: 1, rol_id: ROLES.ADMIN } as any;
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      await updateTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería retornar 200 al actualizar exitosamente (Sacerdote)', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      req.user = { id: 1, rol_id: ROLES.SACERDOTE } as any;
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      await updateTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería retornar 403 si un Ministro intenta editar una tarea', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      req.user = { id: 9, rol_id: ROLES.MINISTRO } as any;

      await updateTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('debería retornar 403 si un Coordinador de Grupos intenta editar una tarea', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      req.user = { id: 8, rol_id: ROLES.COORDINADOR_GRUPOS } as any;

      await updateTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('debería permitir a un Coordinador de Ministros editar una tarea de su propio ministro', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      req.user = { id: 7, rol_id: ROLES.COORDINADOR_MINISTROS } as any;
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]); // autorizado
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE

      await updateTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería retornar 403 si el Coordinador de Ministros no coordina a ningún asignado de la tarea', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      req.user = { id: 13, rol_id: ROLES.COORDINADOR_MINISTROS } as any;
      (pool.execute as any).mockResolvedValueOnce([[]]); // no autorizado

      await updateTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería retornar 404 si la tarea no existe', async () => {
      req.params = { id: '99' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      req.user = { id: 1, rol_id: ROLES.ADMIN } as any;
      (pool.execute as any).mockResolvedValueOnce([{ affectedRows: 0 }]);

      await updateTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', descripcion: 'D' };
      req.user = { id: 1, rol_id: ROLES.ADMIN } as any;
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
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, descripcion: 'D', fecha: '2026-08-15', hora_inicio: '09:00:00', hora_fin: '10:00:00' }]]); // SELECT tarea
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2, disponible: 1 }]]); // SELECT persona
      (pool.execute as any).mockResolvedValueOnce([[{ total: 0 }]]); // conteo servicios del mes
      (pool.execute as any).mockResolvedValueOnce([[]]); // SELECT conflictos de horario - ninguno

      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT asignacion (nueva)
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 10 }]); // INSERT notif
      mockConnection.execute.mockResolvedValueOnce([{}]); // INSERT persona_notif

      await asignarTarea(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        alerta: {
          ministro_no_disponible: false,
          tope_servicios_superado: false,
          servicios_en_el_mes: 1,
          tope_servicios_mes: TOPE_SERVICIOS_MES,
        },
      }));
    });

    it('debería retornar 201 y no crear notificación si la asignación ya existía (IGNORE)', async () => {
      req.body = { tarea_id: 1, persona_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, descripcion: 'D', fecha: '2026-08-15', hora_inicio: '09:00:00', hora_fin: '10:00:00' }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2, disponible: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ total: 1 }]]); // ya tenía 1 servicio este mes (la propia tarea)
      (pool.execute as any).mockResolvedValueOnce([[]]);

      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 0 }]); // INSERT asignacion (ya existía)

      await asignarTarea(req as Request, res as Response);

      expect(mockConnection.execute).toHaveBeenCalledTimes(1); // Solo el primer insert
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      // No fue una asignación nueva, el conteo no suma +1
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        alerta: expect.objectContaining({ servicios_en_el_mes: 1 }),
      }));
    });

    it('debería marcar ministro_no_disponible en la alerta sin bloquear la asignación', async () => {
      req.body = { tarea_id: 1, persona_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, descripcion: 'D', fecha: '2026-08-15', hora_inicio: '09:00:00', hora_fin: '10:00:00' }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2, disponible: 0 }]]); // marcado no disponible
      (pool.execute as any).mockResolvedValueOnce([[{ total: 0 }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 10 }]);
      mockConnection.execute.mockResolvedValueOnce([{}]);

      await asignarTarea(req as Request, res as Response);

      // No bloquea: sigue siendo 201, solo informa vía "alerta"
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        alerta: expect.objectContaining({ ministro_no_disponible: true }),
      }));
    });

    it('debería marcar tope_servicios_superado cuando ya alcanzó el tope mensual', async () => {
      req.body = { tarea_id: 1, persona_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, descripcion: 'D', fecha: '2026-08-15', hora_inicio: '09:00:00', hora_fin: '10:00:00' }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2, disponible: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ total: TOPE_SERVICIOS_MES }]]); // ya al tope antes de esta asignación
      (pool.execute as any).mockResolvedValueOnce([[]]);

      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 10 }]);
      mockConnection.execute.mockResolvedValueOnce([{}]);

      await asignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        alerta: expect.objectContaining({
          tope_servicios_superado: true,
          servicios_en_el_mes: TOPE_SERVICIOS_MES + 1,
        }),
      }));
    });

    it('debería retornar 409 si hay conflicto de horario, sin llegar a insertar', async () => {
      req.body = { tarea_id: 1, persona_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, descripcion: 'D', fecha: '2026-08-15', hora_inicio: '09:00:00', hora_fin: '10:00:00' }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2, disponible: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ total: 0 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]); // hay conflicto de horario

      await asignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockConnection.execute).not.toHaveBeenCalled();
    });

    it('debería hacer rollback y retornar 500 en caso de error de BD', async () => {
      req.body = { tarea_id: 1, persona_id: 2 };
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, descripcion: 'D', fecha: '2026-08-15', hora_inicio: '09:00:00', hora_fin: '10:00:00' }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 2, disponible: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ total: 0 }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

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

  describe('reasignarTarea', () => {
    const tareaBase = { id: 1, fecha: '2026-08-15', hora_inicio: '09:00:00', hora_fin: '10:00:00' };

    it('debería retornar 400 si faltan ids', async () => {
      req.body = { tarea_id: 1, persona_actual_id: 2 };

      await reasignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('debería retornar 400 si el nuevo responsable es el mismo que el actual', async () => {
      req.body = { tarea_id: 1, persona_actual_id: 2, persona_nueva_id: 2 };

      await reasignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('debería retornar 404 si la tarea no existe', async () => {
      req.body = { tarea_id: 99, persona_actual_id: 2, persona_nueva_id: 3 };
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await reasignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 404 si la persona actual no está asignada a la tarea', async () => {
      req.body = { tarea_id: 1, persona_actual_id: 2, persona_nueva_id: 3 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await reasignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 404 si la nueva persona no existe', async () => {
      req.body = { tarea_id: 1, persona_actual_id: 2, persona_nueva_id: 3 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await reasignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 409 si el nuevo responsable ya tiene una tarea en ese horario', async () => {
      req.body = { tarea_id: 1, persona_actual_id: 2, persona_nueva_id: 3 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 3, disponible: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ total: 0 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]);

      await reasignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(pool.getConnection).not.toHaveBeenCalled();
    });

    it('debería reasignar correctamente en una transacción', async () => {
      req.body = { tarea_id: 1, persona_actual_id: 2, persona_nueva_id: 3 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 3, disponible: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ total: 0 }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // DELETE
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT IGNORE

      await reasignarTarea(req as Request, res as Response);

      expect(mockConnection.execute).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('DELETE FROM asignacion_tarea'),
        [1, 2]
      );
      expect(mockConnection.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT IGNORE INTO asignacion_tarea'),
        [1, 3]
      );
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        mensaje: 'Responsable reasignado correctamente',
        tarea_id: 1,
        persona_anterior_id: 2,
        persona_nueva_id: 3,
        alerta: {
          ministro_no_disponible: false,
          tope_servicios_superado: false,
          servicios_en_el_mes: 1,
          tope_servicios_mes: TOPE_SERVICIOS_MES,
        },
      }));
    });

    it('debería marcar ministro_no_disponible en la alerta sin bloquear la reasignación', async () => {
      req.body = { tarea_id: 1, persona_actual_id: 2, persona_nueva_id: 3 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 3, disponible: 0 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ total: 0 }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await reasignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        alerta: expect.objectContaining({ ministro_no_disponible: true }),
      }));
    });

    it('debería marcar tope_servicios_superado cuando ya alcanzó el tope mensual', async () => {
      req.body = { tarea_id: 1, persona_actual_id: 2, persona_nueva_id: 3 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 3, disponible: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ total: TOPE_SERVICIOS_MES }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await reasignarTarea(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        alerta: expect.objectContaining({
          tope_servicios_superado: true,
          servicios_en_el_mes: TOPE_SERVICIOS_MES + 1,
        }),
      }));
    });

    it('debería hacer rollback y retornar 500 en caso de error de BD', async () => {
      req.body = { tarea_id: 1, persona_actual_id: 2, persona_nueva_id: 3 };
      (pool.execute as any).mockResolvedValueOnce([[tareaBase]]);
      (pool.execute as any).mockResolvedValueOnce([[{ 1: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ id: 3, disponible: 1 }]]);
      (pool.execute as any).mockResolvedValueOnce([[{ total: 0 }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      mockConnection.execute.mockRejectedValueOnce(new Error('DB Error'));

      await reasignarTarea(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debería retornar 500 sin rollback si falla antes de obtener conexión', async () => {
      req.body = { tarea_id: 1, persona_actual_id: 2, persona_nueva_id: 3 };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error pre-conn'));

      await reasignarTarea(req as Request, res as Response);

      expect(mockConnection.rollback).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
