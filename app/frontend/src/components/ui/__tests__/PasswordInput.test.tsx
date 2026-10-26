import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PasswordInput from '../PasswordInput';

describe('PasswordInput', () => {
  it('alterna con teclado sin enviar el formulario ni cambiar el valor', async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(<form onSubmit={submit}>
      <label htmlFor="clave">Clave</label>
      <PasswordInput id="clave" name="clave" defaultValue="Secreta-123" autoComplete="new-password" />
    </form>);
    const input = screen.getByLabelText('Clave');
    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'new-password');
    expect(toggle).toHaveAttribute('aria-controls', input.id);

    await user.tab();
    expect(input).toHaveFocus();
    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(input).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAccessibleName('Ocultar contraseña');
    await user.keyboard(' ');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveValue('Secreta-123');
    expect(submit).not.toHaveBeenCalled();
  });

  it('genera identificadores distintos y mantiene la visibilidad independiente', async () => {
    render(<><PasswordInput aria-label="Nueva" /><PasswordInput aria-label="Confirmación" /></>);
    const first = screen.getByLabelText('Nueva');
    const second = screen.getByLabelText('Confirmación');
    expect(first.id).not.toBe(second.id);
    await userEvent.click(screen.getAllByRole('button', { name: 'Mostrar contraseña' })[0]);
    expect(first).toHaveAttribute('type', 'text');
    expect(second).toHaveAttribute('type', 'password');
  });

  it('respeta disabled tanto en el campo como en el botón', () => {
    render(<PasswordInput aria-label="Clave" disabled />);
    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(screen.getByLabelText('Clave')).toBeDisabled();
    expect(toggle).toBeDisabled();
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Clave')).toHaveAttribute('type', 'password');
  });
});
