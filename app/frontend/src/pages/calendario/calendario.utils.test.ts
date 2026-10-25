import { describe, expect, it } from 'vitest';
import type { Calendario, EventoCalendario } from '../../api/calendario';
import type { Tarea } from '../../types';
import { compromisosPorDia, diasSemana, diasMes, desplazarMes, estadoEvento, horaLegible } from './calendario.utils';

describe('presentación de compromisos', () => {
  it('formatea medianoche, mediodía y tarde sin ambigüedad', () => {
    expect(horaLegible('00:00:00')).toBe('12:00 a. m.');
    expect(horaLegible('12:00')).toBe('12:00 p. m.');
    expect(horaLegible('17:30')).toBe('5:30 p. m.');
    expect(horaLegible('')).toBe('Horario no indicado');
  });

  it('nombra los estados sin depender del color', () => {
    expect([1, 2, 3, 4, 99].map(estadoEvento)).toEqual(['Pendiente de aprobación', 'Confirmado', 'Rechazado', 'Cancelado', 'Estado no indicado']);
  });

  it('comienza la semana en lunes incluso en domingo', () => {
    const dias = diasSemana(new Date(2026, 9, 11));
    expect(dias[0].getDate()).toBe(5);
    expect(dias[6].getDate()).toBe(11);
  });

  it('deduplica por tipo e identificador y conserva una tarea si falta su evento', () => {
    const tarea = { id: 1, fecha: '2026-10-24', hora_inicio: '10:00', evento_id: 8 } as Tarea;
    const evento = { id: 1, fecha: '2026-10-24', hora_inicio: '09:00' } as EventoCalendario;
    const datos: Calendario = { eventos: [evento, evento], tareas: [tarea, tarea, { ...tarea, id: 2, hora_inicio: '09:00' }, { ...tarea, id: 3, fecha: '' }] };
    expect(compromisosPorDia(datos).get('2026-10-24')?.map(i => `${i.tipo}-${i.dato.id}`)).toEqual(['evento-1', 'tarea-2', 'tarea-1']);
    expect(compromisosPorDia({ eventos: [], tareas: [] }).size).toBe(0);
  });
});

describe('períodos mensuales', () => {
  it('incluye febrero bisiesto y semanas completas de lunes a domingo', () => {
    const dias = diasMes(new Date(2028, 1, 29));
    expect(dias[0].getDay()).toBe(1);
    expect(dias[dias.length - 1].getDay()).toBe(0);
    expect(dias.some(d => d.getMonth() === 1 && d.getDate() === 29)).toBe(true);
    expect(dias).toHaveLength(35);
    expect(diasMes(new Date(2026, 7, 1))).toHaveLength(42);
  });

  it('evita saltarse febrero al navegar desde el 31 de enero y cruza el año', () => {
    expect(desplazarMes(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28));
    expect(desplazarMes(new Date(2028, 0, 31), 1)).toEqual(new Date(2028, 1, 29));
    expect(desplazarMes(new Date(2026, 11, 31), 1)).toEqual(new Date(2027, 0, 31));
    expect(desplazarMes(new Date(2026, 0, 1), -1)).toEqual(new Date(2025, 11, 1));
  });
});
