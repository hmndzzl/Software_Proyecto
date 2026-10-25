import { describe, expect, it } from 'vitest';
import { formatHorario } from '../formatoHorario';

describe('horarios en notificaciones', () => {
  it('usa el mismo separador y elimina los segundos', () => {
    expect(formatHorario('09:05:00', '14:30:00')).toBe('09:05 – 14:30');
    expect(formatHorario('00:00', '23:59')).toBe('00:00 – 23:59');
  });
});
