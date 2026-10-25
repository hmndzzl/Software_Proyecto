// Guatemala es UTC-6 sin horario de verano. Mismo patrón que ya usa
// agendaPublica.controller.ts para "no terminados", centralizado aquí para
// reutilizarlo en el check-in de reservas y el estado "en uso" de espacios.
export const AHORA_GUATEMALA_SQL = "CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00')";

interface Queryable {
  query: (sql: string) => Promise<any>;
}

// `new Date()` lee la hora del servidor (en Docker, UTC) — cerca de medianoche
// Guatemala (UTC-6) eso hace que "hoy" ya sea mañana para el servidor y rechace
// como "en el pasado" una fecha que en Guatemala todavía no ha llegado a su fin.
export async function obtenerFechaHoraGuatemala(
  executor: Queryable
): Promise<{ hoy: string; horaActual: string }> {
  const [rows]: any = await executor.query(
    `SELECT DATE_FORMAT(${AHORA_GUATEMALA_SQL}, '%Y-%m-%d') AS hoy,
            DATE_FORMAT(${AHORA_GUATEMALA_SQL}, '%H:%i') AS horaActual`
  );
  return rows[0];
}
