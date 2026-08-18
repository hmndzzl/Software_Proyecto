import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import pool from '../../config/db';
import { ROLES } from '../../config/roles';
import {
  getNotificaciones,
  marcarLeida,
  confirmarAsistenciaNotificacion,
  getDestinatarios,
  createNotificacion,
  deleteNotificacion,
  reportarInasistencia
} from '../notificacion.controller';

vi.mock('../../config/db', () => ({
  default: {
    execute: vi.fn(),
    getConnection: vi.fn(),
  },
}));

describe('Notificacion Controller - Pruebas Unitarias', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;
  let sendMock: any;
  let mockConnection: any;

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

  describe('getNotificaciones', () => {
    it('debería retornar 200 y las notificaciones', async () => {
      const mockRows = [{ id: 1, mensaje: 'Test' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getNotificaciones(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });

    it('debería retornar 500 en caso de error', async () => {
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await getNotificaciones(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('marcarLeida', () => {
    it('debería retornar 200 al marcar leída', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockResolvedValue([{ affectedRows: 1 }]);

      await marcarLeida(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(expect.any(String), ['1', 1]);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería retornar 404 si affectedRows === 0', async () => {
      req.params = { id: '99' };
      (pool.execute as any).mockResolvedValue([{ affectedRows: 0 }]);

      await marcarLeida(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 500 en caso de error', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await marcarLeida(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('confirmarAsistenciaNotificacion', () => {
    it('debería confirmar únicamente una notificación que requiere asistencia', async () => {
      req.params = { id: '10' };
      (pool.execute as any)
        .mockResolvedValueOnce([[{ requiere_confirmacion: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await confirmarAsistenciaNotificacion(req as Request, res as Response);

      expect(pool.execute).toHaveBeenLastCalledWith(
        expect.stringContaining('asistencia_confirmada = 1, leida = 1'),
        ['10', 1]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería rechazar una notificación que no requiere confirmación', async () => {
      req.params = { id: '10' };
      (pool.execute as any).mockResolvedValueOnce([[{ requiere_confirmacion: 0 }]]);

      await confirmarAsistenciaNotificacion(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe('getDestinatarios', () => {
    it('debería retornar todos los usuarios si es admin', async () => {
      req.user!.rol_id = ROLES.ADMIN;
      const mockRows = [{ id: 2, nombre: 'Juan' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getDestinatarios(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });

    it('debería retornar todos los usuarios si es sacerdote', async () => {
      req.user!.rol_id = ROLES.SACERDOTE;
      const mockRows = [{ id: 2, nombre: 'Juan' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getDestinatarios(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('debería retornar solo sus ministros si es coordinador de ministros', async () => {
      req.user!.rol_id = ROLES.COORDINADOR_MINISTROS;
      req.user!.id = 5;
      const mockRows = [{ id: 2, nombre: 'Ministro' }];
      (pool.execute as any).mockResolvedValue([mockRows]);

      await getDestinatarios(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(expect.any(String), [5]);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockRows);
    });

    it('debería retornar 403 si es otro rol', async () => {
      req.user!.rol_id = ROLES.MINISTRO;

      await getDestinatarios(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería retornar 500 en caso de error', async () => {
      req.user!.rol_id = ROLES.ADMIN;
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await getDestinatarios(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('createNotificacion', () => {
    it('debería retornar 400 si faltan campos', async () => {
      req.body = { mensaje: 'Hola' }; // Falta tipo

      await createNotificacion(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 403 si coordinador intenta enviar global', async () => {
      req.user!.rol_id = ROLES.COORDINADOR_MINISTROS;
      req.body = { mensaje: 'Hola', tipo: 'global' };

      await createNotificacion(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería procesar envío global correctamente', async () => {
      req.body = { mensaje: 'Global', tipo: 'global' };
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 10 }]); // insert notificacion
      mockConnection.execute.mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]]); // get all users
      mockConnection.execute.mockResolvedValue([{}]); // insert persona_notificacion

      await createNotificacion(req as Request, res as Response);

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ id: 10, destinatarios: 2 }));
    });

    it('debería procesar envío global con grupo_id correctamente', async () => {
      req.body = { mensaje: 'Global', tipo: 'global', grupo_id: 1 };
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 10 }]); // insert notificacion
      mockConnection.execute.mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]]); // get all users
      mockConnection.execute.mockResolvedValue([{}]); // insert persona_notificacion

      await createNotificacion(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('debería retornar 400 si no hay destinatarios en envío individual', async () => {
      req.body = { mensaje: 'Indiv', tipo: 'individual' };
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 10 }]); // mock insert

      await createNotificacion(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar 403 si coordinador envía a usuario que no es su ministro', async () => {
      req.user!.rol_id = ROLES.COORDINADOR_MINISTROS;
      req.body = { mensaje: 'Indiv', tipo: 'individual', destinatarios: [99] }; // Intenta enviar a 99
      
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 10 }]); // insert notif
      mockConnection.execute.mockResolvedValueOnce([[{ ministro_id: 1 }]]); // Solo tiene asignado al 1

      await createNotificacion(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('debería procesar envío individual del coordinador exitosamente', async () => {
      req.user!.rol_id = ROLES.COORDINADOR_MINISTROS;
      req.body = { mensaje: 'Indiv', tipo: 'individual', destinatarios: [1] };
      
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 10 }]); // insert notif
      mockConnection.execute.mockResolvedValueOnce([[{ ministro_id: 1 }]]); // es válido
      mockConnection.execute.mockResolvedValue([{}]); // insert persona_notificacion

      await createNotificacion(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('debería procesar envío individual regular exitosamente', async () => {
      req.user!.rol_id = ROLES.ADMIN;
      req.body = { mensaje: 'Indiv', tipo: 'individual', destinatarios: [1] };
      
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 10 }]); // insert notif
      mockConnection.execute.mockResolvedValue([{}]); // insert persona_notificacion

      await createNotificacion(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('debería hacer rollback y retornar 500 en caso de error', async () => {
      req.body = { mensaje: 'Global', tipo: 'global' };
      mockConnection.execute.mockRejectedValueOnce(new Error('DB Error'));

      await createNotificacion(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('reportarInasistencia', () => {
    it('debería retornar 400 si el motivo está vacío', async () => {
      req.params = { id: '10' };
      req.body = { motivo: '   ' };

      await reportarInasistencia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(pool.getConnection).not.toHaveBeenCalled();
    });

    it('debería registrar la inasistencia y notificar al coordinador en una transacción', async () => {
      req.params = { id: '10' };
      req.body = { motivo: 'Tengo una emergencia familiar' };
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 10, evento_id: 4, ministro_nombre: 'Ana', evento_nombre: 'Misa dominical' }]])
        .mockResolvedValueOnce([[{ coordinador_id: 8 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ insertId: 11 }])
        .mockResolvedValueOnce([{}]);

      await reportarInasistencia(req as Request, res as Response);

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('inasistencia_reportada = 1'),
        ['Tengo una emergencia familiar', '10', 1]
      );
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ coordinadores_notificados: 1 }));
    });

    it('debería revertir la transacción si el ministro no tiene coordinador', async () => {
      req.params = { id: '10' };
      req.body = { motivo: 'Imprevisto' };
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 10, evento_id: 4, ministro_nombre: 'Ana', evento_nombre: 'Misa dominical' }]])
        .mockResolvedValueOnce([[]]);

      await reportarInasistencia(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });
  });

  describe('deleteNotificacion', () => {
    it('debería retornar 204 al eliminar', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockResolvedValue([{ affectedRows: 1 }]);

      await deleteNotificacion(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
    });

    it('debería retornar 404 si affectedRows === 0', async () => {
      req.params = { id: '99' };
      (pool.execute as any).mockResolvedValue([{ affectedRows: 0 }]);

      await deleteNotificacion(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('debería retornar 500 en caso de error', async () => {
      req.params = { id: '1' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await deleteNotificacion(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
