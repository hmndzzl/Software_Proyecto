import { formatFecha, formatHora, partesFecha, esTareaFutura } from '../date';

describe('date utils', () => {
  describe('formatFecha', () => {
    it('formatea fechas YYYY-MM-DD', () => {
      expect(formatFecha('2026-09-13')).toBe('13 de septiembre de 2026');
    });

    it('formatea fechas ISO', () => {
      expect(formatFecha('2026-09-13T00:00:00Z')).toBe('13 de septiembre de 2026');
    });
  });

  describe('formatHora', () => {
    it('recorta la hora correctamente', () => {
      expect(formatHora('14:30:00')).toBe('14:30');
      expect(formatHora('09:05:00')).toBe('09:05');
    });
  });

  describe('partesFecha', () => {
    it('devuelve partes correctas', () => {
      expect(partesFecha('2026-09-13')).toEqual({ dia: '13', mesAbrev: 'SEPT' });
      expect(partesFecha('2026-10-01')).toEqual({ dia: '01', mesAbrev: 'OCT' });
    });
  });

  describe('esTareaFutura', () => {
    const ahora = new Date('2026-10-24T15:30:00');

    it('retorna true para fechas futuras', () => {
      expect(esTareaFutura('2026-10-25', '08:00:00', ahora)).toBe(true);
      expect(esTareaFutura('2026-11-01T00:00:00Z', '10:00:00', ahora)).toBe(true);
    });

    it('retorna false para fechas pasadas', () => {
      expect(esTareaFutura('2026-10-23', '18:00:00', ahora)).toBe(false);
      expect(esTareaFutura('2026-09-01T00:00:00Z', '12:00:00', ahora)).toBe(false);
    });

    it('compara la hora si la fecha es hoy', () => {
      expect(esTareaFutura('2026-10-24', '16:00:00', ahora)).toBe(true);
      expect(esTareaFutura('2026-10-24', '15:30:00', ahora)).toBe(false);
      expect(esTareaFutura('2026-10-24', '14:00:00', ahora)).toBe(false);
    });

    it('retorna false si no hay fecha o si la hora falta en el dia de hoy', () => {
      expect(esTareaFutura('', '10:00', ahora)).toBe(false);
      expect(esTareaFutura(null, '10:00', ahora)).toBe(false);
      expect(esTareaFutura('2026-10-24', '', ahora)).toBe(false);
    });
  });
});
