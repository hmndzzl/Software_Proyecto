import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AforoField, { errorAforo } from './AforoField';

describe('aforo esperado', () => {
  it.each(['', '0', '-1', '1.5', 'abc', '2147483648'])('rechaza %s', valor => expect(errorAforo(valor, 80)).toBeTruthy());
  it('acepta el límite exacto y capacidad sin registrar', () => {
    expect(errorAforo('80', 80)).toBeNull();
    expect(errorAforo('100', null)).toBeNull();
    expect(errorAforo('100')).toBeNull();
    expect(errorAforo('81', 80)).toContain('supera');
  });
  it('asocia la ayuda al campo y comunica los cambios y el exceso', () => {
    const onChange = vi.fn();
    const { rerender } = render(<AforoField value="" onChange={onChange} />);
    const input = screen.getByLabelText('Cantidad de personas esperadas');
    expect(input).toHaveAccessibleDescription(/Selecciona un espacio/);
    fireEvent.change(input, { target: { value: '81' } });
    expect(onChange).toHaveBeenCalledWith('81');
    rerender(<AforoField value="81" onChange={onChange} capacidad={80} />);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/supera/);
    rerender(<AforoField value="80" onChange={onChange} capacidad={80} />);
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAccessibleDescription(/Capacidad máxima/);
    rerender(<AforoField value="" onChange={onChange} capacidad={null} required={false} />);
    expect(input).toHaveAccessibleDescription(/no está registrada/);
    expect(input).toHaveAttribute('aria-required', 'false');
  });
});
