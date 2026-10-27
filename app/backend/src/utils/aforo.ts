import type { PoolConnection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

export class ErrorAforo extends Error { constructor(public status: number, mensaje: string) { super(mensaje); } }

export function validarCantidadEsperada(value: unknown): number | undefined {
  // Las reservas anteriores y los clientes antiguos pueden no tener este dato.
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 2147483647) {
    throw new ErrorAforo(400, 'La cantidad de personas esperadas debe ser un número entero mayor que cero');
  }
  return value as number;
}

export async function validarCapacidad(conn: Pick<PoolConnection, 'query'>, espacioId: number, cantidad: number | null) {
  if (cantidad === null) return;
  const [espacios] = await conn.query<RowDataPacket[]>('SELECT capacidad FROM espacio WHERE id = ? LOCK IN SHARE MODE', [espacioId]);
  if (!espacios.length) throw new ErrorAforo(404, 'El espacio seleccionado ya no está disponible');
  const capacidad = espacios[0].capacidad;
  if (capacidad !== null && cantidad > Number(capacidad)) {
    throw new ErrorAforo(400, `La cantidad esperada (${cantidad}) supera la capacidad del espacio (${capacidad} personas)`);
  }
}
