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
    getConnection: vi.fn(),
  },
}));

describe('Espacio Controller - Pruebas Unitarias', () => {
  const conn = { execute: vi.fn(), beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;

  beforeEach(() => {
    vi.resetAllMocks();
    req = {
      body: {},
      query: {},
      params: {},
      user: { id: 1, rol_id: 5 } as any,
    };

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    res = {
      status: statusMock,
      json: jsonMock,
    };

    vi.mocked(pool.getConnection).mockResolvedValue(conn as any);
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
      const mockEspacios = [{ id: 1, nombre: 'Sala A', foto_url: '/uploads/espacios/salon-01-v1.webp', en_uso: 0 }];
      (pool.execute as any).mockResolvedValue([mockEspacios]);

      await obtenerEspacios(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('FROM espacio e'), [2]);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith([{ id: 1, nombre: 'Sala A', foto_url: '/uploads/espacios/salon-01-v1.webp', en_uso: false }]);
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
        { id: 1, nombre: 'Sala A', foto_url: '/uploads/espacios/salon-01-v1.webp', disponible: 1, en_uso: 1 },
        { id: 2, nombre: 'Sala B', disponible: 0, en_uso: 0 }
      ];
      (pool.execute as any).mockResolvedValue([mockEspacios]);

      await obtenerEspacios(req as Request, res as Response);

      expect(pool.execute).toHaveBeenCalled();
      expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('e.foto_url'), expect.any(Array));
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith([
        { id: 1, nombre: 'Sala A', foto_url: '/uploads/espacios/salon-01-v1.webp', disponible: true, en_uso: true },
        { id: 2, nombre: 'Sala B', disponible: false, en_uso: false }
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
      const mockEspacio = [{ id: 1, nombre: 'Sala A', en_uso: 0 }];
      (pool.execute as any).mockResolvedValueOnce([mockEspacio]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await obtenerEspacioPorId(req as Request, res as Response);

      expect(pool.execute).toHaveBeenNthCalledWith(1, expect.stringContaining('FROM espacio e WHERE e.id = ?'), [2, '1']);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({ id: 1, nombre: 'Sala A', en_uso: false, reservas_checkin_disponible: [] });
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

    it('filtra reservas_checkin_disponible por solicitante cuando el actor no es privilegiado', async () => {
      req.params = { id: '1' };
      req.user = { id: 7, rol_id: 2 } as any; // Coordinador de Ministros, no privilegiado
      const mockEspacio = [{ id: 1, nombre: 'Sala A', en_uso: 1 }];
      const mockReservas = [{ id: 10, hora_inicio: '14:00:00', hora_fin: '16:00:00', solicitante_id: 7, solicitante_nombre: 'Juan', checkin_en: null }];
      (pool.execute as any).mockResolvedValueOnce([mockEspacio]);
      (pool.execute as any).mockResolvedValueOnce([mockReservas]);

      await obtenerEspacioPorId(req as Request, res as Response);

      expect(pool.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('AND r.solicitante_id = ?'),
        ['1', 2, '00:15:00', 7]
      );
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        en_uso: true,
        reservas_checkin_disponible: mockReservas
      }));
    });

    it('no filtra reservas_checkin_disponible por solicitante cuando el actor es Admin/Sacerdote', async () => {
      req.params = { id: '1' };
      req.user = { id: 1, rol_id: 5 } as any; // Admin
      (pool.execute as any).mockResolvedValueOnce([[{ id: 1, nombre: 'Sala A', en_uso: 0 }]]);
      (pool.execute as any).mockResolvedValueOnce([[]]);

      await obtenerEspacioPorId(req as Request, res as Response);

      expect(pool.execute).toHaveBeenNthCalledWith(
        2,
        expect.not.stringContaining('AND r.solicitante_id = ?'),
        ['1', 2, '00:15:00']
      );
    });
  });

  describe('crear y editar espacios', () => {
    it('normaliza nombre y acepta capacidad de formulario multipart', async () => {
      req.body = { nombre: '  Salón nuevo  ', capacidad: '25' };
      vi.mocked(pool.execute).mockResolvedValue([{ insertId: 5 }] as any);
      await crearEspacio(req as Request, res as Response);
      expect(pool.execute).toHaveBeenCalledWith('INSERT INTO espacio (nombre, capacidad, foto_url) VALUES (?, ?, ?)', ['Salón nuevo', 25, null]);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it.each([0, -1, 2.5, true, {}, 'abc', '1.5', 2147483648])('rechaza capacidad inválida %j', async capacidad => {
      req.body = { nombre: 'Salón', capacidad };
      await crearEspacio(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it.each(['', '   ', 45, 'a'.repeat(101)])('rechaza nombre inválido', async nombre => {
      req.body = { nombre };
      await crearEspacio(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('permite capacidad sin especificar', async () => {
      req.body = { nombre: 'Patio', capacidad: '' };
      vi.mocked(pool.execute).mockResolvedValue([{ insertId: 5 }] as any);
      await crearEspacio(req as Request, res as Response);
      expect(pool.execute).toHaveBeenCalledWith(expect.any(String), ['Patio', null, null]);
    });

    it('conserva la imagen al editar datos y responde después del commit', async () => {
      req.params = { id: '1' }; req.body = { nombre: 'Patio', capacidad: 50 };
      conn.execute.mockResolvedValueOnce([[{ id: 1, foto_url: '/uploads/espacios/salon-01-v1.webp' }]]).mockResolvedValueOnce([{}]);
      await actualizarEspacio(req as Request, res as Response);
      expect(conn.execute).toHaveBeenLastCalledWith('UPDATE espacio SET nombre = ?, capacidad = ?, foto_url = ? WHERE id = ?', ['Patio', 50, '/uploads/espacios/salon-01-v1.webp', '1']);
      expect(conn.commit).toHaveBeenCalledOnce();
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('permite quitar la imagen', async () => {
      req.params = { id: '1' }; req.body = { nombre: 'Patio', quitar_imagen: 'true' };
      conn.execute.mockResolvedValueOnce([[{ id: 1, foto_url: '/uploads/espacios/salon-01-v1.webp' }]]).mockResolvedValueOnce([{}]);
      await actualizarEspacio(req as Request, res as Response);
      expect(conn.execute).toHaveBeenLastCalledWith(expect.any(String), ['Patio', null, null, '1']);
    });

    it('revierte y devuelve 404 si el espacio ya no existe', async () => {
      req.params = { id: '99' }; req.body = { nombre: 'Salón' };
      conn.execute.mockResolvedValueOnce([[]]);
      await actualizarEspacio(req as Request, res as Response);
      expect(conn.rollback).toHaveBeenCalledOnce();
      expect(conn.commit).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('no indica éxito cuando falla el commit', async () => {
      req.params = { id: '1' }; req.body = { nombre: 'Patio' };
      conn.execute.mockResolvedValueOnce([[{ id: 1, foto_url: null }]]).mockResolvedValueOnce([{}]);
      conn.commit.mockRejectedValueOnce(new Error('DB'));
      await actualizarEspacio(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(statusMock).not.toHaveBeenCalledWith(200);
      expect(conn.rollback).toHaveBeenCalledOnce();
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
