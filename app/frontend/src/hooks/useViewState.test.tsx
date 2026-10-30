import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useViewState } from './useViewState';
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
afterEach(() => vi.restoreAllMocks());
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

it.each(['null', '[]', '42', '{"estado":3}'])('descarta filtros persistidos incompatibles: %s', guardado => {
  sessionStorage.setItem('vista:publico:reservas:filtros', guardado);
  const vista = renderHook(() => useViewState('reservas:filtros', { estado: '' }));
  expect(vista.result.current[0]).toEqual({ estado: '' });
});

it('restaura un conjunto válido de filtros', () => {
  sessionStorage.setItem('vista:publico:reservas:filtros', '{"estado":"Confirmada"}');
  expect(renderHook(() => useViewState('reservas:filtros', { estado: '' })).result.current[0]).toEqual({ estado: 'Confirmada' });
});

it('mantiene separados los filtros de distintos usuarios de la misma pestaña', () => {
  localStorage.setItem('usuario', JSON.stringify({ id: 7, nombre: 'Ana', correo: 'ana@test.com', rol_id: 5 }));
  const primera = renderHook(() => useViewState('reservas:query', ''));
  act(() => primera.result.current[1]('Coro'));
  primera.unmount();
  localStorage.setItem('usuario', JSON.stringify({ id: 8, nombre: 'Luis', correo: 'luis@test.com', rol_id: 5 }));
  const segunda = renderHook(() => useViewState('reservas:query', ''));
  expect(segunda.result.current[0]).toBe('');
  expect(sessionStorage.getItem('vista:7:reservas:query')).toBe('"Coro"');
});

it('sin clave mantiene el estado en memoria y no escribe en el navegador', () => {
  const guardar = vi.spyOn(Storage.prototype, 'setItem');
  const vista = renderHook(() => useViewState(undefined, ''));
  act(() => vista.result.current[1]('Coro'));
  expect(vista.result.current[0]).toBe('Coro');
  expect(guardar).not.toHaveBeenCalled();
});

it('permite cambiar filtros aunque falle la lectura o escritura del almacenamiento', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
  const vista = renderHook(() => useViewState('reservas:query', ''));
  expect(vista.result.current[0]).toBe('');
  act(() => vista.result.current[1]('Coro'));
  expect(vista.result.current[0]).toBe('Coro');
});
