// Guatemala es UTC-6 sin horario de verano. Mismo patrón que ya usa
// agendaPublica.controller.ts para "no terminados", centralizado aquí para
// reutilizarlo en el check-in de reservas y el estado "en uso" de espacios.
export const AHORA_GUATEMALA_SQL = "CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00')";
