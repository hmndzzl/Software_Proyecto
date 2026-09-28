import { formatFecha, formatHora, partesFecha } from '../date';

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
});
