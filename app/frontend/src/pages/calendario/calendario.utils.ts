import type { Calendario, EventoCalendario } from '../../api/calendario';
import type { Tarea } from '../../types';
import { fechaKey, formatHorario, formatYYYYMMDD, getMonday } from '../../utils/date';

export type Compromiso = { tipo: 'evento'; dato: EventoCalendario } | { tipo: 'tarea'; dato: Tarea };
export const fechaCompleta = (fecha: string) => new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export function horaLegible(hora: string) {
  if (!hora) return 'Horario no indicado';
  const [h, m] = hora.split(':');
  return `${Number(h) % 12 || 12}:${m} ${Number(h) < 12 ? 'a. m.' : 'p. m.'}`;
}
export const horario = (dato: { hora_inicio: string; hora_fin: string }) => formatHorario(dato.hora_inicio, dato.hora_fin);
export const estadoEvento = (estado: number) => ({ 1: 'Pendiente de aprobación', 2: 'Confirmado', 3: 'Rechazado', 4: 'Cancelado' })[estado] ?? 'Estado no indicado';

export function diasSemana(fecha: Date) {
  const lunes = getMonday(fecha);
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    return dia;
  });
}

/** Semanas completas del mes: entre 28 y 42 días, sin conversiones a UTC. */
export function diasMes(fecha: Date) {
  const primero = getMonday(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
  const ultimo = diasSemana(new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0))[6];
  const dias: Date[] = [];
  for (const dia = new Date(primero); dia <= ultimo; dia.setDate(dia.getDate() + 1)) dias.push(new Date(dia));
  return dias;
}

export function desplazarMes(fecha: Date, cantidad: number) {
  const primero = new Date(fecha.getFullYear(), fecha.getMonth() + cantidad, 1);
  const ultimo = new Date(primero.getFullYear(), primero.getMonth() + 1, 0).getDate();
  primero.setDate(Math.min(fecha.getDate(), ultimo));
  return primero;
}

export function compromisosPorDia(datos: Calendario): Map<string, Compromiso[]> {
  const resultado = new Map<string, Compromiso[]>();
  const eventos = new Set(datos.eventos.map(e => e.id));
  const elementos: Compromiso[] = [
    ...datos.eventos.map(dato => ({ tipo: 'evento' as const, dato })),
    ...datos.tareas.filter(t => !t.evento_id || !eventos.has(t.evento_id)).map(dato => ({ tipo: 'tarea' as const, dato })),
  ];
  const vistos = new Set<string>();
  for (const item of elementos) {
    const clave = `${item.tipo}-${item.dato.id}`;
    const dia = fechaKey(item.dato.fecha);
    if (!dia || vistos.has(clave)) continue;
    vistos.add(clave);
    const lista = resultado.get(dia) ?? [];
    lista.push(item);
    resultado.set(dia, lista);
  }
  resultado.forEach(lista => lista.sort((a, b) => a.dato.hora_inicio.localeCompare(b.dato.hora_inicio) || a.dato.id - b.dato.id));
  return resultado;
}

export const claveDia = formatYYYYMMDD;
