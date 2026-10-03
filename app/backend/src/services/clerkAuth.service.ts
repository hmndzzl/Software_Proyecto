import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { getClerkClient } from '../config/clerk';
import type { JwtPayload } from '../middlewares/auth.middleware';

/**
 * Traduce un usuario de Clerk a la persona del sistema. Los roles se siguen
 * leyendo de persona.rol_id, por lo que requireRole y la jerarquía de roles
 * funcionan igual que con los JWT propios.
 *
 * La primera vez que un usuario entra con Clerk se vincula con la persona que
 * tenga su mismo correo verificado; las siguientes se busca por clerk_user_id.
 */
export async function resolvePersonaFromClerk(clerkUserId: string): Promise<JwtPayload | null> {
  const [vinculadas] = await pool.execute<RowDataPacket[]>(
    'SELECT id, rol_id FROM persona WHERE clerk_user_id = ?',
    [clerkUserId]
  );
  if (vinculadas.length > 0) {
    return { id: vinculadas[0].id, rol_id: vinculadas[0].rol_id };
  }

  const clerkUser = await getClerkClient().users.getUser(clerkUserId);
  const correosVerificados = clerkUser.emailAddresses
    .filter((email) => email.verification?.status === 'verified')
    .map((email) => email.emailAddress.toLowerCase());

  if (correosVerificados.length === 0) return null;

  const placeholders = correosVerificados.map(() => '?').join(', ');
  const [candidatas] = await pool.execute<RowDataPacket[]>(
    `SELECT id, rol_id FROM persona WHERE LOWER(correo) IN (${placeholders}) AND clerk_user_id IS NULL`,
    correosVerificados
  );
  if (candidatas.length !== 1) return null;

  const persona = candidatas[0];
  const [resultado] = await pool.execute<ResultSetHeader>(
    'UPDATE persona SET clerk_user_id = ? WHERE id = ? AND clerk_user_id IS NULL',
    [clerkUserId, persona.id]
  );
  if (resultado.affectedRows !== 1) return null;

  return { id: persona.id, rol_id: persona.rol_id };
}
