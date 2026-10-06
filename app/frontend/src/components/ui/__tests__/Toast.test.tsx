import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Toast from '../Toast';

describe('Toast', () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    ['ok', 'status'],
    ['warn', 'status'],
    ['bad', 'alert'],
  ] as const)('el tipo %s se anuncia con role %s', (kind, role) => {
    render(<Toast kind={kind} title="Título" message="Mensaje" onClose={vi.fn()} />);

    expect(screen.getByRole(role)).toHaveTextContent('TítuloMensaje');
  });

  it('llama a onClose al pulsar la ×', async () => {
    const onClose = vi.fn();
    render(<Toast kind="ok" title="t" message="m" onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('se cierra solo a los 7 segundos por defecto', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast kind="ok" title="t" message="m" onClose={onClose} />);

    act(() => { vi.advanceTimersByTime(7_000); });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('con duration 0 queda fijo hasta que se cierre a mano', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast kind="bad" title="t" message="m" onClose={onClose} duration={0} />);

    act(() => { vi.advanceTimersByTime(60_000); });

    expect(onClose).not.toHaveBeenCalled();
  });
});
