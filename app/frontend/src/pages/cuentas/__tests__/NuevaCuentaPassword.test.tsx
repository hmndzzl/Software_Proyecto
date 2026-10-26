import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NuevaCuentaModal from '../NuevaCuentaModal';
import { ToastProvider } from '../../../context/ToastContext';
import { crearCuentaApi } from '../../../api/cuentas';

vi.mock('../../../api/cuentas', () => ({ crearCuentaApi: vi.fn() }));

const roles = [{ id: 4, label: 'Ministro' }];

describe('visibilidad de contraseña en nueva cuenta', () => {
  beforeEach(() => vi.resetAllMocks());

  it('limpia y oculta la contraseña al cancelar y reabrir', async () => {
    const callbacks = { onClose: vi.fn(), onCreada: vi.fn() };
    const modal = (open: boolean) => <ToastProvider><NuevaCuentaModal open={open} roles={roles} {...callbacks} /></ToastProvider>;
    const { rerender } = render(modal(true));
    await userEvent.type(screen.getByLabelText('Contraseña inicial'), 'Clave-Segura-1');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña inicial')).toHaveAttribute('type', 'text');
    expect(crearCuentaApi).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(callbacks.onClose).toHaveBeenCalledOnce();
    rerender(modal(false));
    rerender(modal(true));
    expect(screen.getByLabelText('Contraseña inicial')).toHaveValue('');
    expect(screen.getByLabelText('Contraseña inicial')).toHaveAttribute('type', 'password');
  });

  it('envía el valor visible y vuelve a ocultarlo después de crear la cuenta', async () => {
    vi.mocked(crearCuentaApi).mockResolvedValue({});
    const onCreada = vi.fn();
    render(<ToastProvider><NuevaCuentaModal open roles={roles} onClose={vi.fn()} onCreada={onCreada} /></ToastProvider>);
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña inicial'), { target: { value: 'Clave-Segura-1' } });
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => expect(onCreada).toHaveBeenCalledOnce());
    expect(crearCuentaApi).toHaveBeenCalledWith(expect.objectContaining({ password: 'Clave-Segura-1' }));
    expect(screen.getByLabelText('Contraseña inicial')).toHaveValue('');
    expect(screen.getByLabelText('Contraseña inicial')).toHaveAttribute('type', 'password');
  });
});
