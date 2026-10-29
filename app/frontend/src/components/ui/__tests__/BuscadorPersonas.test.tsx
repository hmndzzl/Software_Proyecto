import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuscadorPersonas from '../BuscadorPersonas';

const personas = [
  { id: 1, nombre: 'Padre Pedro' },
  { id: 2, nombre: 'Ana Xitumul' },
  { id: 3, nombre: 'Coord Grupos Test' },
];

describe('BuscadorPersonas', () => {
  it('filtra las opciones visibles al escribir, sin distinguir acentos ni mayúsculas', async () => {
    render(<BuscadorPersonas id="encargado" label="Encargado:" personas={personas} valor="" onChange={vi.fn()} />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Encargado:' }), 'ana');
    expect(screen.getByRole('option', { name: 'Ana Xitumul' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Padre Pedro' })).not.toBeInTheDocument();
  });

  it('elige una persona al hacer clic y cierra la lista', async () => {
    const onChange = vi.fn();
    render(<BuscadorPersonas id="encargado" label="Encargado:" personas={personas} valor="" onChange={onChange} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Encargado:' }));
    await userEvent.click(screen.getByRole('option', { name: 'Coord Grupos Test' }));
    expect(onChange).toHaveBeenCalledWith('3');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Encargado:' })).toHaveValue('Coord Grupos Test');
  });

  it('muestra "Sin coincidencias" cuando el texto no encuentra a nadie', async () => {
    render(<BuscadorPersonas id="encargado" label="Encargado:" personas={personas} valor="" onChange={vi.fn()} />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Encargado:' }), 'xyz');
    expect(screen.getByText('Sin coincidencias')).toBeInTheDocument();
  });

  it('vuelve al nombre de la persona seleccionada si se escribe texto suelto y se hace clic fuera', async () => {
    render(<div><BuscadorPersonas id="encargado" label="Encargado:" personas={personas} valor="1" onChange={vi.fn()} /><button>Fuera</button></div>);
    const input = screen.getByRole('combobox', { name: 'Encargado:' });
    expect(input).toHaveValue('Padre Pedro');
    await userEvent.clear(input);
    await userEvent.type(input, 'algo que no existe');
    await userEvent.click(screen.getByRole('button', { name: 'Fuera' }));
    expect(input).toHaveValue('Padre Pedro');
  });
});
