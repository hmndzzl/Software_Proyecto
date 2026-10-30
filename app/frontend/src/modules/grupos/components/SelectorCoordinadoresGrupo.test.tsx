import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SelectorCoordinadoresGrupo from './SelectorCoordinadoresGrupo';

const personas = [
  { id: 1, nombre: 'Ana' },
  { id: 2, nombre: 'Luis' },
  { id: 3, nombre: 'Marta' },
];

describe('SelectorCoordinadoresGrupo', () => {
  it('lista todas las personas y marca las ya seleccionadas', () => {
    render(<SelectorCoordinadoresGrupo personas={personas} seleccionados={[2]} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Ana' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Luis' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Marta' })).not.toBeChecked();
  });

  it('agrega un id al marcar y lo quita al desmarcar', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SelectorCoordinadoresGrupo personas={personas} seleccionados={[1]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Luis' }));
    expect(onChange).toHaveBeenCalledWith([1, 2]);

    onChange.mockClear();
    rerender(<SelectorCoordinadoresGrupo personas={personas} seleccionados={[1, 2]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ana' }));
    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it('filtra por nombre al buscar', () => {
    render(<SelectorCoordinadoresGrupo personas={personas} seleccionados={[]} onChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Buscar coordinador'), { target: { value: 'lui' } });
    expect(screen.getByRole('checkbox', { name: 'Luis' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Ana' })).not.toBeInTheDocument();
  });

  it('muestra un aviso si no hay personas disponibles', () => {
    render(<SelectorCoordinadoresGrupo personas={[]} seleccionados={[]} onChange={vi.fn()} />);
    expect(screen.getByText('No hay coordinadores de grupo disponibles.')).toBeInTheDocument();
  });

  it('deshabilita los checkboxes cuando disabled es true', () => {
    render(<SelectorCoordinadoresGrupo personas={personas} seleccionados={[]} onChange={vi.fn()} disabled />);
    expect(screen.getByRole('checkbox', { name: 'Ana' })).toBeDisabled();
  });

  it('avisa si la búsqueda no encuentra coincidencias entre personas existentes', () => {
    render(<SelectorCoordinadoresGrupo personas={personas} seleccionados={[]} onChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Buscar coordinador'), { target: { value: 'zzz' } });
    expect(screen.getByText('No hay coordinadores que coincidan con la búsqueda.')).toBeInTheDocument();
  });

  it('usa el singular cuando hay exactamente un coordinador seleccionado', () => {
    render(<SelectorCoordinadoresGrupo personas={personas} seleccionados={[1]} onChange={vi.fn()} />);
    expect(screen.getByText('1 coordinador seleccionado.')).toBeInTheDocument();
  });
});
