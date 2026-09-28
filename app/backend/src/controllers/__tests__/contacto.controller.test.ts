import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import pool from '../../config/db';
import { crearContacto } from '../contacto.controller';
import contactoRoutes from '../../routes/contacto.routes';

vi.mock('../../config/db', () => ({ default: { getConnection: vi.fn() } }));

// Sin limitador de tasa: aísla las pruebas de lógica/validación del contador
// compartido del rate limiter (probado aparte, en su propia app, más abajo).
const app = express();
app.use(express.json());
app.post('/api/contacto', crearContacto);

const body = {
  nombre: 'María Elena Guzmán',
  correo: 'maria@example.com',
  telefono: '+50255551234',
  motivo: 'Información general',
  mensaje: 'Quisiera saber los horarios de misa del domingo.',
};

const conn = {
  beginTransaction: vi.fn(), execute: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
};

function enviar(payload: object = body) {
  return request(app).post('/api/contacto').send(payload);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(pool.getConnection).mockResolvedValue(conn as any);
  conn.execute
    .mockResolvedValueOnce([[{ id: 1 }, { id: 5 }]]) // destinatarios (Sacerdote/Admin)
    .mockResolvedValueOnce([{ insertId: 30 }]) // INSERT notificacion
    .mockResolvedValueOnce([{}]).mockResolvedValueOnce([{}]) // INSERT persona_notificacion x2
    .mockResolvedValueOnce([{ insertId: 7 }]); // INSERT mensaje_contacto
});

describe('POST /api/contacto (HU-32)', () => {
  it('no requiere autenticación', async () => {
    const res = await enviar();
    expect(res.status).toBe(201);
  });

  it('guarda el mensaje y notifica a Sacerdote y Admin', async () => {
    const res = await enviar();
    expect(res.status).toBe(201);
    expect(res.body.contacto).toEqual({ ...body, id: 7, fecha: expect.any(String), notificacion_id: 30 });
    expect(conn.execute).toHaveBeenNthCalledWith(1, 'SELECT id FROM persona WHERE rol_id IN (?, ?)', [1, 5]);
    for (const id of [1, 5]) {
      expect(conn.execute).toHaveBeenCalledWith(
        'INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)', [id, 30]);
    }
    expect(conn.execute).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO mensaje_contacto'),
      [body.nombre, body.correo, body.telefono, body.motivo, body.mensaje, 30]);
    expect(conn.execute.mock.calls[1][1][0]).toContain(body.nombre);
    expect(conn.execute.mock.calls[1][1][0]).toContain(body.motivo);
    expect(conn.execute.mock.calls[1][1][0]).toContain(body.mensaje);
    expect(conn.commit).toHaveBeenCalledOnce();
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it('acepta el envío sin teléfono (opcional)', async () => {
    conn.execute.mockReset()
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ insertId: 7 }]);
    const { telefono, ...sinTelefono } = body;
    const res = await enviar(sinTelefono);
    expect(res.status).toBe(201);
    expect(res.body.contacto.telefono).toBeUndefined();
    expect(conn.execute).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO mensaje_contacto'),
      [body.nombre, body.correo, null, body.motivo, body.mensaje, 30]);
  });

  it('recorta espacios exteriores antes de guardar', async () => {
    const res = await enviar({ ...body, nombre: `  ${body.nombre}  `, mensaje: `\n${body.mensaje}\n` });
    expect(res.status).toBe(201);
    expect(res.body.contacto.nombre).toBe(body.nombre);
    expect(res.body.contacto.mensaje).toBe(body.mensaje);
  });

  it.each(['nombre', 'motivo', 'mensaje'])('rechaza %s ausente, vacío o demasiado largo', async campo => {
    const maxLen = campo === 'mensaje' ? 5000 : 255;
    for (const valor of [undefined, null, 123, {}, [], '', '   ', 'a'.repeat(maxLen + 1)]) {
      const res = await enviar({ ...body, [campo]: valor });
      expect(res.status).toBe(400);
    }
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('acepta las longitudes máximas de nombre/motivo/mensaje', async () => {
    const res = await enviar({ ...body, nombre: 'a'.repeat(255), motivo: 'b'.repeat(255), mensaje: 'c'.repeat(5000) });
    expect(res.status).toBe(201);
  });

  it.each([undefined, null, '', 'no-es-un-correo', 'a@b', '@b.com', 'a@.com'])(
    'rechaza correo inválido: %j', async correo => {
      const res = await enviar({ ...body, correo });
      expect(res.status).toBe(400);
      expect(pool.getConnection).not.toHaveBeenCalled();
    });

  it('rechaza teléfono con tipo inválido', async () => {
    const res = await enviar({ ...body, telefono: 12345 });
    expect(res.status).toBe(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it.each(['55551234', '502-5555-1234', '+502 5555 1234', '+', '+1'.padEnd(60, '2')])(
    'rechaza teléfono con formato inválido: %j', async telefono => {
      const res = await enviar({ ...body, telefono });
      expect(res.status).toBe(400);
      expect(pool.getConnection).not.toHaveBeenCalled();
    });

  it('acepta un teléfono con un código de país distinto a +502 (no está hardcodeado)', async () => {
    const res = await enviar({ ...body, telefono: '+14155552671' });
    expect(res.status).toBe(201);
  });

  it('devuelve 409 si no hay Sacerdote ni Admin registrados', async () => {
    conn.execute.mockReset().mockResolvedValueOnce([[]]);
    const res = await enviar();
    expect(res.status).toBe(409);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it('revierte todo si falla la escritura', async () => {
    conn.execute.mockReset()
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockRejectedValueOnce(new Error('DB failure'));
    const res = await enviar();
    expect(res.status).toBe(500);
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledOnce();
  });

});

describe('POST /api/contacto — límite de envíos por IP', () => {
  const appConLimite = express();
  appConLimite.use(express.json());
  appConLimite.use('/api/contacto', contactoRoutes);
  const enviarConLimite = (payload: object = body) => request(appConLimite).post('/api/contacto').send(payload);

  it('bloquea con 429 tras superar el límite de envíos por IP', async () => {
    for (let i = 0; i < 5; i++) {
      conn.execute.mockReset()
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ insertId: 30 }])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{ insertId: 7 }]);
      expect((await enviarConLimite()).status).toBe(201);
    }
    const res = await enviarConLimite();
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ mensaje: 'Demasiados mensajes enviados. Inténtalo de nuevo en 15 minutos.' });
  });
});
