import { describe, expect, it } from 'vitest';
import { normalizarTelefono } from './telefono';

describe('teléfono de cuenta', () => {
  it.each(['', '   '])('permite omitirlo (%s)', valor => expect(normalizarTelefono(valor)).toBe(''));
  it.each(['55551234', '(5555) 1234', '+502 5555-1234'])('normaliza %s', valor => expect(normalizarTelefono(valor)).toBe('+50255551234'));
  it('conserva códigos internacionales', () => expect(normalizarTelefono('+1 (202) 555-0123')).toBe('+12025550123'));
  it.each(['abc', '1'.repeat(51), '123', '+012345678', '50255551234', '+1234567890123456'])('rechaza %s', valor => expect(() => normalizarTelefono(valor)).toThrow());
});
