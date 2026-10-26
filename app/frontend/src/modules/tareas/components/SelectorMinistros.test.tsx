import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SelectorMinistros from './SelectorMinistros';

const ministros = Array.from({ length: 100 }, (_, index) => ({ id: index + 1, nombre: index === 0 ? 'Ána López' : `Ministro ${index + 1}` }));

function Mostrar({ yaAsignados = [], disabled = false, submit = vi.fn() }: { yaAsignados?: number[]; disabled?: boolean; submit?: () => void }) {
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  return <form onSubmit={event => { event.preventDefault(); submit(); }}>
    <SelectorMinistros ministros={ministros} seleccionados={seleccionados} yaAsignados={yaAsignados} onChange={setSeleccionados} disabled={disabled} />
    <button type="submit">Guardar</button>
  </form>;
}

describe('selector múltiple de ministros', () => {
  it('permanece compacto con 100 opciones y conserva la selección al buscar y revisar', async () => {
    const user = userEvent.setup();
    render(<Mostrar />);
    const buscar = screen.getByLabelText('Buscar ministro');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver seleccionados' })).toBeDisabled();
    await user.type(buscar, 'ana lopez');
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    await user.click(screen.getByRole('checkbox', { name: 'Ána López' }));
    await user.clear(buscar);
    expect(screen.getAllByRole('checkbox')).toHaveLength(100);
    await user.click(screen.getByRole('checkbox', { name: 'Ministro 100' }));
    await user.click(screen.getByRole('button', { name: 'Ver seleccionados' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    await user.click(screen.getByRole('checkbox', { name: 'Ána López' }));
    expect(buscar).toHaveFocus();
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByText('1 ministro seleccionado.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver todos' }));
    expect(screen.getByRole('checkbox', { name: 'Ministro 100' })).toBeChecked();
    await user.type(buscar, 'sin coincidencias');
    expect(screen.getByText('No hay ministros que coincidan con la búsqueda.')).toBeInTheDocument();
  });

  it('permite seleccionar con teclado y cerrar con Escape sin enviar el formulario', async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<Mostrar submit={submit} />);
    await user.tab();
    expect(screen.getByLabelText('Buscar ministro')).toHaveFocus();
    await user.keyboard('{Enter}{ArrowDown} ');
    expect(screen.getByRole('checkbox', { name: 'Ána López' })).toBeChecked();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByRole('checkbox', { name: 'Ministro 2' })).toBeChecked();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar opciones de ministros' })).toHaveFocus();
    expect(submit).not.toHaveBeenCalled();
  });

  it('conserva los ya asignados bloqueados y los omite al recorrer con las flechas', async () => {
    const user = userEvent.setup();
    render(<Mostrar yaAsignados={[2]} />);
    await user.click(screen.getByLabelText('Buscar ministro'));
    const asignado = screen.getByRole('checkbox', { name: 'Ministro 2 (ya asignado)' });
    expect(asignado).toBeChecked();
    expect(asignado).toBeDisabled();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('checkbox', { name: 'Ministro 3' })).toHaveFocus();
    expect(screen.getByText('0 ministros seleccionados.')).toBeInTheDocument();
  });

  it('cierra al salir con Tab o pulsar fuera, conservando la selección', async () => {
    const user = userEvent.setup();
    render(<Mostrar />);
    await user.type(screen.getByLabelText('Buscar ministro'), 'ana');
    await user.click(screen.getByRole('checkbox', { name: 'Ána López' }));
    await user.tab();
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveFocus();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Buscar ministro'));
    expect(screen.getByRole('checkbox', { name: 'Ána López' })).toBeChecked();
    await user.click(screen.getByText('Ministros', { exact: true }));
    await user.click(document.body);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('deshabilita el selector al guardar', () => {
    render(<Mostrar disabled />);
    expect(screen.getByLabelText('Buscar ministro')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mostrar opciones de ministros' })).toBeDisabled();
  });
});
