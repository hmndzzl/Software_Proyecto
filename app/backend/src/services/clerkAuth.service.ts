import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { User } from '@clerk/express';
import pool from '../config/db';
import { getClerkClient } from '../config/clerk';
import { ESTADOS_CUENTA, type EstadoCuenta } from '../config/cuentas';
import { ROLES } from '../config/roles';
import type { JwtPayload } from '../middlewares/auth.middleware';

export interface PersonaClerk extends JwtPayload {
  estado_cuenta: EstadoCuenta;
}

const MAX_NOMBRE = 100;

/**
 * Traduce un usuario de Clerk a la persona del sistema. Los roles se siguen
 * leyendo de persona.rol_id, por lo que requireRole y la jerarquía de roles
 * funcionan igual que con los JWT propios.
 *
 * La primera vez que un usuario entra con Clerk se vincula con la persona que
 * tenga su mismo correo verificado; las siguientes se busca por clerk_user_id.
 * Si ninguna persona tiene ese correo, se crea una cuenta 'pendiente' (sin acceso)
 * para que Admin o Sacerdote la apruebe y le asigne un rol.
 *
 * Devuelve también estado_cuenta: quien lo llama decide si la cuenta puede entrar.
 */
export async function resolvePersonaFromClerk(clerkUserId: string): Promise<PersonaClerk | null> {
  const vinculada = await buscarPorClerkUserId(clerkUserId);
  if (vinculada) return vinculada;

  const clerkUser = await getClerkClient().users.getUser(clerkUserId);
  const correosVerificados = clerkUser.emailAddresses
    .filter((email) => email.verification?.status === 'verified')
    .map((email) => email.emailAddress.toLowerCase());

  if (correosVerificados.length === 0) return null;

  const placeholders = correosVerificados.map(() => '?').join(', ');
  const [coincidencias] = await pool.execute<RowDataPacket[]>(
    `SELECT id, rol_id, estado_cuenta, clerk_user_id FROM persona WHERE LOWER(correo) IN (${placeholders})`,
    correosVerificados
  );
  if (coincidencias.length === 0) {
    return crearPersonaPendiente(clerkUserId, clerkUser, correosVerificados[0]);
  }

  // Una persona ya vinculada a otro usuario de Clerk, o varias coincidencias, no se reasigna.
  const candidatas = coincidencias.filter((fila) => fila.clerk_user_id === null);
  if (coincidencias.length !== 1 || candidatas.length !== 1) return null;

  const persona = candidatas[0];
  const [resultado] = await pool.execute<ResultSetHeader>(
    'UPDATE persona SET clerk_user_id = ? WHERE id = ? AND clerk_user_id IS NULL',
    [clerkUserId, persona.id]
  );
  if (resultado.affectedRows !== 1) return null;

  return { id: persona.id, rol_id: persona.rol_id, estado_cuenta: persona.estado_cuenta };
}

async function buscarPorClerkUserId(clerkUserId: string): Promise<PersonaClerk | null> {
  const [filas] = await pool.execute<RowDataPacket[]>(
    'SELECT id, rol_id, estado_cuenta FROM persona WHERE clerk_user_id = ?',
    [clerkUserId]
  );
  if (filas.length === 0) return null;
  return { id: filas[0].id, rol_id: filas[0].rol_id, estado_cuenta: filas[0].estado_cuenta };
}

// La cuenta nace con el rol de menor privilegio como valor provisional y una
// contraseña aleatoria que nadie conoce: no puede entrar por el acceso anterior.
// El rol real lo define quien la apruebe.
async function crearPersonaPendiente(clerkUserId: string, clerkUser: User, correo: string): Promise<PersonaClerk | null> {
  const nombre = ([clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || correo.split('@')[0])
    .slice(0, MAX_NOMBRE);
  const password = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

  try {
    const [resultado] = await pool.execute<ResultSetHeader>(
      'INSERT INTO persona (nombre, correo, password, rol_id, clerk_user_id, estado_cuenta) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, correo, password, ROLES.MINISTRO, clerkUserId, ESTADOS_CUENTA.PENDIENTE]
    );
    return { id: resultado.insertId, rol_id: ROLES.MINISTRO, estado_cuenta: ESTADOS_CUENTA.PENDIENTE };
  } catch (error) {
    // Dos peticiones simultáneas del mismo usuario: la otra ya creó la cuenta.
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return buscarPorClerkUserId(clerkUserId);
    throw error;
  }
}
