import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';
import { app } from '../../app';
import { JWT_SECRET } from '../../config/env';
import { ROLES } from '../../config/roles';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn(), getConnection: vi.fn() }, checkDbConnection: vi.fn() }));
const contenido = {
  nombre_parroquia: 'Parroquia', lema: 'Fe', titulo_principal: 'Bienvenidos', descripcion_principal: 'Descripción',
  quienes_somos: { titulo: 'Quiénes somos', descripcion: 'Historia', mision: 'Misión', comunidad: 'Comunidad', servicio: 'Servicio' },
  cantidad_grupos: 12, cantidad_espacios: 7,
  valores_encabezado: { titulo: 'Valores', descripcion: 'Nuestros valores' },
  valores: [{ titulo: 'Fe', descripcion: 'Oración' }], horarios_misa: [], horarios_oficina: [],
  contacto: { titulo: 'Contacto', direccion: 'Guatemala', correo: 'contacto@example.com', telefono: '+50255551234' },
  texto_pie: 'Parroquia',
};
const conn = { execute: vi.fn(), beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
const token = (rol_id: number) => jwt.sign({ id: 1, rol_id }, JWT_SECRET);

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(pool.execute).mockResolvedValue([[{ contenido: JSON.stringify(contenido) }] as any, []]);
  vi.mocked(pool.getConnection).mockResolvedValue(conn as any);
  conn.execute.mockResolvedValueOnce([[{ contenido: JSON.stringify(contenido) }], []]).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
});

describe('contenido editable de landing', () => {
  it('permite lectura pública sin sesión y devuelve solo contenido', async () => {
    const response = await request(app).get('/api/public/landing').expect(200);
    expect(response.body).toEqual(contenido);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('la ruta pública no permite editar', async () => {
    await request(app).patch('/api/public/landing').send({ cantidad_grupos: 15 }).expect(404);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('exige sesión para leer y editar en la ruta administrativa', async () => {
    await request(app).get('/api/landing').expect(401);
    await request(app).patch('/api/landing').send({ cantidad_grupos: 15 }).expect(401);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it.each([ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO])('el rol %s no puede editar', async rol => {
    await request(app).patch('/api/landing').auth(token(rol), { type: 'bearer' }).send({ cantidad_grupos: 15 }).expect(403);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it.each([ROLES.ADMIN, ROLES.SACERDOTE])('el rol %s puede leer y editar', async rol => {
    await request(app).get('/api/landing').auth(token(rol), { type: 'bearer' }).expect(200);
    const response = await request(app).patch('/api/landing').auth(token(rol), { type: 'bearer' })
      .send({ quienes_somos: { descripcion: 'Nueva historia' }, cantidad_grupos: 0 }).expect(200);
    expect(response.body).toEqual({ ...contenido, quienes_somos: { ...contenido.quienes_somos, descripcion: 'Nueva historia' }, cantidad_grupos: 0 });
    expect(conn.execute).toHaveBeenCalledWith('SELECT contenido FROM contenido_landing WHERE id = 1 FOR UPDATE');
    expect(conn.commit).toHaveBeenCalledOnce();
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it('reemplaza listas completas y permite vaciarlas', async () => {
    const response = await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' })
      .send({ valores: [], horarios_misa: [{ dias: 'Domingo', horas: ['08:00', '18:30'] }] }).expect(200);
    expect(response.body.valores).toEqual([]);
    expect(response.body.horarios_misa[0].horas).toEqual(['08:00', '18:30']);
    expect(response.body.contacto).toEqual(contenido.contacto);
  });

  it.each([
    {}, [], null, { cantidad_grupos: -1 }, { cantidad_espacios: '7' }, { cantidad_grupos: 1.5 }, { cantidad_grupos: 1000001 },
    { titulo_principal: ' ' }, { descripcion_principal: 'a'.repeat(5001) }, { imagen: 'foto.png' },
    { quienes_somos: {} }, { quienes_somos: { imagen: 'foto' } }, { contacto: { correo: 'incorrecto' } },
    { contacto: { telefono: 'abc' } }, { valores: [{ titulo: 'Fe' }] }, { valores: Array(21).fill({ titulo: 'Fe', descripcion: 'Test' }) },
    { horarios_misa: [{ dias: 'Domingo', horas: ['25:00'] }] }, { horarios_oficina: [{ dias: 'Domingo', horario: 123 }] },
  ])('valida el body antes de acceder a la base: %j', async body => {
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' })
      .set('Content-Type', 'application/json').send(body === null ? 'null' : body).expect(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('rechaza claves que intentan alterar el prototipo', async () => {
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' })
      .set('Content-Type', 'application/json').send('{"__proto__":{"publico":true}}').expect(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('devuelve 404 cuando falta inicializar el contenido', async () => {
    vi.mocked(pool.execute).mockResolvedValueOnce([[], []]);
    await request(app).get('/api/public/landing').expect(404);
    conn.execute.mockReset().mockResolvedValueOnce([[], []]);
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send({ cantidad_grupos: 15 }).expect(404);
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it('revierte una actualización fallida y libera la conexión', async () => {
    conn.execute.mockReset().mockResolvedValueOnce([[{ contenido }], []]).mockRejectedValueOnce(new Error('SQL privado'));
    const response = await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' })
      .send({ cantidad_espacios: 9 }).expect(500);
    expect(response.body).toEqual({ mensaje: 'Error al actualizar el contenido de la landing' });
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it('controla errores al conectar o leer sin filtrar detalles internos', async () => {
    vi.mocked(pool.getConnection).mockRejectedValueOnce(new Error('credenciales privadas'));
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send({ cantidad_grupos: 15 }).expect(500);
    vi.mocked(pool.execute).mockRejectedValueOnce(new Error('tabla privada'));
    const response = await request(app).get('/api/public/landing').expect(500);
    expect(response.body).toEqual({ mensaje: 'Error al obtener el contenido de la landing' });
  });
});
