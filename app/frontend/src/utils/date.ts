/**
 * Formatea cualquier string de fecha (ISO o YYYY-MM-DD) como "21 may. 2026".
 * Usa UTC para evitar desfase de timezone al parsear fechas sin hora.
 */
export function formatFecha(fecha: string): string {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
