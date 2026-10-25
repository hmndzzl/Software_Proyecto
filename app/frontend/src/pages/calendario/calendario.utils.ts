import type { Calendario, EventoCalendario } from '../../api/calendario';
import type { Tarea } from '../../types';
import { fechaKey, formatYYYYMMDD, getMonday } from '../../utils/date';

export type Compromiso = { tipo: 'evento'; dato: EventoCalendario } | { tipo: 'tarea'; dato: Tarea };
export const fechaCompleta = (fecha: string) => new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export function horaLegible(hora: string) {
  if (!hora) return 'Horario no indicado';
  const [h, m] = hora.split(':');
  return `${Number(h) % 12 || 12}:${m} ${Number(h) < 12 ? 'a. m.' : 'p. m.'}`;
}
export const horario = (dato: { hora_inicio: string; hora_fin: string }) => `${horaLegible(dato.hora_inicio)} – ${horaLegible(dato.hora_fin)}`;
export const estadoEvento = (estado: number) => ({ 1: 'Pendiente de aprobación', 2: 'Confirmado', 3: 'Rechazado', 4: 'Cancelado' })[estado] ?? 'Estado no indicado';

export function diasSemana(fecha: Date) {
  const lunes = getMonday(fecha);
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    return dia;
  });
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
