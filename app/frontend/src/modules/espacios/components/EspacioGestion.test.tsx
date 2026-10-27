import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EspacioGestion from './EspacioGestion';
import apiClient from '../../../api/client';

const mocks = vi.hoisted(() => ({ permitido: true, success: vi.fn() }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ tieneRol: () => mocks.permitido }) }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ success: mocks.success }) }));
vi.mock('../../../api/client', () => ({ default: { post: vi.fn(), put: vi.fn(), get: vi.fn(), delete: vi.fn() } }));
const espacio = { id: 7, nombre: 'Salón parroquial', capacidad: 30, foto_url: '/uploads/espacios/salon-01-v1.webp' };

beforeEach(() => {
  vi.clearAllMocks(); mocks.permitido = true;
  vi.mocked(apiClient.get).mockResolvedValue({ data: { reservas: [] } });
  vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
  vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
  vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
  URL.createObjectURL = vi.fn(() => 'blob:foto'); URL.revokeObjectURL = vi.fn();
});

describe('formularios de gestión de espacios', () => {
  it('no expone gestión sin el rol permitido', () => {
    mocks.permitido = false;
    render(<EspacioGestion espacio={espacio} onChanged={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('crea con una imagen usando los campos asociados a etiquetas', async () => {
    const cambiado = vi.fn();
    render(<EspacioGestion onChanged={cambiado} />);
    await userEvent.click(screen.getByRole('button', { name: 'Crear espacio' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.type(dialog.getByLabelText(/Nombre del espacio/), 'Salón nuevo');
    await userEvent.type(dialog.getByLabelText(/Capacidad/), '45');
    const file = new File(['foto'], 'salon.png', { type: 'image/png' });
    await userEvent.upload(dialog.getByLabelText('Imagen del espacio'), file);
    expect(dialog.getByAltText('Vista previa de la imagen seleccionada')).toHaveAttribute('src', 'blob:foto');
    await userEvent.click(dialog.getByRole('button', { name: 'Crear espacio' }));
    await waitFor(() => expect(cambiado).toHaveBeenCalledOnce());
    const body = vi.mocked(apiClient.post).mock.calls[0][1] as FormData;
    expect(body.get('imagen')).toBe(file); expect(body.get('capacidad')).toBe('45');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto');
  });
  it('edita datos y permite quitar la fotografía existente', async () => {
    render(<EspacioGestion espacio={espacio} onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar espacio' }));
    expect(screen.getByLabelText(/Nombre del espacio/)).toHaveValue(espacio.nombre);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar imagen' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalled());
    const [url, body] = vi.mocked(apiClient.put).mock.calls[0];
    expect(url).toBe('/api/espacios/7');
    expect((body as FormData).get('quitar_imagen')).toBe('true');
  });
  it('muestra el error y conserva los datos para reintentar', async () => {
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { message: 'La imagen no es válida' } } });
    render(<EspacioGestion espacio={espacio} onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar espacio' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La imagen no es válida');
    expect(screen.getByLabelText(/Nombre del espacio/)).toHaveValue(espacio.nombre);
  });
  it('rechaza un archivo demasiado grande antes de enviarlo', async () => {
    render(<EspacioGestion espacio={espacio} onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar espacio' }));
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'foto.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Imagen del espacio'), { target: { files: [file] } });
    expect(screen.getByRole('alert')).toHaveTextContent('hasta 10 MB');
    expect(apiClient.put).not.toHaveBeenCalled();
  });
  it('permite deshacer el retiro de una imagen y descartar el archivo seleccionado', async () => {
    render(<EspacioGestion espacio={espacio} onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar espacio' }));
    const archivo = screen.getByLabelText('Imagen del espacio');
    await userEvent.upload(archivo, new File(['foto'], 'salon.png', { type: 'image/png' }));
    expect(screen.getByText('salon.png')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar imagen' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar imagen' }));
    expect(screen.getByText('Ninguna imagen seleccionada')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Conservar imagen actual' }));
    fireEvent.change(archivo, { target: { files: [] } });
    expect(screen.getByAltText('Fotografía de Salón parroquial')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    const body = vi.mocked(apiClient.put).mock.calls[0][1] as FormData;
    expect(body.get('quitar_imagen')).toBe('false'); expect(body.has('imagen')).toBe(false);
  });

  it.each(['image/svg+xml', 'image/png'])('rechaza una extensión inválida con MIME %s', async type => {
    render(<EspacioGestion espacio={espacio} onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar espacio' }));
    fireEvent.change(screen.getByLabelText('Imagen del espacio'), { target: { files: [new File(['foto'], 'salon.svg', { type })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('JPEG, PNG o WebP');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });


});
