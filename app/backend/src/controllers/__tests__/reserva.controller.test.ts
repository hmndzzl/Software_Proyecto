import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import db from '../../config/db';
import { ROLES } from '../../config/roles';
import {
  crearReserva,
  editarReserva,
  obtenerMisReservas,
  obtenerReservas,
  obtenerReservaPorId,
  cambiarEstadoReserva,
  checkinReserva
} from '../reserva.controller';

vi.mock('../../config/db', () => ({
  default: {
    query: vi.fn(),
    getConnection: vi.fn(),
  },
}));

describe('Reserva Controller - Pruebas Unitarias', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;
  let sendMock: any;
  let mockConnection: any;

  beforeEach(() => {
    req = {
      user: { id: 1, rol_id: ROLES.COORDINADOR_GRUPOS } as any,
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
      query: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    (db.getConnection as any).mockResolvedValue(mockConnection);
    // crearReserva/editarReserva consultan la hora de Guatemala vía db.query antes
    // de entrar a la transacción; valor por defecto equivalente al fake time de abajo.
    (db.query as any).mockResolvedValue([[{ hoy: '2026-08-11', horaActual: '12:00' }]]);

    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => { });

    // Set fixed time to '2026-08-11T12:00:00Z'
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T12:00:00')); // Local time equivalent
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('crearReserva', () => {
    it.each(['true', 1, null])('rechaza publico inválido %s antes de escribir', async publico => {
      req.body = { publico };
      await crearReserva(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(db.getConnection).not.toHaveBeenCalled();
    });

    it.each([true, false])('rechaza configurar publico sin permiso (%s)', async publico => {
      req.body = { publico };
      await crearReserva(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(db.getConnection).not.toHaveBeenCalled();
    });
    it('debería retornar 400 si faltan campos', async () => {
      req.body = { fecha: '2026-08-12' }; // faltan los demás

      await crearReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 400 si hora_inicio >= hora_fin', async () => {
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '09:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };

      await crearReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 400 si la fecha está en el pasado', async () => {
      req.body = { fecha: '2026-08-10', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };

      await crearReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 400 si la fecha es hoy pero la hora ya pasó', async () => {
      // Hoy es 2026-08-11 12:00
      req.body = { fecha: '2026-08-11', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };

      await crearReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 409 si hay conflictos de horario', async () => {
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };
      mockConnection.query.mockResolvedValueOnce([[{ id: 2 }]]); // Hay conflicto

      await crearReserva(req as Request, res as Response);

      expect(mockConnection.release).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    });

    it('debería crear la reserva y el evento exitosamente', async () => {
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };

      mockConnection.query.mockResolvedValueOnce([[]]); // No conflictos
      mockConnection.query.mockResolvedValueOnce([{ insertId: 5 }]); // INSERT reserva
      mockConnection.query.mockResolvedValueOnce([{}]); // INSERT evento
      mockConnection.query.mockResolvedValueOnce([[]]); // SELECT aprobadores (ninguno)

      await crearReserva(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('notifica a Sacerdote y Admin (excepto al solicitante) de la nueva solicitud pendiente', async () => {
      req.user = { id: 1, rol_id: ROLES.COORDINADOR_GRUPOS } as any;
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };

      mockConnection.query.mockResolvedValueOnce([[]]); // No conflictos
      mockConnection.query.mockResolvedValueOnce([{ insertId: 5 }]); // INSERT reserva
      mockConnection.query.mockResolvedValueOnce([{}]); // INSERT evento
      mockConnection.query.mockResolvedValueOnce([[{ id: 2 }, { id: 3 }]]); // SELECT aprobadores
      mockConnection.query.mockResolvedValueOnce([{ insertId: 99 }]); // INSERT notificacion
      mockConnection.query.mockResolvedValueOnce([{}]); // INSERT persona_notificacion #1
      mockConnection.query.mockResolvedValueOnce([{}]); // INSERT persona_notificacion #2

      await crearReserva(req as Request, res as Response);

      expect(mockConnection.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('rol_id IN'),
        [ROLES.SACERDOTE, ROLES.ADMIN, 1]
      );
      expect(mockConnection.query).toHaveBeenNthCalledWith(
        6,
        expect.stringContaining('persona_notificacion'),
        [2, 99]
      );
      expect(mockConnection.query).toHaveBeenNthCalledWith(
        7,
        expect.stringContaining('persona_notificacion'),
        [3, 99]
      );
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('no notifica a nadie si el solicitante ya es el único Sacerdote/Admin', async () => {
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };

      mockConnection.query.mockResolvedValueOnce([[]]); // No conflictos
      mockConnection.query.mockResolvedValueOnce([{ insertId: 5 }]); // INSERT reserva
      mockConnection.query.mockResolvedValueOnce([{}]); // INSERT evento
      mockConnection.query.mockResolvedValueOnce([[]]); // SELECT aprobadores: ninguno distinto de sí mismo

      await crearReserva(req as Request, res as Response);

      expect(mockConnection.query).toHaveBeenCalledTimes(4);
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('debería hacer rollback y retornar 500 en caso de error', async () => {
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };
      mockConnection.query.mockRejectedValueOnce(new Error('DB Error'));

      await crearReserva(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('editarReserva', () => {
    it('debería retornar 400 si faltan campos', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12' };

      await editarReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 400 si hora_inicio >= hora_fin', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '09:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };

      await editarReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 400 si fecha en pasado', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-10', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };

      await editarReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 400 si fecha hoy y hora en pasado', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-11', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };

      await editarReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 404 si reserva no existe', async () => {
      req.params = { id: '99' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };
      mockConnection.query.mockResolvedValueOnce([[]]);

      await editarReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 403 si usuario normal intenta editar reserva de otro', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };
      req.user = { id: 2, rol_id: ROLES.MINISTRO } as any;

      mockConnection.query.mockResolvedValueOnce([[{ solicitante_id: 1, fecha: '2026-08-12' }]]); // Le pertenece al user 1

      await editarReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería permitir edición a Admin de una reserva de otro', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };
      req.user = { id: 2, rol_id: ROLES.ADMIN } as any; // Admin

      mockConnection.query.mockResolvedValueOnce([[{ solicitante_id: 1, fecha: '2026-08-12' }]]); // Pertenece al 1
      mockConnection.query.mockResolvedValueOnce([{}]); // Update reserva
      mockConnection.query.mockResolvedValueOnce([{}]); // Update evento
      mockConnection.query.mockResolvedValueOnce([[]]); // SELECT aprobadores (ninguno más)

      await editarReserva(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería permitir edición al propio solicitante', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };
      req.user = { id: 1, rol_id: ROLES.COORDINADOR_GRUPOS } as any; // Solicitante real

      mockConnection.query.mockResolvedValueOnce([[{ solicitante_id: 1, fecha: '2026-08-12' }]]);
      mockConnection.query.mockResolvedValueOnce([{}]);
      mockConnection.query.mockResolvedValueOnce([{}]);
      mockConnection.query.mockResolvedValueOnce([[]]); // SELECT aprobadores (ninguno)

      await editarReserva(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('notifica a los aprobadores (excepto al editor) que la reserva editada necesita re-aprobación', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };
      req.user = { id: 5, rol_id: ROLES.ADMIN } as any; // Admin edita la reserva de otro

      mockConnection.query.mockResolvedValueOnce([[{ solicitante_id: 1, fecha: '2026-08-12' }]]);
      mockConnection.query.mockResolvedValueOnce([{}]); // Update reserva
      mockConnection.query.mockResolvedValueOnce([{}]); // Update evento
      mockConnection.query.mockResolvedValueOnce([[{ id: 9 }]]); // SELECT aprobadores (otro Sacerdote)
      mockConnection.query.mockResolvedValueOnce([{ insertId: 50 }]); // INSERT notificacion
      mockConnection.query.mockResolvedValueOnce([{}]); // INSERT persona_notificacion

      await editarReserva(req as Request, res as Response);

      expect(mockConnection.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('rol_id IN'),
        [ROLES.SACERDOTE, ROLES.ADMIN, 5]
      );
      expect(mockConnection.query).toHaveBeenNthCalledWith(
        6,
        expect.stringContaining('persona_notificacion'),
        [9, 50]
      );
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('impide cambiar de día una reserva con tareas vinculadas', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-13', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };
      mockConnection.query.mockResolvedValueOnce([[{ solicitante_id: 1, fecha: '2026-08-12' }]]);
      mockConnection.query.mockResolvedValueOnce([[{ id: 9 }]]);
      await editarReserva(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.query.mock.calls.some(([sql]: [string]) => sql.includes('UPDATE reserva'))).toBe(false);
    });

    it('debería hacer rollback y retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };
      mockConnection.query.mockRejectedValueOnce(new Error('DB Error'));

      await editarReserva(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('obtenerMisReservas', () => {
    it('debería retornar 200 y las reservas', async () => {
      const mockRows = [{ id: 1 }];
      (db.query as any).mockResolvedValue([mockRows]);

      await obtenerMisReservas(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });

    it('debería retornar 500 en caso de error', async () => {
      (db.query as any).mockRejectedValueOnce(new Error('DB Error'));

      await obtenerMisReservas(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('obtenerReservas', () => {
    it('debería retornar 200 y reservas con filtro opcional', async () => {
      req.query = { espacio_id: '1' };
      const mockRows = [{ id: 1, en_uso: 0 }];
      (db.query as any).mockResolvedValue([mockRows]);

      await obtenerReservas(req as Request, res as Response);

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE r.espacio_id = ?'), [2, 1]);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith([{ id: 1, en_uso: false }]);
    });

    it('debería retornar 200 sin filtro opcional', async () => {
      req.query = {};
      const mockRows = [{ id: 1, en_uso: 1 }];
      (db.query as any).mockResolvedValue([mockRows]);

      await obtenerReservas(req as Request, res as Response);

      expect(db.query).toHaveBeenCalledWith(expect.not.stringContaining('WHERE r.espacio_id = ?'), [2]);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith([{ id: 1, en_uso: true }]);
    });

    it('debería retornar 500 en caso de error', async () => {
      (db.query as any).mockRejectedValueOnce(new Error('DB Error'));

      await obtenerReservas(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('obtenerReservaPorId', () => {
    it('debería retornar 200 si la reserva existe', async () => {
      req.params = { id: '1' };
      const mockRows = [{ id: 1 }];
      (db.query as any).mockResolvedValue([mockRows]);

      await obtenerReservaPorId(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows[0]);
    });

    it('debería retornar 404 si la reserva no existe', async () => {
      req.params = { id: '99' };
      (db.query as any).mockResolvedValue([[]]);

      await obtenerReservaPorId(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 500 en caso de error', async () => {
      req.params = { id: '1' };
      (db.query as any).mockRejectedValueOnce(new Error('DB Error'));

      await obtenerReservaPorId(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('cambiarEstadoReserva', () => {
    it('debería retornar 400 si falta estado_id', async () => {
      req.params = { id: '1' };
      req.body = {};

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 400 si estado_id es inválido', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 99 };

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 404 si reserva no existe', async () => {
      req.params = { id: '99' };
      req.body = { estado_id: 2 };
      (db.query as any).mockResolvedValueOnce([[]]);

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 400 si hay choque de horarios al aprobar', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 2 }; // aprobar
      req.user = { id: 1, rol_id: ROLES.ADMIN } as any;
      (db.query as any).mockResolvedValueOnce([[{ espacio_id: 1, fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00' }]]); // SELECT reserva
      (db.query as any).mockResolvedValueOnce([[{ id: 2 }]]); // SELECT conflicto (found)

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 200 y aprobar correctamente si no hay conflicto', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 2 }; // aprobar
      req.user = { id: 1, rol_id: ROLES.ADMIN } as any;
      (db.query as any).mockResolvedValueOnce([[{ espacio_id: 1, fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00' }]]);
      (db.query as any).mockResolvedValueOnce([[]]); // No conflictos
      (db.query as any).mockResolvedValueOnce([{}]); // UPDATE 

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reserva aprobada correctamente' }));
    });

    it('debería retornar 200 y actualizar estado correctamente para pendientes (1) sin revisar conflictos', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 1 }; // pendiente
      req.user = { id: 1, rol_id: ROLES.ADMIN } as any;
      (db.query as any).mockResolvedValueOnce([[{ espacio_id: 1, fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00' }]]);
      (db.query as any).mockResolvedValueOnce([{}]); // UPDATE 

      await cambiarEstadoReserva(req as Request, res as Response);

      // Solo 2 queries (SELECT y UPDATE), sin SELECT de conflictos
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reserva marcada como pendiente nuevamente' }));
    });

    it('debería permitir a un Admin/Sacerdote rechazar una reserva (estado_id=3)', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 3 };
      req.user = { id: 1, rol_id: ROLES.ADMIN } as any;
      (db.query as any).mockResolvedValueOnce([[{ espacio_id: 1, fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00' }]]);
      (db.query as any).mockResolvedValueOnce([{}]); // UPDATE

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reserva rechazada correctamente' }));
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 3 };
      (db.query as any).mockRejectedValueOnce(new Error('DB Error'));

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debería permitir al solicitante cancelar su propia reserva Pendiente', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 4 };
      req.user = { id: 1, rol_id: ROLES.MINISTRO } as any;
      (db.query as any).mockResolvedValueOnce([[{ solicitante_id: 1, estado_reserva_id: 1 }]]);
      (db.query as any).mockResolvedValueOnce([{}]); // UPDATE

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reserva cancelada correctamente' }));
    });

    it('debería permitir al solicitante cancelar su propia reserva Confirmada', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 4 };
      req.user = { id: 1, rol_id: ROLES.MINISTRO } as any;
      (db.query as any).mockResolvedValueOnce([[{ solicitante_id: 1, estado_reserva_id: 2 }]]);
      (db.query as any).mockResolvedValueOnce([{}]); // UPDATE

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería retornar 403 si el solicitante intenta rechazar (estado_id=3) en vez de cancelar', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 3 };
      req.user = { id: 1, rol_id: ROLES.MINISTRO } as any;
      (db.query as any).mockResolvedValueOnce([[{ solicitante_id: 1, estado_reserva_id: 1 }]]);

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería retornar 403 si el solicitante intenta aprobar su propia reserva (estado_id=2)', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 2 };
      req.user = { id: 1, rol_id: ROLES.MINISTRO } as any;
      (db.query as any).mockResolvedValueOnce([[{ solicitante_id: 1, estado_reserva_id: 1 }]]);

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería retornar 403 si el solicitante intenta volver su reserva a Pendiente (estado_id=1)', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 1 };
      req.user = { id: 1, rol_id: ROLES.MINISTRO } as any;
      (db.query as any).mockResolvedValueOnce([[{ solicitante_id: 1, estado_reserva_id: 2 }]]);

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería retornar 403 si un Admin/Sacerdote intenta rechazar (estado_id=3) su propia reserva', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 3 };
      req.user = { id: 1, rol_id: ROLES.ADMIN } as any;
      (db.query as any).mockResolvedValueOnce([[{ solicitante_id: 1, estado_reserva_id: 1 }]]);

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        message: 'No puedes rechazar tu propia reserva, solo cancelarla'
      }));
    });

    it('debería permitir a un Admin cancelar (estado_id=4) su propia reserva', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 4 };
      req.user = { id: 1, rol_id: ROLES.ADMIN } as any;
      (db.query as any).mockResolvedValueOnce([[{ solicitante_id: 1, estado_reserva_id: 1 }]]);
      (db.query as any).mockResolvedValueOnce([{}]); // UPDATE

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reserva cancelada correctamente' }));
    });

    it('debería retornar 403 si un usuario intenta cancelar la reserva de otra persona', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 4 };
      req.user = { id: 1, rol_id: ROLES.MINISTRO } as any;
      (db.query as any).mockResolvedValueOnce([[{ solicitante_id: 2, estado_reserva_id: 1 }]]);

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería notificar al solicitante cuando otra persona aprueba su reserva', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 2 }; // aprobar
      req.user = { id: 99, rol_id: ROLES.ADMIN } as any;
      (db.query as any).mockResolvedValueOnce([[{ solicitante_id: 1, espacio_id: 1, fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00' }]]);
      (db.query as any).mockResolvedValueOnce([[]]); // sin conflictos
      (db.query as any).mockResolvedValueOnce([{}]); // UPDATE
      (db.query as any).mockResolvedValueOnce([{ insertId: 55 }]); // INSERT notificacion
      (db.query as any).mockResolvedValueOnce([{}]); // INSERT persona_notificacion

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notificacion'),
        expect.arrayContaining(['Tu reserva del 2026-08-12 (10:00 – 11:00) fue aprobada.', expect.any(String), 99])
      );
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
        [1, 55]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería notificar al solicitante cuando otra persona rechaza su reserva', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 3 };
      req.user = { id: 99, rol_id: ROLES.SACERDOTE } as any;
      (db.query as any).mockResolvedValueOnce([[{ solicitante_id: 1, fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00' }]]);
      (db.query as any).mockResolvedValueOnce([{}]); // UPDATE
      (db.query as any).mockResolvedValueOnce([{ insertId: 56 }]); // INSERT notificacion
      (db.query as any).mockResolvedValueOnce([{}]); // INSERT persona_notificacion

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notificacion'),
        expect.arrayContaining(['Tu reserva del 2026-08-12 (10:00 – 11:00) fue rechazada.', expect.any(String), 99])
      );
    });

    it('no debería notificar cuando el propio solicitante cambia el estado de su reserva', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 4 };
      req.user = { id: 1, rol_id: ROLES.MINISTRO } as any;
      (db.query as any).mockResolvedValueOnce([[{ solicitante_id: 1, estado_reserva_id: 1, fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00' }]]);
      (db.query as any).mockResolvedValueOnce([{}]); // UPDATE

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('debería retornar 400 si el solicitante intenta cancelar una reserva ya Rechazada', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 4 };
      req.user = { id: 1, rol_id: ROLES.MINISTRO } as any;
      (db.query as any).mockResolvedValueOnce([[{ solicitante_id: 1, estado_reserva_id: 3 }]]);

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe('checkinReserva', () => {
    it('debería retornar 404 si la reserva no existe', async () => {
      req.params = { id: '99' };
      (db.query as any).mockResolvedValueOnce([[]]);

      await checkinReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 403 si el actor no es el solicitante ni Admin/Sacerdote', async () => {
      req.params = { id: '1' };
      req.user = { id: 1, rol_id: ROLES.MINISTRO } as any;
      (db.query as any).mockResolvedValueOnce([[{
        id: 1, solicitante_id: 2, estado_reserva_id: 2, espacio_id: 1, checkin_en: null
      }]]);

      await checkinReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería retornar 400 si la reserva no está confirmada', async () => {
      req.params = { id: '1' };
      req.user = { id: 1, rol_id: ROLES.COORDINADOR_GRUPOS } as any;
      (db.query as any).mockResolvedValueOnce([[{
        id: 1, solicitante_id: 1, estado_reserva_id: 1, espacio_id: 1, checkin_en: null
      }]]);

      await checkinReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Solo se puede hacer check-in de una reserva confirmada'
      }));
    });

    it('debería retornar 400 si la reserva no tiene espacio asignado', async () => {
      req.params = { id: '1' };
      req.user = { id: 1, rol_id: ROLES.COORDINADOR_GRUPOS } as any;
      (db.query as any).mockResolvedValueOnce([[{
        id: 1, solicitante_id: 1, estado_reserva_id: 2, espacio_id: null, checkin_en: null
      }]]);

      await checkinReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Esta reserva no tiene un salón asignado'
      }));
    });

    it('debería retornar 200 idempotente si ya se había hecho check-in', async () => {
      req.params = { id: '1' };
      req.user = { id: 1, rol_id: ROLES.COORDINADOR_GRUPOS } as any;
      (db.query as any).mockResolvedValueOnce([[{
        id: 1, solicitante_id: 1, estado_reserva_id: 2, espacio_id: 1, checkin_en: '2026-08-11 13:50:00'
      }]]);

      await checkinReserva(req as Request, res as Response);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Ya se había hecho check-in de esta reserva',
        checkin_en: '2026-08-11 13:50:00'
      }));
    });

    it('debería retornar 400 si está fuera de la ventana de check-in', async () => {
      req.params = { id: '1' };
      req.user = { id: 1, rol_id: ROLES.COORDINADOR_GRUPOS } as any;
      (db.query as any).mockResolvedValueOnce([[{
        id: 1, solicitante_id: 1, estado_reserva_id: 2, espacio_id: 1, checkin_en: null
      }]]);
      (db.query as any).mockResolvedValueOnce([[{ dentro_de_ventana: 0 }]]);

      await checkinReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('check-in solo está disponible')
      }));
    });

    it('debería registrar el check-in correctamente dentro de la ventana con tolerancia', async () => {
      req.params = { id: '1' };
      req.user = { id: 1, rol_id: ROLES.COORDINADOR_GRUPOS } as any;
      (db.query as any).mockResolvedValueOnce([[{
        id: 1, solicitante_id: 1, estado_reserva_id: 2, espacio_id: 1, checkin_en: null
      }]]);
      (db.query as any).mockResolvedValueOnce([[{ dentro_de_ventana: 1 }]]);
      (db.query as any).mockResolvedValueOnce([{}]); // UPDATE
      (db.query as any).mockResolvedValueOnce([[{ checkin_en: '2026-08-11 13:50:00' }]]);

      await checkinReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Check-in registrado correctamente',
        checkin_en: '2026-08-11 13:50:00'
      }));
    });

    it('debería permitir a un Admin/Sacerdote hacer check-in de la reserva de otra persona', async () => {
      req.params = { id: '1' };
      req.user = { id: 99, rol_id: ROLES.ADMIN } as any;
      (db.query as any).mockResolvedValueOnce([[{
        id: 1, solicitante_id: 1, estado_reserva_id: 2, espacio_id: 1, checkin_en: null
      }]]);
      (db.query as any).mockResolvedValueOnce([[{ dentro_de_ventana: 1 }]]);
      (db.query as any).mockResolvedValueOnce([{}]); // UPDATE
      (db.query as any).mockResolvedValueOnce([[{ checkin_en: '2026-08-11 13:50:00' }]]);

      await checkinReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      (db.query as any).mockRejectedValueOnce(new Error('DB Error'));

      await checkinReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
