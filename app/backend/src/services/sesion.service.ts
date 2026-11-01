import type { RowDataPacket } from 'mysql2';
import pool from '../config/db';
import type { EstadoCuenta } from '../config/cuentas';
import { esIdSesion } from './jwtSesion.service';

interface PersonaSesion { id: number; rol_id: number; estado_cuenta: EstadoCuenta }

/** Sin caché: la baja y los cambios de rol invalidan el acceso en la siguiente petición. */
export async function obtenerPersonaSesion(id: number, sid?: unknown, tokenUse?: unknown): Promise<PersonaSesion | null> {
  if (!esIdSesion(sid) || tokenUse !== 'access') return null;
  const [personas] = await pool.execute<RowDataPacket[]>(
    `SELECT p.id, p.rol_id, p.estado_cuenta FROM persona p
     JOIN sesion_jwt s ON s.persona_id = p.id
     WHERE p.id = ? AND s.id = ? AND (p.estado_cuenta <> 'activa'
       OR (s.revocada_en IS NULL AND s.expira_en > UNIX_TIMESTAMP()))`, [id, sid],
  );
  return personas.length ? personas[0] as PersonaSesion & RowDataPacket : null;
}
