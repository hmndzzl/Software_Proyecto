import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PerfilPage from '../PerfilPage';
import apiClient from '../../../api/client';
import { useAuth } from '../../../context/AuthContext';
import { authValue } from '../../../test/authValue';
import { ToastProvider } from '../../../context/ToastContext';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const actualizarUsuario = vi.fn();
const usuario = { id: 4, nombre: 'Ana López', correo: 'ana@test.com', rol_id: 4 };

const mostrar = () => render(<PerfilPage />, { wrapper: ToastProvider });
const guardar = () => userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

describe('PerfilPage - avisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(apiClient.get).mockResolvedValue({ data: { telefono: null } });
    vi.mocked(useAuth).mockReturnValue(authValue(usuario, { actualizarUsuario }));
    vi.mocked(apiClient.put).mockResolvedValue({ data: { persona: { ...usuario, nombre: 'Ana María' } } });
  });

  it('confirma con un toast cuando el perfil se guarda', async () => {
    mostrar();

    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'Clave-Segura-1');
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'Clave-Segura-1');
    await userEvent.click(screen.getAllByRole('button', { name: 'Mostrar contraseña' })[0]);
    expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('type', 'text');
    expect(apiClient.put).not.toHaveBeenCalled();
    await guardar();

    expect(await screen.findByRole('status')).toHaveTextContent('Perfil actualizadoTus cambios se guardaron correctamente.');
    expect(actualizarUsuario).toHaveBeenCalledWith({ ...usuario, nombre: 'Ana María' });
    expect(apiClient.put).toHaveBeenCalledWith('/api/personas/4', expect.objectContaining({ password: 'Clave-Segura-1' }));
    for (const label of ['Nueva contraseña', 'Confirmar contraseña']) {
      expect(screen.getByLabelText(label)).toHaveValue('');
      expect(screen.getByLabelText(label)).toHaveAttribute('type', 'password');
    }
  });

  it('carga, modifica y normaliza el teléfono, y permite retirarlo', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { telefono: '+50255551234' } });
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { persona: { ...usuario, telefono: '+50255555678' } } })
      .mockResolvedValueOnce({ data: { persona: { ...usuario, telefono: null } } });
    mostrar();
    const input = await screen.findByDisplayValue('+50255551234');
    fireEvent.change(input, { target: { value: '55555678' } });
    await guardar();
    await waitFor(() => expect(input).toHaveValue('+50255555678'));
    expect(apiClient.put).toHaveBeenCalledWith('/api/personas/4', expect.objectContaining({ telefono: '+50255555678' }));
    fireEvent.change(input, { target: { value: '' } });
    await guardar();
    await waitFor(() => expect(apiClient.put).toHaveBeenLastCalledWith('/api/personas/4', expect.objectContaining({ telefono: '' })));
    await screen.findByRole('status');
  });

  it('rechaza un teléfono inválido antes de guardar', async () => {
    mostrar();
    const input = screen.getByLabelText('Teléfono (opcional)');
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: 'abc' } });
    await guardar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Teléfono inválido');
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it('permite reintentar la carga sin borrar el teléfono cuando falla', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ data: { telefono: '+50255551234' } });
    mostrar();
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar teléfono' }));
    expect(await screen.findByDisplayValue('+50255551234')).toBeEnabled();
    await guardar();
    await screen.findByRole('status');
    expect(vi.mocked(apiClient.put).mock.calls[0][1]).not.toHaveProperty('telefono');
  });

  it('no actualiza el componente después de desmontarlo durante la carga', async () => {
    let resolver!: (res: { data: { telefono: string } }) => void;
    vi.mocked(apiClient.get).mockReturnValue(new Promise(resolve => { resolver = resolve; }));
    const { unmount } = mostrar();
    unmount();
    resolver({ data: { telefono: '+50255551234' } });
    await Promise.resolve();
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
    vi.mocked(apiClient.put).mockRejectedValue({ response: { status: 409, data: { mensaje: 'El correo ya está en uso por otra cuenta.' } } });
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
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.getByText('Desconocido')).toBeInTheDocument();
    await guardar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin cambios');
  });

  it('muestra aviso de error y permite reintentar si falla la carga del teléfono', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ data: { telefono: '+50255551234' } });
    mostrar();
    expect(await screen.findByText('No se pudo cargar el teléfono.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar teléfono' }));
    expect(await screen.findByDisplayValue('+50255551234')).toBeInTheDocument();
  });

  it('ignora espacios en blanco en nombre o correo y no envía campos vacíos', async () => {
    mostrar();
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: '   ' } });
    await guardar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin cambios');
    expect(apiClient.put).not.toHaveBeenCalled();
  });
});
