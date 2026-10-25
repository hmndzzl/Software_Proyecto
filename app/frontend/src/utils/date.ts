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

// ── Semana activa (usado por calendarios tipo grid 7 columnas: tareas, reservas) ──

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/** Lunes de la semana de la fecha dada, a medianoche local. */
export function getMonday(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  // en JS: Domingo=0, Lunes=1, ..., Sábado=6; diferencia hasta el lunes (1)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

/** Formatea una fecha local como 'YYYY-MM-DD', sin pasar por UTC/ISO. */
export function formatYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Texto de cabecera tipo "13 al 19 de octubre, 2026" para el rango lunes-domingo. */
export function formatRangeText(mon: Date, sun: Date): string {
  const monDay = mon.getDate();
  const monMonth = MESES[mon.getMonth()];
  const sunDay = sun.getDate();
  const sunMonth = MESES[sun.getMonth()];
  const sunYear = sun.getFullYear();

  if (mon.getMonth() === sun.getMonth()) {
    return `${monDay} al ${sunDay} de ${monMonth}, ${sunYear}`;
  }
  return `${monDay} de ${monMonth} al ${sunDay} de ${sunMonth}, ${sunYear}`;
}

/**
 * La API puede devolver 'YYYY-MM-DD' o un ISO completo ('YYYY-MM-DDTHH:mm:ss.sssZ').
 * Nos quedamos siempre con la parte de fecha, sin volver a parsear a Date
 * (parsear reintroduciría el desfase de zona horaria).
 */
export function fechaKey(fecha?: string | null): string {
  return fecha ? fecha.slice(0, 10) : '';
}

/**
 * Determina si una tarea (con fecha YYYY-MM-DD o ISO y hora_inicio HH:MM[:SS])
 * tiene una fecha/hora futura respecto a una fecha de referencia (por defecto 'ahora').
 */
export function esTareaFutura(fecha?: string | null, horaInicio?: string | null, ahora = new Date()): boolean {
  if (!fecha) return false;
  const f = fechaKey(fecha);
  const hoyStr = formatYYYYMMDD(ahora);
  if (f > hoyStr) return true;
  if (f < hoyStr) return false;
  if (!horaInicio) return false;
  const hh = String(ahora.getHours()).padStart(2, '0');
  const mm = String(ahora.getMinutes()).padStart(2, '0');
  const horaActualStr = `${hh}:${mm}`;
  return horaInicio.substring(0, 5) > horaActualStr;
}
