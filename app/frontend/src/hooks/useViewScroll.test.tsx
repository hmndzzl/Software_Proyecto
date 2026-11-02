import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useViewScroll } from './useViewScroll';
import { readUsuario } from '../auth/sessionStore';

vi.mock('../auth/sessionStore', () => ({ readUsuario: vi.fn() }));
let restaurar: () => void;
let posicion = 0;
let alturaDisponible = 0;
const observar = vi.fn();
const desconectar = vi.fn();

function Vista({ conHijo = true }: { conHijo?: boolean }) {
  const ref = useViewScroll();
  return <div ref={ref} data-testid="lista">{conHijo && <div data-testid="contenido" />}</div>;
}
function mostrar(conHijo = true) {
  return render(<MemoryRouter initialEntries={['/espacios']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Vista conHijo={conHijo} /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readUsuario).mockReturnValue(null);
  posicion = 0;
  alturaDisponible = 0;
  vi.spyOn(HTMLElement.prototype, 'scrollTop', 'get').mockImplementation(() => posicion);
  vi.spyOn(HTMLElement.prototype, 'scrollTop', 'set').mockImplementation(value => { posicion = Math.min(value, alturaDisponible); });
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { restaurar = callback; }
    observe = observar;
    disconnect = desconectar;
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each([true, false])('espera la altura del contenido asíncrono y restaura la posición (hijo: %s)', conHijo => {
  sessionStorage.setItem('vista:publico:scroll:/espacios', '250');
  mostrar(conHijo);
  expect(posicion).toBe(0);
  expect(observar).toHaveBeenCalledWith(screen.getByTestId(conHijo ? 'contenido' : 'lista'));
  alturaDisponible = 500;
  restaurar();
  expect(posicion).toBe(250);
  expect(desconectar).toHaveBeenCalledOnce();
});

it.each(['wheel', 'touchstart', 'keydown', 'pointerdown'])('cancela la espera cuando el usuario interactúa mediante %s', evento => {
  sessionStorage.setItem('vista:publico:scroll:/espacios', '250');
  const vista = mostrar();
  const lista = screen.getByTestId('lista');
  fireEvent(lista, new Event(evento));
  expect(desconectar).toHaveBeenCalledOnce();
  vista.unmount();
  const llamadas = desconectar.mock.calls.length;
  fireEvent(lista, new Event(evento));
  expect(desconectar).toHaveBeenCalledTimes(llamadas);
});

it('guarda la posición por usuario y funciona sin ResizeObserver', () => {
  vi.stubGlobal('ResizeObserver', undefined);
  vi.mocked(readUsuario).mockReturnValue({ id: 7, nombre: 'Ana', correo: 'ana@test.com', rol_id: 5 });
  alturaDisponible = 500;
  sessionStorage.setItem('vista:7:scroll:/espacios', '120');
  mostrar();
  expect(posicion).toBe(120);
  screen.getByTestId('lista').scrollTop = 300;
  fireEvent.scroll(screen.getByTestId('lista'));
  expect(sessionStorage.getItem('vista:7:scroll:/espacios')).toBe('300');
  expect(sessionStorage.getItem('vista:publico:scroll:/espacios')).toBeNull();
});

it('permite usar la vista aunque el navegador bloquee el almacenamiento', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
  mostrar();
  expect(posicion).toBe(0);
  expect(() => fireEvent.scroll(screen.getByTestId('lista'))).not.toThrow();
});

it('no necesita observadores cuando no hay contenedor montado', () => {
  const vista = renderHook(() => useViewScroll(), { wrapper: ({ children }) => <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter> });
  expect(vista.result.current.current).toBeNull();
  expect(observar).not.toHaveBeenCalled();
});
