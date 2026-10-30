import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { useViewState } from './useViewState';
beforeEach(() => sessionStorage.clear());
it('restaura los filtros al desmontar y volver a la vista', () => {
  const first = renderHook(() => useViewState('reservas:query', ''));
  act(() => first.result.current[1]('Coro'));
  first.unmount();
  const second = renderHook(() => useViewState('reservas:query', ''));
  expect(second.result.current[0]).toBe('Coro');
});
it('se recupera de datos guardados inválidos', () => {
  sessionStorage.setItem('vista:publico:reservas:query', '{');
  expect(renderHook(() => useViewState('reservas:query', '')).result.current[0]).toBe('');
});
