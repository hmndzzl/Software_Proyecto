/**
 * Formatea cualquier string de fecha (ISO o YYYY-MM-DD) como "13 de septiembre de 2026".
 * Usa UTC para evitar desfase de timezone al parsear fechas sin hora.
 */
export function formatFecha(fecha: string): string {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Recorta una hora "HH:MM:SS" a "HH:MM". */
export function formatHora(hora: string): string {
  return hora.substring(0, 5);
}

/** Día y mes abreviado por separado, para bloques de fecha tipo "13 / SEP". */
export function partesFecha(fecha: string): { dia: string; mesAbrev: string } {
  const d = new Date(fecha);
  const dia = d.toLocaleDateString('es-GT', { day: '2-digit', timeZone: 'UTC' });
  const mesAbrev = d
    .toLocaleDateString('es-GT', { month: 'short', timeZone: 'UTC' })
    .replace('.', '')
    .toUpperCase();
  return { dia, mesAbrev };
}
