import { beforeEach, describe, expect, it, vi } from 'vitest';
import pool from '../../config/db';
import { ROLES } from '../../config/roles';
import { guardarTareaConMinistros, validarMinistros } from '../tareasAsignacion.service';

vi.mock('../../config/db', () => ({ default: { getConnection: vi.fn() } }));
const entrada = { titulo: 'Lectura', descripcion: 'Preparación', fecha: '2099-10-20', hora_inicio: '10:00', hora_fin: '11:00' };
const admin = { id: 1, rol_id: ROLES.ADMIN };
const ministros = [{ id: 9, nombre: 'Ana', disponible: 0 }, { id: 10, nombre: 'Luis', disponible: 1 }];
const conn = { beginTransaction: vi.fn(), execute: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(pool.getConnection).mockResolvedValue(conn as never);
  conn.execute.mockImplementation(async (sql: string) => {
    if (sql.startsWith('SELECT * FROM tarea')) return [[{ ...entrada, id: 7 }]];
    if (sql.startsWith('SELECT id, nombre')) return [ministros];
    if (sql.startsWith('SELECT ministro_id')) return [[{ ministro_id: 9 }, { ministro_id: 10 }]];
    if (sql.startsWith('SELECT t.id')) return [[]];
    if (sql.startsWith('SELECT COUNT')) return [[{ total: 9 }]];
    return [{ insertId: 7, affectedRows: 1 }];
  });
});

describe('asignación múltiple transaccional', () => {
  it.each([null, [], '9', [0], [-1], ['9'], [1.5], Array.from({ length: 101 }, (_, i) => i + 1)])('rechaza identificadores inválidos: %j', ids => {
    expect(() => validarMinistros(ids)).toThrow('Selecciona entre 1 y 100 ministros válidos');
  });

  it('elimina duplicados y ordena los ministros', () => {
    expect(validarMinistros([10, 9, 9])).toEqual([9, 10]);
  });

  it('crea una sola tarea, dos asignaciones y una notificación no leída para cada ministro', async () => {
    const resultado = await guardarTareaConMinistros(entrada, [9, 10], admin);
    expect(resultado.tarea.id).toBe(7);
    expect(conn.execute.mock.calls.filter(([sql]) => sql.startsWith('INSERT INTO tarea'))).toHaveLength(1);
    expect(conn.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT IGNORE INTO asignacion_tarea'), [7, 9]);
    expect(conn.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT IGNORE INTO asignacion_tarea'), [7, 10]);
    expect(conn.execute.mock.calls.filter(([sql]) => sql.startsWith('INSERT INTO persona_notificacion'))).toHaveLength(2);
    expect(resultado.alertas[0]).toMatchObject({ persona_id: 9, ministro_no_disponible: true, tope_servicios_superado: true });
    expect(conn.commit).toHaveBeenCalledOnce();
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it('espera al commit antes de devolver éxito', async () => {
    let confirmar!: () => void;
    conn.commit.mockImplementationOnce(() => new Promise<void>(resolve => { confirmar = resolve; }));
    let finalizado = false;
    const guardado = guardarTareaConMinistros(entrada, [9, 10], admin).then(() => { finalizado = true; });
    await vi.waitFor(() => expect(conn.commit).toHaveBeenCalledOnce());
    expect(finalizado).toBe(false);
    confirmar();
    await guardado;
    expect(finalizado).toBe(true);
  });

  it('agrega a una tarea existente sin duplicar tarea ni notificar asignaciones repetidas', async () => {
    const original = conn.execute.getMockImplementation()!;
    conn.execute.mockImplementation(async (sql, ...args) => sql.startsWith('INSERT IGNORE') ? [{ affectedRows: 0 }] : original(sql, ...args));
    await guardarTareaConMinistros(7, [9, 10], admin);
    expect(conn.execute.mock.calls.some(([sql]) => sql.startsWith('INSERT INTO tarea'))).toBe(false);
    expect(conn.execute.mock.calls.some(([sql]) => sql.startsWith('INSERT INTO notificacion'))).toBe(false);
  });

  it('rechaza una tarea inexistente', async () => {
    conn.execute.mockResolvedValueOnce([[]]);
    await expect(guardarTareaConMinistros(99, [9, 10], admin)).rejects.toMatchObject({ status: 404 });
    expect(conn.rollback).toHaveBeenCalledOnce();
  });

  it('rechaza ministros inactivos, inexistentes o que no sean ministros', async () => {
    conn.execute.mockResolvedValueOnce([[ministros[0]]]);
    await expect(guardarTareaConMinistros(entrada, [9, 10], admin)).rejects.toMatchObject({ status: 404 });
    expect(conn.commit).not.toHaveBeenCalled();
  });

  it('respeta los ministros propios del coordinador', async () => {
    const usuario = { id: 3, rol_id: ROLES.COORDINADOR_MINISTROS };
    await guardarTareaConMinistros(entrada, [9, 10], usuario);
    expect(conn.execute).toHaveBeenCalledWith(expect.stringContaining('coordinador_ministro'), [3, 9, 10, ROLES.MINISTRO]);
  });

  it('impide al coordinador asignar a ministros ajenos', async () => {
    conn.execute.mockResolvedValueOnce([ministros]).mockResolvedValueOnce([[]]);
    await expect(guardarTareaConMinistros(entrada, [9, 10], { id: 3, rol_id: ROLES.COORDINADOR_MINISTROS })).rejects.toMatchObject({ status: 403 });
    expect(conn.rollback).toHaveBeenCalledOnce();
  });

  it('revierte toda la operación si uno de los ministros tiene conflicto', async () => {
    conn.execute.mockResolvedValueOnce([ministros]).mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ id: 2 }]]);
    await expect(guardarTareaConMinistros(entrada, [9, 10], admin)).rejects.toMatchObject({ status: 409, message: expect.stringContaining('Luis') });
    expect(conn.execute.mock.calls.some(([sql]) => sql.startsWith('INSERT'))).toBe(false);
    expect(conn.rollback).toHaveBeenCalledOnce();
  });

  it('revierte tarea, asignaciones y notificaciones si falla una escritura o el commit', async () => {
    conn.commit.mockRejectedValueOnce(new Error('Fallo al confirmar'));
    await expect(guardarTareaConMinistros(entrada, [9, 10], admin)).rejects.toThrow('Fallo al confirmar');
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.release).toHaveBeenCalledOnce();
  });
});
