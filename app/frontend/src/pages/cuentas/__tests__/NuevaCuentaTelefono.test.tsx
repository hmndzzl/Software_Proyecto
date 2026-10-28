import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NuevaCuentaModal from '../NuevaCuentaModal';
import { ToastProvider } from '../../../context/ToastContext';
import { crearCuentaApi } from '../../../api/cuentas';

vi.mock('../../../api/cuentas', () => ({ crearCuentaApi: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); vi.mocked(crearCuentaApi).mockResolvedValue({}); });

function mostrar() {
  const callbacks = { onClose: vi.fn(), onCreada: vi.fn() };
  render(<ToastProvider><NuevaCuentaModal open roles={[{ id: 4, label: 'Ministro' }]} {...callbacks} /></ToastProvider>);
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Contraseña inicial'), { target: { value: 'Clave-Segura-1' } });
  return callbacks;
}
const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

describe('teléfono en nueva cuenta', () => {
  it('envía el teléfono normalizado y limpia al completar', async () => {
    const callbacks = mostrar();
    fireEvent.change(screen.getByLabelText('Teléfono (opcional)'), { target: { value: '55551234' } });
    enviar();
    await waitFor(() => expect(callbacks.onCreada).toHaveBeenCalled());
    expect(crearCuentaApi).toHaveBeenCalledWith(expect.objectContaining({ telefono: '+50255551234' }));
    expect(screen.getByLabelText('Teléfono (opcional)')).toHaveValue('');
  });
  it('rechaza teléfonos y correos inválidos', async () => {
    mostrar();
    fireEvent.change(screen.getByLabelText('Teléfono (opcional)'), { target: { value: 'abc' } });
    enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Teléfono inválido');
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'incorrecto' } });
    enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo inválido');
    expect(crearCuentaApi).not.toHaveBeenCalled();
  });
  it('conserva el número si el servidor informa que está repetido', async () => {
    vi.mocked(crearCuentaApi).mockRejectedValue({ response: { data: { mensaje: 'El teléfono ya está registrado en otra cuenta' } } });
    mostrar();
    fireEvent.change(screen.getByLabelText('Teléfono (opcional)'), { target: { value: '55551234' } });
    enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('ya está registrado');
    expect(screen.getByLabelText('Teléfono (opcional)')).toHaveValue('55551234');
  });
});
