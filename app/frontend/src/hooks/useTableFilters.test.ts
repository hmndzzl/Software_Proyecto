import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useTableFilters } from './useTableFilters';

it('filtra por cualquier miembro de un registro sin duplicar registros ni opciones', () => {
  const datos = [{ id: 1, nombres: ['Ana', 'Luis'] }, { id: 2, nombres: ['Ana'] }, { id: 3, nombres: [] }];
  const { result } = renderHook(() => useTableFilters(datos, {
    search: item => item.nombres,
    selects: [{ key: 'ministro', label: 'Ministro', value: item => item.nombres }],
  }));
  expect(result.current.controls.selects[0].options).toEqual(['Ana', 'Luis']);
  act(() => result.current.controls.selects[0].onChange('Ana'));
  expect(result.current.filteredData.map(item => item.id)).toEqual([1, 2]);
  expect(result.current.controls.count).toBe(2);
  act(() => result.current.controls.selects[0].onChange('Luis'));
  expect(result.current.filteredData.map(item => item.id)).toEqual([1]);
  act(() => result.current.controls.clear());
  expect(result.current.filteredData).toHaveLength(3);
});
