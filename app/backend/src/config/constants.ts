// Tope de servicios (tareas asignadas) que un ministro puede tener en un mismo mes
// antes de que asignarTarea emita un aviso de sobrecarga/rotación.
export const TOPE_SERVICIOS_MES = 8;

// Minutos antes de hora_inicio en los que ya se permite hacer check-in de una
// reserva confirmada (HU-15), aunque el salón todavía esté en uso por otra reserva.
export const CHECKIN_ANTICIPACION_MIN = 15;
