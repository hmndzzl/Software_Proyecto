import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../ToastContext';

function Disparador() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success('Cuenta creada', 'Todo salió bien.')}>ok</button>
      <button onClick={() => toast.error('No se pudo guardar', 'Algo falló.')}>mal</button>
    </>
  );
}

const renderizar = () =>
  render(
    <ToastProvider>
      <Disparador />
    </ToastProvider>
  );

describe('ToastProvider', () => {
  afterEach(() => vi.useRealTimers());

  it('no muestra nada hasta que se dispara un aviso', () => {
    renderizar();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('un éxito se anuncia como status y un error como alert', async () => {
    renderizar();

    await userEvent.click(screen.getByText('ok'));
    expect(screen.getByRole('status')).toHaveTextContent('Cuenta creadaTodo salió bien.');

    await userEvent.click(screen.getByText('mal'));
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardarAlgo falló.');
  });

  it('un aviso nuevo reemplaza al anterior', async () => {
    renderizar();

    await userEvent.click(screen.getByText('ok'));
    await userEvent.click(screen.getByText('mal'));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('se cierra con la ×', async () => {
    renderizar();
    await userEvent.click(screen.getByText('ok'));

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('se cierra solo a los 7 segundos', () => {
    vi.useFakeTimers();
    renderizar();

    act(() => { screen.getByText('ok').click(); });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(6_999); });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('un aviso repetido reinicia el temporizador', () => {
    vi.useFakeTimers();
    renderizar();

    act(() => { screen.getByText('ok').click(); });
    act(() => { vi.advanceTimersByTime(5_000); });
    act(() => { screen.getByText('ok').click(); });
    act(() => { vi.advanceTimersByTime(5_000); });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('useToast falla con un mensaje claro fuera del proveedor', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Disparador />)).toThrow('useToast debe usarse dentro de ToastProvider');
  });
});
