import { describe, it, expect } from 'vitest';
import { fechaNotificacion, enRangoEnvio } from './fechaNotificacion';

describe('hora parroquial y rango inclusivo por minuto', () => {
  it('muestra UTC en Guatemala y conserva históricos sin inventar una hora', () => {
    expect(fechaNotificacion('2026-10-24', '2026-10-24T02:30:00Z')).toContain('23 de octubre');
    expect(fechaNotificacion('2026-10-24', '2026-10-24T02:30:00Z')).toContain('20:30');
    expect(fechaNotificacion('2026-10-24', null)).toContain('Hora no registrada');
  });
  it('incluye extremos, acepta límites abiertos y excluye históricos solo al filtrar', () => {
    expect(enRangoEnvio(null, '', '')).toBe(true);
    expect(enRangoEnvio(null, '2026-10-23T11:30', '')).toBe(false);
    expect(enRangoEnvio('2026-10-23T17:30:00Z', '2026-10-23T11:30', '')).toBe(true);
    expect(enRangoEnvio('2026-10-23T17:30:59Z', '', '2026-10-23T11:30')).toBe(true);
    expect(enRangoEnvio('2026-10-23T17:31:00Z', '', '2026-10-23T11:30')).toBe(false);
    expect(enRangoEnvio('2026-10-23T17:29:59Z', '2026-10-23T11:30', '')).toBe(false);
  });
});
