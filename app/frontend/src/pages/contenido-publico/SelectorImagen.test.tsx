import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SelectorImagen from './SelectorImagen';
import { subirImagenLanding } from '../../api/landing';

vi.mock('../../api/landing', () => ({ subirImagenLanding: vi.fn() }));

const FOTO = '/uploads/landing/subidas/00000000-0000-0000-0000-000000000001.webp';
const png = () => new File(['x'], 'foto.png', { type: 'image/png' });

describe('SelectorImagen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra la foto predeterminada y explica de dónde sale', () => {
    render(<SelectorImagen etiqueta="Foto de portada" predeterminada="/assets/portada.webp" alCambiar={vi.fn()} />);
    expect(screen.getByAltText('Vista previa: Foto de portada')).toHaveAttribute('src', '/assets/portada.webp');
    expect(screen.getByText('Se usa la foto predeterminada del sitio.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir foto: Foto de portada' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quitar foto/ })).not.toBeInTheDocument();
  });

  it('indica que no hay foto cuando no existe ninguna', () => {
    render(<SelectorImagen etiqueta="Foto de la fecha" alCambiar={vi.fn()} />);
    expect(screen.getByText('Sin foto')).toBeInTheDocument();
    expect(screen.getByText('Sin foto: se muestra un espacio reservado.')).toBeInTheDocument();
  });

  it('sube la foto elegida y entrega su URL', async () => {
    vi.mocked(subirImagenLanding).mockResolvedValue(FOTO);
    const alCambiar = vi.fn();
    render(<SelectorImagen etiqueta="Foto de portada" alCambiar={alCambiar} />);

    await userEvent.upload(screen.getByLabelText('Foto de portada'), png());

    await waitFor(() => expect(alCambiar).toHaveBeenCalledWith(FOTO));
    expect(subirImagenLanding).toHaveBeenCalledWith(expect.objectContaining({ name: 'foto.png' }));
  });

  it('muestra la foto nueva y permite cambiarla o quitarla', async () => {
    const alCambiar = vi.fn();
    render(<SelectorImagen etiqueta="Foto de portada" valor={FOTO} predeterminada="/assets/portada.webp" alCambiar={alCambiar} />);

    expect(screen.getByAltText('Vista previa: Foto de portada')).toHaveAttribute('src', FOTO);
    expect(screen.getByText('Foto nueva: se publicará al guardar los cambios.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar foto: Foto de portada' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar foto: Foto de portada' }));
    expect(alCambiar).toHaveBeenCalledWith('');
  });

  it('bloquea los controles mientras sube la foto', async () => {
    let terminar: (url: string) => void = () => {};
    vi.mocked(subirImagenLanding).mockReturnValue(new Promise<string>((resolve) => { terminar = resolve; }));
    const alCambiar = vi.fn();
    render(<SelectorImagen etiqueta="Foto de portada" alCambiar={alCambiar} />);

    await userEvent.upload(screen.getByLabelText('Foto de portada'), png());
    expect(await screen.findByText('Subiendo foto…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir foto: Foto de portada' })).toBeDisabled();
    terminar(FOTO);
    await waitFor(() => expect(alCambiar).toHaveBeenCalledWith(FOTO));
    expect(screen.getByRole('button', { name: 'Subir foto: Foto de portada' })).toBeEnabled();
  });

  it('rechaza formatos y tamaños no permitidos sin llamar al servidor', () => {
    render(<SelectorImagen etiqueta="Foto de portada" alCambiar={vi.fn()} />);
    const entrada = screen.getByLabelText('Foto de portada');

    fireEvent.change(entrada, { target: { files: [new File(['x'], 'foto.gif', { type: 'image/gif' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Elige una imagen JPEG, PNG o WebP.');

    const grande = png();
    Object.defineProperty(grande, 'size', { value: 11 * 1024 * 1024 });
    fireEvent.change(entrada, { target: { files: [grande] } });
    expect(screen.getByRole('alert')).toHaveTextContent('La imagen no puede superar 10 MB.');
    expect(subirImagenLanding).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del servidor cuando la subida falla y no cambia la foto', async () => {
    vi.mocked(subirImagenLanding).mockRejectedValueOnce({ response: { data: { message: 'La imagen debe ser JPEG, PNG o WebP válida' } } });
    const alCambiar = vi.fn();
    render(<SelectorImagen etiqueta="Foto de portada" alCambiar={alCambiar} />);

    await userEvent.upload(screen.getByLabelText('Foto de portada'), png());
    expect(await screen.findByRole('alert')).toHaveTextContent('La imagen debe ser JPEG, PNG o WebP válida');
    expect(alCambiar).not.toHaveBeenCalled();

    vi.mocked(subirImagenLanding).mockRejectedValueOnce(new Error('Sin conexión'));
    await userEvent.upload(screen.getByLabelText('Foto de portada'), png());
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo subir la foto. Intenta de nuevo.'));
  });
});
