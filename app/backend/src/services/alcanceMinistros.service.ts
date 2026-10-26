import type { PoolConnection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { ROLES } from '../config/roles';
import { HttpStatus } from '../utils/httpStatus';
import { ErrorAsignacion } from './asignacionError';

export async function validarMinistrosPropios(
  db: Pick<PoolConnection, 'execute'>,
  usuario: { id: number; rol_id: number },
  ministros: number[],
) {
  if (usuario.rol_id !== ROLES.COORDINADOR_MINISTROS) return;
  const ids = [...new Set(ministros)];
  if (!ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new ErrorAsignacion(HttpStatus.BAD_REQUEST, 'Selecciona ministros válidos');
  }
  const [propios] = await db.execute<RowDataPacket[]>(
    `SELECT ministro_id FROM coordinador_ministro cm
     JOIN persona p ON p.id = cm.ministro_id
     WHERE cm.coordinador_id = ? AND cm.ministro_id IN (${ids.map(() => '?').join(', ')})
       AND p.rol_id = ? AND p.estado_cuenta = 'activa'`,
    [usuario.id, ...ids, ROLES.MINISTRO],
  );
  if (propios.length !== ids.length) {
    throw new ErrorAsignacion(HttpStatus.FORBIDDEN, 'Solo puedes gestionar asignaciones de tus propios ministros activos');
  }
}
