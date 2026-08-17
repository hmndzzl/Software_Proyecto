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
  cambiarEstadoReserva
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
      user: { id: 1, rol_id: ROLES.MINISTRO } as any,
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

      await crearReserva(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
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

      mockConnection.query.mockResolvedValueOnce([[{ solicitante_id: 1 }]]); // Le pertenece al user 1

      await editarReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería permitir edición a Admin de una reserva de otro', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };
      req.user = { id: 2, rol_id: ROLES.ADMIN } as any; // Admin

      mockConnection.query.mockResolvedValueOnce([[{ solicitante_id: 1 }]]); // Pertenece al 1
      mockConnection.query.mockResolvedValueOnce([{}]); // Update reserva
      mockConnection.query.mockResolvedValueOnce([{}]); // Update evento

      await editarReserva(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería permitir edición al propio solicitante', async () => {
      req.params = { id: '1' };
      req.body = { fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00', espacio_id: 1, titulo: 'T', descripcion: 'D' };
      req.user = { id: 1, rol_id: ROLES.MINISTRO } as any; // Solicitante real

      mockConnection.query.mockResolvedValueOnce([[{ solicitante_id: 1 }]]);
      mockConnection.query.mockResolvedValueOnce([{}]);
      mockConnection.query.mockResolvedValueOnce([{}]);

      await editarReserva(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
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
      const mockRows = [{ id: 1 }];
      (db.query as any).mockResolvedValue([mockRows]);

      await obtenerReservas(req as Request, res as Response);

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE r.espacio_id = ?'), [1]);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });

    it('debería retornar 200 sin filtro opcional', async () => {
      req.query = {};
      const mockRows = [{ id: 1 }];
      (db.query as any).mockResolvedValue([mockRows]);

      await obtenerReservas(req as Request, res as Response);

      expect(db.query).toHaveBeenCalledWith(expect.not.stringContaining('WHERE r.espacio_id = ?'), []);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
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
      (db.query as any).mockResolvedValueOnce([[{ espacio_id: 1, fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00' }]]); // SELECT reserva
      (db.query as any).mockResolvedValueOnce([[{ id: 2 }]]); // SELECT conflicto (found)

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 200 y aprobar correctamente si no hay conflicto', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 2 }; // aprobar
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
      (db.query as any).mockResolvedValueOnce([[{ espacio_id: 1, fecha: '2026-08-12', hora_inicio: '10:00', hora_fin: '11:00' }]]);
      (db.query as any).mockResolvedValueOnce([{}]); // UPDATE 

      await cambiarEstadoReserva(req as Request, res as Response);

      // Solo 2 queries (SELECT y UPDATE), sin SELECT de conflictos
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reserva marcada como pendiente nuevamente' }));
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '1' };
      req.body = { estado_id: 3 };
      (db.query as any).mockRejectedValueOnce(new Error('DB Error'));

      await cambiarEstadoReserva(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
