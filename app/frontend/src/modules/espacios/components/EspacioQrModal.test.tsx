import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EspacioQrModal from './EspacioQrModal';

describe('EspacioQrModal', () => {
  const mockOnClose = vi.fn();
  const espacio = { id: 7, nombre: 'Salón Parroquial' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada si no hay espacio', () => {
    const { container } = render(
      <EspacioQrModal open={true} espacio={null} onClose={mockOnClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('no renderiza el contenido si open es false', () => {
    const { container } = render(
      <EspacioQrModal open={false} espacio={espacio} onClose={mockOnClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra el nombre del espacio y la url de reserva', () => {
    render(<EspacioQrModal open={true} espacio={espacio} onClose={mockOnClose} />);

    expect(screen.getByText(/Código QR/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Salón Parroquial/i).length).toBeGreaterThan(0);
    expect(screen.getByText(`${window.location.origin}/espacios/7`)).toBeInTheDocument();
  });

  it('cierra el modal al hacer click en Cerrar', () => {
    render(<EspacioQrModal open={true} espacio={espacio} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Cerrar'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  describe('descarga de PNG', () => {
    let toDataURLSpy: ReturnType<typeof vi.spyOn>;
    let clickSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      toDataURLSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
        .mockReturnValue('data:image/png;base64,fake');
      clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});
    });

    afterEach(() => {
      toDataURLSpy.mockRestore();
      clickSpy.mockRestore();
    });

    it('genera un enlace de descarga con el nombre del salon y dispara el click', () => {
      render(<EspacioQrModal open={true} espacio={espacio} onClose={mockOnClose} />);

      fireEvent.click(screen.getByRole('button', { name: /Descargar PNG/i }));

      expect(toDataURLSpy).toHaveBeenCalledWith('image/png');
      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
