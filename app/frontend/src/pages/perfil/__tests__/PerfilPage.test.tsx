import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PerfilPage from '../PerfilPage';
import apiClient from '../../../api/client';
import { useAuth } from '../../../context/AuthContext';
import { authValue } from '../../../test/authValue';
import { ToastProvider } from '../../../context/ToastContext';

vi.mock('../../../api/client', () => ({ default: { put: vi.fn() } }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const actualizarUsuario = vi.fn();
const usuario = { id: 4, nombre: 'Ana López', correo: 'ana@test.com', rol_id: 4 };

const mostrar = () => render(<PerfilPage />, { wrapper: ToastProvider });
const guardar = () => userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

describe('PerfilPage - avisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useAuth).mockReturnValue(authValue(usuario, { actualizarUsuario }));
    vi.mocked(apiClient.put).mockResolvedValue({ data: { persona: { ...usuario, nombre: 'Ana María' } } });
  });

  it('confirma con un toast cuando el perfil se guarda', async () => {
    mostrar();

    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'Clave-Segura-1');
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'Clave-Segura-1');
    await guardar();

    expect(await screen.findByRole('status')).toHaveTextContent('Perfil actualizadoTus cambios se guardaron correctamente.');
    expect(actualizarUsuario).toHaveBeenCalledWith({ ...usuario, nombre: 'Ana María' });
  });

  it('avisa si las contraseñas no coinciden, sin llamar al servidor', async () => {
    mostrar();

    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'Clave-Segura-1');
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'otra-distinta');
    await guardar();

    expect(await screen.findByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.');
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it('avisa si no hay nada que guardar (nombre y correo vacíos, sin contraseña)', async () => {
    mostrar();

    await userEvent.clear(screen.getByLabelText('Nombre completo'));
    await userEvent.clear(screen.getByLabelText('Correo electrónico'));
    await guardar();

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin cambiosNo hay cambios para guardar.');
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it('avisa el correo repetido (409)', async () => {
    vi.mocked(apiClient.put).mockRejectedValue({ response: { status: 409, data: { mensaje: 'x' } } });
    mostrar();

    await userEvent.clear(screen.getByLabelText(/correo/i));
    await userEvent.type(screen.getByLabelText(/correo/i), 'otro@test.com');
    await guardar();

    expect(await screen.findByRole('alert')).toHaveTextContent('El correo ya está en uso por otra cuenta.');
  });

  it('muestra el motivo que da el servidor (p. ej. Clerk rechazó la contraseña)', async () => {
    vi.mocked(apiClient.put).mockRejectedValue({ response: { status: 400, data: { mensaje: 'Contraseña filtrada.' } } });
    mostrar();

    await userEvent.type(screen.getByLabelText('Nueva contraseña'), '12345678');
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), '12345678');
    await guardar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar el perfilContraseña filtrada.');
  });

  it('usa el error genérico cuando el servidor no devuelve detalle', async () => {
    vi.mocked(apiClient.put).mockRejectedValue(new Error('sin red'));
    mostrar();
    await guardar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Error al actualizar el perfil');
  });

  it('admite un contexto sin usuario y muestra valores de respaldo', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue(null, { actualizarUsuario }));
    mostrar();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('Desconocido')).toBeInTheDocument();
    await guardar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin cambios');
  });
});
