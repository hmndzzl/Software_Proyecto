import { describe, expect, it, vi } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import { esTelefonoDuplicado, guardarTelefono, normalizarTelefono } from '../telefono';
import { validarCantidadEsperada, validarCapacidad } from '../aforo';

describe('teléfono principal', () => {
  it.each([undefined, null, '', '   '])('acepta omisión %s', valor => expect(normalizarTelefono(valor)).toBeNull());
  it.each(['55551234', '(5555) 1234', '+502 5555-1234'])('normaliza %s', valor => expect(normalizarTelefono(valor)).toBe('+50255551234'));
  it.each([5, {}, 'abc', '1'.repeat(51), '123', '+012345678', '50255551234'])('rechaza %s', valor => expect(() => normalizarTelefono(valor)).toThrow());
  it('distingue duplicados del teléfono de otros errores', () => {
    expect(esTelefonoDuplicado({ code: 'ER_DUP_ENTRY', sqlMessage: 'uq_telefono_numero' })).toBe(true);
    expect(esTelefonoDuplicado({ code: 'ER_DUP_ENTRY', message: 'uq_telefono_numero' })).toBe(true);
    expect(esTelefonoDuplicado({ code: 'ER_DUP_ENTRY' })).toBe(false);
    expect(esTelefonoDuplicado(null)).toBe(false);
  });
  it.each([true, false])('edita o elimina solo el registro principal (%s)', async editar => {
    const execute = vi.fn().mockResolvedValueOnce([[{ id: 12 }]]).mockResolvedValue([{}]);
    await guardarTelefono({ execute } as unknown as PoolConnection, 9, editar ? '+50255551234' : null);
    expect(execute).toHaveBeenLastCalledWith(editar ? 'UPDATE telefono SET numero = ? WHERE id = ?' : 'DELETE FROM telefono WHERE id = ?', editar ? ['+50255551234', 12] : [12]);
  });
  it.each([true, false])('sin teléfono previo inserta solo si hay número (%s)', async insertar => {
    const execute = vi.fn().mockResolvedValueOnce([[]]).mockResolvedValue([{}]);
    await guardarTelefono({ execute } as unknown as PoolConnection, 9, insertar ? '+50255551234' : null);
    expect(execute).toHaveBeenCalledTimes(insertar ? 2 : 1);
  });
});

describe('validación de aforo', () => {
  it('conserva compatibilidad para cantidades omitidas', () => expect(validarCantidadEsperada(undefined)).toBeUndefined());
  it.each([null, '', '20', 0, -1, 1.5, 2147483648])('rechaza cantidad %s', valor => expect(() => validarCantidadEsperada(valor)).toThrow());
  it('acepta enteros positivos', () => expect(validarCantidadEsperada(80)).toBe(80));
  it('no consulta aforo de reservas históricas', async () => {
    const query = vi.fn();
    await validarCapacidad({ query } as unknown as PoolConnection, 2, null);
    expect(query).not.toHaveBeenCalled();
  });
  it.each([80, null])('acepta el límite o la capacidad desconocida (%s)', async capacidad => {
    const query = vi.fn().mockResolvedValue([[{ capacidad }]]);
    await expect(validarCapacidad({ query } as unknown as PoolConnection, 2, 80)).resolves.toBeUndefined();
  });
  it('rechaza espacio inexistente y exceso', async () => {
    const query = vi.fn().mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ capacidad: 80 }]]);
    await expect(validarCapacidad({ query } as unknown as PoolConnection, 2, 80)).rejects.toMatchObject({ status: 404 });
    await expect(validarCapacidad({ query } as unknown as PoolConnection, 2, 81)).rejects.toMatchObject({ status: 400 });
  });
});
