import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCalendario } from './useCalendario';
import { consultarCalendario } from '../../api/calendario';

vi.mock('../../api/calendario', () => ({ consultarCalendario: vi.fn() }));

const consultar = vi.mocked(consultarCalendario);
const respuesta = (eventos: unknown[] = []) => ({ data: { eventos, tareas: [] } }) as never;

function visibilidad(valor: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => valor });
}

afterEach(() => { vi.clearAllMocks(); visibilidad('visible'); });

it('refresca en silencio al recuperar el foco y lo ignora si la pestaña está oculta', async () => {
  consultar.mockResolvedValue(respuesta());
  const { result } = renderHook(() => useCalendario('2026-01-01', '2026-01-07', 'semana' as never, ''));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(consultar).toHaveBeenCalledTimes(1);

  visibilidad('hidden');
  act(() => { window.dispatchEvent(new Event('focus')); });
  expect(consultar).toHaveBeenCalledTimes(1);

  visibilidad('visible');
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  await waitFor(() => expect(consultar).toHaveBeenCalledTimes(2));
  expect(result.current.loading).toBe(false);
});

it('informa el error y permite reintentar; descarta respuestas de una consulta reemplazada', async () => {
  consultar.mockRejectedValueOnce(new Error('red'));
  const { result } = renderHook(() => useCalendario('2026-01-01', '2026-01-07', 'semana' as never, ''));
  await waitFor(() => expect(result.current.error).toContain('No se pudo actualizar'));

  consultar.mockResolvedValueOnce(respuesta([{ id: 1 }]));
  act(() => { result.current.reintentar(); });
  await waitFor(() => expect(result.current.error).toBe(''));
  expect(result.current.datos.eventos).toHaveLength(1);

  let resolver!: (v: unknown) => void;
  consultar.mockImplementationOnce(() => new Promise(r => { resolver = r; }) as never);
  const { unmount } = renderHook(() => useCalendario('2026-02-01', '2026-02-07', 'semana' as never, ''));
  unmount();
  await act(async () => { resolver(respuesta()); });
});

it('descarta un error tardío tras desmontar', async () => {
  let rechazar!: (e: unknown) => void;
  consultar.mockImplementationOnce(() => new Promise((_, r) => { rechazar = r; }) as never);
  const { unmount } = renderHook(() => useCalendario('2026-03-01', '2026-03-07', 'semana' as never, ''));
  unmount();
  await act(async () => { rechazar(new Error('tarde')); });
});
