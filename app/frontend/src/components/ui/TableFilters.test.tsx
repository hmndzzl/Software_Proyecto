import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import TableFilters from './TableFilters';
import SortableTh from './SortableTh';
import { normalizarBusqueda, useTableFilters } from '../../hooks/useTableFilters';
import { useSortableTable } from '../../hooks/useSortableTable';

const rows = [
  { id: 2, nombre: 'Ángela López', estado: 'Pendiente', fecha: '2026-10-24T00:00:00Z' },
  { id: 10, nombre: 'Bruno Pérez', estado: 'Confirmada', fecha: '2026-10-25' },
  { id: 1, nombre: 'Ana López', estado: 'Confirmada', fecha: null },
];
const config = {
  search: (r: typeof rows[number]) => [r.id, r.nombre, null, undefined],
  date: (r: typeof rows[number]) => r.fecha,
  selects: [{ key: 'estado', label: 'Estado', value: (r: typeof rows[number]) => r.estado }],
};

function Demo() {
  const filters = useTableFilters(rows, config);
  const sort = useSortableTable(filters.filteredData, { id: r => r.id, nombre: r => r.nombre });
  return <>
    <TableFilters {...filters.controls} />
    <table><thead><tr>
      <SortableTh label="ID" sortKey="id" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggleSort} />
      <SortableTh label="Nombre" sortKey="nombre" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggleSort} />
    </tr></thead><tbody>{sort.sortedData.map(r => <tr key={r.id}><td>{r.id}</td><td>{r.nombre}</td></tr>)}</tbody></table>
  </>;
}

describe('filtros compartidos y ordenamiento', () => {
  it('busca varias palabras sin acentos ni distinción de mayúsculas y admite identificadores', () => {
    const { result } = renderHook(() => useTableFilters(rows, config));
    expect(normalizarBusqueda(null)).toBe('');
    act(() => result.current.controls.setQuery(' LOPEZ  angela '));
    expect(result.current.filteredData.map(r => r.id)).toEqual([2]);
    act(() => result.current.controls.setQuery('10'));
    expect(result.current.filteredData.map(r => r.id)).toEqual([10]);
  });

  it('combina texto, estado y extremos inclusivos de fecha sin modificar los datos', async () => {
    render(<Demo />);
    await userEvent.type(screen.getByLabelText('Buscar'), 'angela');
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'Pendiente');
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-24' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-24' } });
    expect(screen.getByRole('cell', { name: 'Ángela López' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Bruno Pérez' })).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 3 registros.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(rows.map(r => r.id)).toEqual([2, 10, 1]);
  });

  it('admite solo un límite, descarta fechas ausentes y explica rangos invertidos', () => {
    render(<Demo />);
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-24' } });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-25' } });
    expect(screen.getByRole('alert')).toHaveTextContent('inicial');
    expect(screen.getAllByRole('row')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '' } });
    expect(screen.getByRole('cell', { name: 'Bruno Pérez' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-26' } });
    expect(screen.getByText('No hay resultados para los filtros seleccionados.')).toBeInTheDocument();
  });

  it('ordena números, conserva el orden al filtrar y permite operar con teclado', async () => {
    render(<Demo />);
    const button = screen.getByRole('button', { name: 'ID' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('columnheader', { name: 'ID' })).toHaveAttribute('aria-sort', 'descending');
    expect(within(screen.getAllByRole('row')[1]).getAllByRole('cell')[0]).toHaveTextContent('10');
    await userEvent.type(screen.getByLabelText('Buscar'), 'lopez');
    expect(within(screen.getAllByRole('row')[1]).getAllByRole('cell')[0]).toHaveTextContent('2');
    button.focus();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('columnheader', { name: 'ID' })).toHaveAttribute('aria-sort', 'ascending');
    expect(within(screen.getAllByRole('row')[1]).getAllByRole('cell')[0]).toHaveTextContent('1');
    await userEvent.click(button);
    expect(screen.getByRole('columnheader', { name: 'ID' })).toHaveAttribute('aria-sort', 'none');
    expect(within(screen.getAllByRole('row')[1]).getAllByRole('cell')[0]).toHaveTextContent('2');
  });

  it('mantiene un filtro cuando los datos cambian, aunque su opción desaparezca', () => {
    const { result, rerender } = renderHook(({ data }) => useTableFilters(data, config), { initialProps: { data: rows } });
    act(() => result.current.controls.selects[0].onChange('Pendiente'));
    rerender({ data: rows.slice(1) });
    expect(result.current.controls.active).toBe(true);
    render(<TableFilters {...result.current.controls} label="Prueba" />);
    expect(screen.getByLabelText('Estado')).toHaveValue('Pendiente');
    expect(screen.getByRole('option', { name: 'Pendiente' })).toBeInTheDocument();
    expect(screen.getByText('No hay resultados para los filtros seleccionados.')).toBeInTheDocument();
  });

  it('omite fechas y selectores para las tablas que solo requieren texto', async () => {
    const { result } = renderHook(() => useTableFilters(rows, { search: r => [r.nombre] }));
    render(<TableFilters {...result.current.controls} />);
    expect(screen.queryByLabelText('Desde')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeDisabled();
  });
});
