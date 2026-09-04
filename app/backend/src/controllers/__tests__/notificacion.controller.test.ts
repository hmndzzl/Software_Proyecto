import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { HttpStatus } from '../../utils/httpStatus';
import pool from '../../config/db';
import { ROLES } from '../../config/roles';
import {
  getNotificaciones,
  marcarLeida,
  confirmarAsistenciaNotificacion,
  confirmarAsistencia,
  getDestinatarios,
  createNotificacion,
  excusarAsistencia,
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

    it('debería retornar 404 si la notificación no existe', async () => {
      req.params = { id: '999' };
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await confirmarAsistenciaNotificacion(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Notificación no encontrada' });
    });

    it('debería retornar 404 si affectedRows === 0', async () => {
      req.params = { id: '10' };
      (pool.execute as any)
        .mockResolvedValueOnce([[{ requiere_confirmacion: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 0 }]);

      await confirmarAsistenciaNotificacion(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Notificación no encontrada para este usuario' });
    });

    it('debería retornar 500 en caso de error en BD', async () => {
      req.params = { id: '10' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await confirmarAsistenciaNotificacion(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Error al confirmar asistencia' });
    });
  });

  describe('confirmarAsistencia', () => {
    it('debería confirmar la asistencia correctamente y retornar 200', async () => {
      req.params = { id: '10' };
      (pool.execute as any)
        .mockResolvedValueOnce([[{ requiere_confirmacion: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await confirmarAsistencia(req as Request, res as Response);

      expect(pool.execute).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE persona_notificacion'),
        ['10', 1]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Asistencia confirmada' });
    });

    it('debería retornar 404 si la notificación no existe', async () => {
      req.params = { id: '999' };
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await confirmarAsistencia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Notificación no encontrada' });
    });

    it('debería retornar 400 si la notificación no requiere confirmación', async () => {
      req.params = { id: '10' };
      (pool.execute as any).mockResolvedValueOnce([[{ requiere_confirmacion: 0 }]]);

      await confirmarAsistencia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Esta notificación no requiere confirmación de asistencia' });
    });

    it('debería retornar 404 si affectedRows === 0', async () => {
      req.params = { id: '10' };
      (pool.execute as any)
        .mockResolvedValueOnce([[{ requiere_confirmacion: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 0 }]);

      await confirmarAsistencia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Notificación no encontrada para este usuario' });
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '10' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await confirmarAsistencia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Error al confirmar asistencia' });
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

    it('debería retornar 400 si requiere confirmación pero no se incluye evento_id', async () => {
      req.body = { mensaje: 'Aviso', tipo: 'global', requiere_confirmacion: true };

      await createNotificacion(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Selecciona el evento al que aplica la confirmación de asistencia' });
    });

    it('debería retornar 404 y rollback si el evento especificado no existe', async () => {
      req.body = { mensaje: 'Aviso', tipo: 'global', evento_id: 999, requiere_confirmacion: true };
      mockConnection.execute.mockResolvedValueOnce([[]]);

      await createNotificacion(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'El evento indicado no existe' });
    });

    it('debería procesar envío global con evento_id y confirmación exitosamente', async () => {
      req.body = { mensaje: 'Aviso de Misa', tipo: 'global', evento_id: 5, requiere_confirmacion: true };
      mockConnection.execute.mockResolvedValueOnce([[{ id: 5 }]]);
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 20 }]);
      mockConnection.execute.mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]]);
      mockConnection.execute.mockResolvedValue([{}]);

      await createNotificacion(req as Request, res as Response);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ id: 20, destinatarios: 2 }));
    });
  });

  describe('excusarAsistencia', () => {
    it('debería retornar 400 si no se proporciona motivo', async () => {
      req.params = { id: '1' };
      req.body = {};

      await excusarAsistencia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'El motivo de la excusa es requerido' });
    });

    it('debería retornar 400 si el motivo es un string vacío o con solo espacios', async () => {
      req.params = { id: '1' };
      req.body = { motivo: '   ' };

      await excusarAsistencia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'El motivo de la excusa es requerido' });
    });

    it('debería retornar 404 si la notificación no existe', async () => {
      req.params = { id: '999' };
      req.body = { motivo: 'Enfermedad' };
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await excusarAsistencia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Notificación no encontrada' });
    });

    it('debería retornar 400 si la notificación no requiere confirmación/excusa', async () => {
      req.params = { id: '10' };
      req.body = { motivo: 'Enfermedad' };
      (pool.execute as any).mockResolvedValueOnce([[{ requiere_confirmacion: 0 }]]);

      await excusarAsistencia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Esta notificación no requiere confirmación/excusa' });
    });

    it('debería retornar 404 si affectedRows === 0', async () => {
      req.params = { id: '10' };
      req.body = { motivo: 'Enfermedad' };
      (pool.execute as any)
        .mockResolvedValueOnce([[{ requiere_confirmacion: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 0 }]);

      await excusarAsistencia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Notificación no encontrada para este usuario' });
    });

    it('debería registrar la excusa exitosamente con 200', async () => {
      req.params = { id: '10' };
      req.body = { motivo: '  Asunto médico  ' };
      (pool.execute as any)
        .mockResolvedValueOnce([[{ requiere_confirmacion: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await excusarAsistencia(req as Request, res as Response);

      expect(pool.execute).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE persona_notificacion'),
        ['Asunto médico', '10', 1]
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({
        mensaje: 'Excusa registrada correctamente',
        motivo: 'Asunto médico',
      });
    });

    it('debería retornar 500 en caso de error de BD', async () => {
      req.params = { id: '10' };
      req.body = { motivo: 'Enfermedad' };
      (pool.execute as any).mockRejectedValueOnce(new Error('DB Error'));

      await excusarAsistencia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Error al registrar excusa' });
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

    it('debería retornar 404 si la notificación de asistencia no se encuentra para el usuario', async () => {
      req.params = { id: '999' };
      req.body = { motivo: 'Imprevisto' };
      mockConnection.execute.mockResolvedValueOnce([[]]);

      await reportarInasistencia(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Notificación de asistencia no encontrada para este usuario' });
    });

    it('debería retornar 404 si affectedRows al actualizar persona_notificacion es 0', async () => {
      req.params = { id: '10' };
      req.body = { motivo: 'Imprevisto' };
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 10, evento_id: 4, ministro_nombre: 'Ana', evento_nombre: 'Misa dominical' }]])
        .mockResolvedValueOnce([[{ coordinador_id: 8 }]])
        .mockResolvedValueOnce([{ affectedRows: 0 }]);

      await reportarInasistencia(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Notificación no encontrada para este usuario' });
    });

    it('debería hacer rollback y retornar 500 en caso de error durante la transacción', async () => {
      req.params = { id: '10' };
      req.body = { motivo: 'Imprevisto' };
      mockConnection.execute.mockRejectedValueOnce(new Error('DB Error'));

      await reportarInasistencia(req as Request, res as Response);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Error al registrar la inasistencia' });
    });

    it('debería retornar 400 si motivo no es de tipo string', async () => {
      req.params = { id: '10' };
      req.body = { motivo: 12345 };

      await reportarInasistencia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'El motivo de la inasistencia es requerido' });
    });

    it('debería retornar 500 si falla la obtención de conexión a la BD', async () => {
      req.params = { id: '10' };
      req.body = { motivo: 'Imprevisto' };
      (pool.getConnection as any).mockRejectedValueOnce(new Error('Connection error'));

      await reportarInasistencia(req as Request, res as Response);

      expect(mockConnection.rollback).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Error al registrar la inasistencia' });
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
