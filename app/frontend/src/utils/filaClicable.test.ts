import { describe, expect, it, vi } from 'vitest';
import type { MouseEvent } from 'react';
import { manejarClicFila } from './filaClicable';

function evento(target: HTMLElement): MouseEvent<HTMLTableRowElement> {
  return { target } as unknown as MouseEvent<HTMLTableRowElement>;
}

describe('manejarClicFila', () => {
  it('abre la fila cuando el clic no viene de un control interactivo', () => {
    const abrir = vi.fn();
    const span = document.createElement('span');
    document.body.appendChild(span);
    manejarClicFila(abrir)(evento(span));
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it.each(['button', 'input', 'select', 'a', 'summary', 'details'])('ignora clics dentro de un %s', (tag) => {
    const abrir = vi.fn();
    const contenedor = document.createElement('div');
    const control = document.createElement(tag);
    contenedor.appendChild(control);
    document.body.appendChild(contenedor);
    manejarClicFila(abrir)(evento(control));
    expect(abrir).not.toHaveBeenCalled();
  });
});
