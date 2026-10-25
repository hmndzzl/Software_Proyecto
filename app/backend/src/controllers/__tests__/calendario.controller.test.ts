import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import pool from '../../config/db';
import { getCalendario } from '../calendario.controller';

vi.mock('../../config/db', () => ({ default: { getConnection: vi.fn() } }));
const conn = { beginTransaction: vi.fn(), execute: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
const tareas = [
  { id: 1, titulo: 'Preparar', fecha: '2026-10-24', evento_id: 8 },
  { id: 2, titulo: 'Visitar', fecha: '2026-10-24', evento_id: null },
];
const eventos = [
  { id: 8, titulo: 'Misa', encargado_id: 1, estado_reserva_id: 2 },
  { id: 9, titulo: 'Pendiente', encargado_id: 1, estado_reserva_id: 1 },
  { id: 10, titulo: 'Cancelado', encargado_id: 1, estado_reserva_id: 4 },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(pool.getConnection).mockResolvedValue(conn as never);
  conn.execute.mockImplementation(async (sql: string) => {
    if (sql.startsWith('SELECT p.id')) return [[{ id: 4 }]];
    if (sql.startsWith('SELECT t.*')) return [tareas];
    if (sql.startsWith('SELECT a.tarea_id')) return [[{ tarea_id: 1, persona_id: 4, nombre: 'Ana' }, { tarea_id: 2, persona_id: 5, nombre: 'Luis' }]];
    return [eventos];
  });
});

async function consultar(query: Record<string, unknown> = {}, rol = 5) {
  const json = vi.fn();
  const res = { status: vi.fn().mockReturnThis(), json, headersSent: false };
  json.mockImplementation(() => { res.headersSent = true; });
  await getCalendario({ user: { id: 4, rol_id: rol }, query: { fecha_inicio: '2026-10-01', fecha_fin: '2026-10-31', vista: 'coordinacion', ...query } } as unknown as Request, res as unknown as Response);
  return { res, body: json.mock.calls[0]?.[0] };
}

describe('calendario unificado', () => {
  it('devuelve tareas y eventos con equipo sin correos y omite cancelados sin compromisos', async () => {
    const { res, body } = await consultar();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.eventos.map((e: { id: number }) => e.id)).toEqual([8, 9]);
    expect(body.eventos[0].tareas[0].asignados).toEqual([{ persona_id: 4, nombre: 'Ana' }]);
    expect(conn.execute).toHaveBeenCalledTimes(3);
    expect(conn.commit).toHaveBeenCalledOnce();
  });

  it('filtra una persona sin perder el equipo autorizado del evento', async () => {
    const { body } = await consultar({ persona_id: '4' });
    expect(body.tareas.map((t: { id: number }) => t.id)).toEqual([1]);
    expect(body.eventos.map((e: { id: number }) => e.id)).toEqual([8]);
  });

  it.each([
    { vista: 'coordinacion' }, { vista: 'coordinacion', persona_id: '4' },
    { vista: 'personal' }, { vista: 'parroquial' },
  ])('oculta el evento cancelado y sus tareas incluso si la persona es encargada: %j', async query => {
    const original = conn.execute.getMockImplementation()!;
    conn.execute.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT t.*')) return [[...tareas, { id: 3, titulo: 'Preparar evento cancelado', evento_id: 10 }]];
      if (sql.startsWith('SELECT a.tarea_id')) return [[{ tarea_id: 1, persona_id: 4, nombre: 'Ana' }, { tarea_id: 3, persona_id: 4, nombre: 'Ana' }]];
      if (sql.startsWith('SELECT e.id')) return [eventos.map(e => ({ ...e, encargado_id: 4 }))];
      return original(sql);
    });
    const { res, body } = await consultar(query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.eventos.map((e: { id: number }) => e.id)).not.toContain(10);
    expect(body.tareas.map((t: { id: number }) => t.id)).not.toContain(3);
    if (query.vista !== 'parroquial') expect(body.tareas.map((t: { id: number }) => t.id)).toContain(1);
  });

  it('limita las consultas y asignados del coordinador a sus ministros', async () => {
    await consultar({}, 2);
    expect(conn.execute.mock.calls[0][0]).toContain('cm.coordinador_id = ?');
    expect(conn.execute.mock.calls[0][1]).toEqual(['2026-10-01', '2026-10-31', 4]);
    expect(conn.execute.mock.calls[1][0]).toContain('cm.coordinador_id = ?');
  });

  it('rechaza un ministro ajeno o inactivo y revierte la lectura', async () => {
    conn.execute.mockResolvedValueOnce([[]]);
    const { res } = await consultar({ persona_id: '99' }, 2);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.execute).toHaveBeenCalledTimes(1);
  });

  it('la vista personal filtra tareas y nombres por usuario autenticado', async () => {
    const { body } = await consultar({ vista: 'personal' }, 4);
    expect(conn.execute.mock.calls[0][0]).toContain('a.persona_id = ?');
    expect(conn.execute.mock.calls[1][0]).toContain('AND a.persona_id = ?');
    expect(body.eventos.map((e: { id: number }) => e.id)).toEqual([8]);
  });

  it('la vista parroquial contiene solo eventos confirmados sin tareas', async () => {
    const { body } = await consultar({ vista: 'parroquial' }, 4);
    expect(body.tareas).toEqual([]);
    expect(body.eventos.map((e: { id: number }) => e.id)).toEqual([8]);
    expect(body.eventos[0].tareas).toEqual([]);
    expect(conn.execute).toHaveBeenCalledTimes(1);
  });

  it.each([
    { fecha_inicio: '2026-02-30' }, { fecha_fin: '2026-09-30' },
    { fecha_fin: '2026-11-12' }, { vista: 'otra' }, { persona_id: '-1' },
    { persona_id: ['4'] }, { fecha_inicio: ['2026-10-01'] },
  ])('rechaza parámetros inválidos: %j', async query => {
    const { res } = await consultar(query);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it.each([3, 4])('deniega coordinación al rol %s', async rol => {
    const { res } = await consultar({}, rol);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('no permite persona_id en la vista personal', async () => {
    const { res } = await consultar({ vista: 'personal', persona_id: '5' }, 4);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('admite 42 días exactos y años bisiestos', async () => {
    const { res } = await consultar({ fecha_inicio: '2028-02-01', fecha_fin: '2028-03-13' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('no consulta asignaciones si no existen tareas', async () => {
    conn.execute.mockResolvedValueOnce([[]]);
    const { body } = await consultar();
    expect(body.tareas).toEqual([]);
    expect(conn.execute).toHaveBeenCalledTimes(2);
  });

  it('informa fallos y libera la conexión', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    conn.execute.mockRejectedValueOnce(new Error('BD'));
    const { res } = await consultar();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.release).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});
