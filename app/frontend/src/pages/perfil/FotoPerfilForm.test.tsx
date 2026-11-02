import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import FotoPerfilForm from './FotoPerfilForm';
import { useAuth } from '../../context/AuthContext';
import { authValue } from '../../test/authValue';
import apiClient from '../../api/client';

vi.mock('../../api/client', () => ({ default: { put: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
const usuario = { id: 4, nombre: 'Ana López', correo: 'ana@example.com', rol_id: 4 };
const actualizarUsuario = vi.fn();
const url = '/uploads/perfiles/subidas/00000000-0000-0000-0000-000000000001.webp';
const elegir = (file?: File) => fireEvent.change(screen.getByLabelText('Subir o cambiar foto'), { target: { files: file ? [file] : [] } });
const foto = () => new File(['imagen'], 'foto.png', { type: 'image/png' });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue(authValue(usuario, { actualizarUsuario }));
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => 'blob:preview'); static revokeObjectURL = vi.fn(); });
  vi.mocked(apiClient.put).mockResolvedValue({ data: { foto_url: url } });
});
afterEach(() => vi.unstubAllGlobals());

it('previsualiza, sube multipart, actualiza la sesión y libera la vista previa', async () => {
  render(<FotoPerfilForm />);
  expect(screen.getByRole('button', { name: 'Guardar foto' })).toBeDisabled();
  const file = foto(); elegir(file);
  expect(await screen.findByRole('img', { name: 'Vista previa de tu nueva foto' })).toHaveAttribute('src', 'blob:preview');
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(actualizarUsuario).toHaveBeenCalledWith({ ...usuario, foto_url: url }));
  expect(vi.mocked(apiClient.put).mock.calls[0][0]).toBe('/api/personas/4/foto');
  expect((vi.mocked(apiClient.put).mock.calls[0][1] as FormData).get('imagen')).toBe(file);
  expect(await screen.findByRole('status')).toHaveTextContent('se actualizó correctamente');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
});
it('rechaza formatos y tamaños inválidos y permite cancelar la selección', () => {
  render(<FotoPerfilForm />);
  elegir(new File(['svg'], 'foto.svg', { type: 'image/svg+xml' }));
  expect(screen.getByRole('alert')).toHaveTextContent('hasta 10 MB');
  const grande = foto(); Object.defineProperty(grande, 'size', { value: 10 * 1024 * 1024 + 1 }); elegir(grande);
  expect(screen.getByRole('button', { name: 'Guardar foto' })).toBeDisabled();
  elegir(); fireEvent.submit(screen.getByRole('form'));
  expect(apiClient.put).not.toHaveBeenCalled();
});
it('conserva la selección tras un error, bloquea duplicados y permite reintentar', async () => {
  let rechazar!: (error: Error) => void;
  vi.mocked(apiClient.put).mockImplementationOnce(() => new Promise((_resolve, reject) => { rechazar = reject; }));
  render(<FotoPerfilForm />); elegir(foto());
  fireEvent.submit(screen.getByRole('form')); fireEvent.submit(screen.getByRole('form'));
  expect(apiClient.put).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Guardando foto…' })).toBeDisabled();
  rechazar(new Error('sin red'));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar');
  expect(screen.getByRole('img')).toBeInTheDocument();
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByRole('status');
  expect(apiClient.put).toHaveBeenCalledTimes(2);
});
it('no envía archivos sin una cuenta activa y libera la selección al desmontar', () => {
  vi.mocked(useAuth).mockReturnValue(authValue(null));
  const vista = render(<FotoPerfilForm />); elegir(foto()); fireEvent.submit(screen.getByRole('form'));
  expect(apiClient.put).not.toHaveBeenCalled();
  vista.unmount(); expect(URL.revokeObjectURL).toHaveBeenCalled();
});

it('no restaura la sesión si el usuario salió mientras se subía la foto', async () => {
  let resolver!: (valor: { data: { foto_url: string } }) => void;
  vi.mocked(apiClient.put).mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
  const vista = render(<FotoPerfilForm />); elegir(foto()); fireEvent.submit(screen.getByRole('form'));
  vista.unmount(); resolver({ data: { foto_url: url } });
  await waitFor(() => expect(actualizarUsuario).not.toHaveBeenCalled());
});
