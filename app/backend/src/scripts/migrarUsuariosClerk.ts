// Migra a Clerk las personas que aún no tienen clerk_user_id.
// Las contraseñas se importan con su hash bcrypt, así que cada usuario sigue
// entrando con la misma contraseña. Los roles no se tocan: siguen en persona.rol_id.
//
// Uso (desde app/backend):
//   npm run clerk:migrar -- --dry-run   # solo muestra qué haría
//   npm run clerk:migrar
import dotenv from 'dotenv';
import { RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { isClerkEnabled, getClerkClient } from '../config/clerk';

dotenv.config();

const dryRun = process.argv.includes('--dry-run');

async function main() {
  if (!isClerkEnabled()) {
    throw new Error('Define CLERK_SECRET_KEY en el .env antes de migrar.');
  }

  const clerk = getClerkClient();
  const [personas] = await pool.execute<RowDataPacket[]>(
    'SELECT id, nombre, correo, password FROM persona WHERE clerk_user_id IS NULL ORDER BY id'
  );

  console.log(`${personas.length} persona(s) sin vincular${dryRun ? ' (dry-run)' : ''}.`);
  let vinculadas = 0;
  let creadas = 0;
  let fallidas = 0;

  for (const persona of personas) {
    try {
      const { data: existentes } = await clerk.users.getUserList({ emailAddress: [persona.correo] });

      if (existentes.length > 0) {
        console.log(`  [vincular] ${persona.correo} -> ${existentes[0].id}`);
        if (!dryRun) {
          await pool.execute('UPDATE persona SET clerk_user_id = ? WHERE id = ?', [existentes[0].id, persona.id]);
        }
        vinculadas++;
        continue;
      }

      console.log(`  [crear]    ${persona.correo}`);
      if (!dryRun) {
        const creado = await clerk.users.createUser({
          emailAddress: [persona.correo],
          firstName: persona.nombre,
          externalId: String(persona.id),
          passwordDigest: persona.password,
          passwordHasher: 'bcrypt',
        });
        await pool.execute('UPDATE persona SET clerk_user_id = ? WHERE id = ?', [creado.id, persona.id]);
      }
      creadas++;
    } catch (error) {
      fallidas++;
      console.error(`  [error]    ${persona.correo}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`Listo. Vinculadas: ${vinculadas}, creadas: ${creadas}, con error: ${fallidas}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
