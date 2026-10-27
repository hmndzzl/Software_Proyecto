import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Field, FieldGroup, InputUI, SelectUI, TextareaUI } from '../Field';
import PasswordInput from '../PasswordInput';

describe('etiquetas de Field', () => {
  it('enfoca el input al pulsar la etiqueta y asocia su ayuda', async () => {
    render(<Field label="Nombre" htmlFor="nombre" hint="Escribe tu nombre completo" required>
      <InputUI id="nombre" aria-required="true" aria-describedby="nombre-hint" icon={<span aria-hidden="true">N</span>} />
    </Field>);
    const input = screen.getByRole('textbox', { name: 'Nombre' });
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('Escribe tu nombre completo');
    await userEvent.click(screen.getByText('Nombre'));
    expect(input).toHaveFocus();
  });

  it('asocia las etiquetas con select, textarea y contraseña con botón', async () => {
    render(<>
      <Field label="Rol" htmlFor="rol"><SelectUI id="rol"><option>Ministro</option></SelectUI></Field>
      <Field label="Mensaje" htmlFor="mensaje"><TextareaUI id="mensaje" /></Field>
      <Field label="Contraseña" htmlFor="clave"><PasswordInput id="clave" /></Field>
    </>);
    for (const label of ['Rol', 'Mensaje', 'Contraseña']) {
      const control = screen.getByLabelText(label);
      expect((screen.getByText(label) as HTMLLabelElement).control).toBe(control);
      await userEvent.click(screen.getByText(label));
      expect(control).toHaveFocus();
    }
  });

  it('nombra los grupos sin convertir su título en etiqueta de un solo campo', () => {
    render(<FieldGroup label="Destinatarios" required>
      <label><input type="checkbox" />Ana</label>
      <label><input type="checkbox" />Luis</label>
      <Field label="Evento" htmlFor="evento"><SelectUI id="evento"><option>Misa</option></SelectUI></Field>
    </FieldGroup>);
    expect(screen.getByRole('group', { name: 'Destinatarios' })).toContainElement(screen.getByLabelText('Ana'));
    expect(screen.getByRole('group', { name: 'Destinatarios' })).toContainElement(screen.getByLabelText('Luis'));
    expect(screen.getByRole('combobox', { name: 'Evento' })).toBeInTheDocument();
  });
});
