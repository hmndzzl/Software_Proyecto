import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorProvider, useError } from './ErrorContext';
import GlobalErrorBanner from '../components/ui/GlobalErrorBanner';

function Disparador() {
  const { showError, clearError } = useError();
  return <><button onClick={() => showError('Primer error')}>Mostrar</button><button onClick={clearError}>Limpiar</button><GlobalErrorBanner /></>;
}

describe('error global integrado con su banner', () => {
  afterEach(() => vi.useRealTimers());

  it('muestra, reemplaza y limpia manualmente un error', async () => {
    render(<ErrorProvider><Disparador /></ErrorProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Primer error');
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cierra el banner después de su animación', async () => {
    vi.useFakeTimers();
    render(<ErrorProvider><Disparador /></ErrorProvider>);
    act(() => screen.getByRole('button', { name: 'Mostrar' }).click());
    act(() => screen.getByRole('button', { name: 'Cerrar notificación de error' }).click());
    expect(screen.getByRole('alert')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(220));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('se descarta automáticamente y cancela el temporizador anterior', () => {
    vi.useFakeTimers();
    render(<ErrorProvider><Disparador /></ErrorProvider>);
    act(() => screen.getByRole('button', { name: 'Mostrar' }).click());
    act(() => screen.getByRole('button', { name: 'Mostrar' }).click());
    act(() => vi.advanceTimersByTime(7_000));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('permite limpiar cuando todavía no existe un temporizador', async () => {
    render(<ErrorProvider><Disparador /></ErrorProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('falla de forma explícita si el hook se usa fuera del proveedor', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Disparador />)).toThrow('useError debe usarse dentro de ErrorProvider');
  });
});
