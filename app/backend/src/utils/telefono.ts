import type { PoolConnection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

export const TELEFONO_PRINCIPAL_SQL = '(SELECT tel.numero FROM telefono tel WHERE tel.persona_id = p.id ORDER BY tel.id LIMIT 1) AS telefono';

export class ErrorTelefono extends Error { constructor(public status: number, mensaje: string) { super(mensaje); } }

export function normalizarTelefono(value: unknown): string | null {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return null;
  if (typeof value !== 'string' || value.length > 50 || !/^[+\d ()-]+$/.test(value)) {
    throw new ErrorTelefono(400, 'Ingresa un teléfono válido, por ejemplo +502 5555 1234');
  }
  let numero = value.replace(/[ ()-]/g, '');
  if (/^\d{8}$/.test(numero)) numero = `+502${numero}`;
  if (!/^\+[1-9]\d{7,14}$/.test(numero)) throw new ErrorTelefono(400, 'Incluye el código de país o ingresa un número local de 8 dígitos');
  return numero;
}

export function esTelefonoDuplicado(error: unknown): boolean {
  const err = error as { code?: string; sqlMessage?: string; message?: string };
  return err?.code === 'ER_DUP_ENTRY' && /uq_telefono_numero/.test(err.sqlMessage ?? err.message ?? '');
}

/** Edita solo el teléfono principal; conserva cualquier otro número ya registrado. */
export async function guardarTelefono(conn: PoolConnection, personaId: number, numero: string | null) {
  const [actual] = await conn.execute<RowDataPacket[]>('SELECT id FROM telefono WHERE persona_id = ? ORDER BY id LIMIT 1 FOR UPDATE', [personaId]);
  if (actual.length) {
    if (numero) await conn.execute('UPDATE telefono SET numero = ? WHERE id = ?', [numero, actual[0].id]);
    else await conn.execute('DELETE FROM telefono WHERE id = ?', [actual[0].id]);
  } else if (numero) {
    await conn.execute('INSERT INTO telefono (numero, persona_id) VALUES (?, ?)', [numero, personaId]);
  }
}
