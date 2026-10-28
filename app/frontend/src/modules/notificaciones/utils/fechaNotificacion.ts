import { formatFecha, formatFechaHora } from '../../../utils/date';

export function fechaNotificacion(fecha: string, enviadoEn?: string | null): string {
  if (!enviadoEn) return `${formatFecha(fecha)} · Hora no registrada`;
  return formatFechaHora(enviadoEn);
}

// datetime-local representa la hora parroquial (UTC-6), no la zona del navegador.
export function enRangoEnvio(enviadoEn: string | null | undefined, desde: string, hasta: string): boolean {
  if (!desde && !hasta) return true;
  if (!enviadoEn) return false;
  const instante = Date.parse(enviadoEn);
  return (!desde || instante >= Date.parse(`${desde}:00-06:00`))
    && (!hasta || instante < Date.parse(`${hasta}:00-06:00`) + 60_000);
}
