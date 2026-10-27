import type { RowDataPacket } from 'mysql2';
import pool from '../config/db';
import type { EstadoCuenta } from '../config/cuentas';

interface PersonaSesion { id: number; rol_id: number; estado_cuenta: EstadoCuenta }

/** Sin caché: la baja y los cambios de rol invalidan el acceso en la siguiente petición. */
export async function obtenerPersonaSesion(id: number): Promise<PersonaSesion | null> {
  const [personas] = await pool.execute<RowDataPacket[]>(
    'SELECT id, rol_id, estado_cuenta FROM persona WHERE id = ?', [id],
  );
  return personas.length ? personas[0] as PersonaSesion & RowDataPacket : null;
}
