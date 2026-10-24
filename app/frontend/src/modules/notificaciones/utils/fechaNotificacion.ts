import { formatFecha } from '../../../utils/date';

export function fechaNotificacion(fecha: string, enviadoEn?: string | null): string {
  if (!enviadoEn) return `${formatFecha(fecha)} · Hora no registrada`;
  return new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(enviadoEn));
}

// datetime-local representa la hora parroquial (UTC-6), no la zona del navegador.
export function enRangoEnvio(enviadoEn: string | null | undefined, desde: string, hasta: string): boolean {
  if (!desde && !hasta) return true;
  if (!enviadoEn) return false;
  const instante = Date.parse(enviadoEn);
  return (!desde || instante >= Date.parse(`${desde}:00-06:00`))
    && (!hasta || instante < Date.parse(`${hasta}:00-06:00`) + 60_000);
}
