import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ModalExcusaAsistencia from './ModalExcusaAsistencia';

describe('ModalExcusaAsistencia', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirmar = vi.fn();
  
  const notificacion = {
    id: 1,
    mensaje: 'Test notificacion',
    evento_descripcion: 'Test evento',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza si no hay notificacion', () => {
    const { container } = render(
      <ModalExcusaAsistencia open={true} notificacion={null} onClose={mockOnClose} onConfirmar={mockOnConfirmar} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza la informacion del evento y notificacion', () => {
    render(
      <ModalExcusaAsistencia open={true} notificacion={notificacion} onClose={mockOnClose} onConfirmar={mockOnConfirmar} />
    );
    expect(screen.getByText('Test evento')).toBeInTheDocument();
    expect(screen.getByText('Test notificacion')).toBeInTheDocument();
  });

  it('valida que el motivo tenga al menos 5 caracteres', async () => {
    render(
      <ModalExcusaAsistencia open={true} notificacion={notificacion} onClose={mockOnClose} onConfirmar={mockOnConfirmar} />
    );
    
    const textarea = screen.getByPlaceholderText(/Explica brevemente/i);
    fireEvent.change(textarea, { target: { value: '1234' } });
    
    const btn = screen.getByRole('button', { name: /Enviar excusa/i });
    expect(btn).toBeDisabled();
    
    // Lo forzamos quitando disabled temporalmente o enviando de otra manera
    // o probamos con espacios vacios
    fireEvent.change(textarea, { target: { value: '     ' } });
    // el disabled attribute depende de char < MIN_CHARS
    expect(btn).toBeDisabled();
    
    // pero si llamamos el submit cuando los chars cuentan pero es despues del trim...
    // ah no, el boton esta disabled si (chars < MIN_CHARS), chars es trim().length
    // asi que no podemos presionar click si no pasamos el length de char.
    // pero podemos testear onSubmit llamando directamente la funcion onConfirmar si quisieramos
    // en este caso, la validación del boton deshabilita.
    
    // Verificamos el close
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('llama onConfirmar y onClose si el motivo es valido', async () => {
    mockOnConfirmar.mockResolvedValueOnce(undefined);
    render(
      <ModalExcusaAsistencia open={true} notificacion={notificacion} onClose={mockOnClose} onConfirmar={mockOnConfirmar} />
    );
    
    const textarea = screen.getByPlaceholderText(/Explica brevemente/i);
    fireEvent.change(textarea, { target: { value: 'Motivo valido' } });
    
    const btn = screen.getByRole('button', { name: /Enviar excusa/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    
    expect(mockOnConfirmar).toHaveBeenCalledWith(1, 'Motivo valido');
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
      expect(textarea).toHaveValue('');
    });
  });

  it('muestra mensaje de error si onConfirmar falla', async () => {
    mockOnConfirmar.mockRejectedValueOnce({ response: { data: { mensaje: 'Error backend' } } });
    render(
      <ModalExcusaAsistencia open={true} notificacion={notificacion} onClose={mockOnClose} onConfirmar={mockOnConfirmar} />
    );
    
    const textarea = screen.getByPlaceholderText(/Explica brevemente/i);
    fireEvent.change(textarea, { target: { value: 'Motivo valido' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar excusa/i }));
    
    await screen.findByText('Error backend');
    expect(mockOnClose).not.toHaveBeenCalled();
    
    // Limpia el error al escribir
    fireEvent.change(textarea, { target: { value: 'Motivo valido 2' } });
    expect(screen.queryByText('Error backend')).not.toBeInTheDocument();
  });

  it('muestra mensaje default si onConfirmar falla sin mensaje especifico', async () => {
    mockOnConfirmar.mockRejectedValueOnce(new Error('Network error'));
    render(
      <ModalExcusaAsistencia open={true} notificacion={notificacion} onClose={mockOnClose} onConfirmar={mockOnConfirmar} />
    );
    
    const textarea = screen.getByPlaceholderText(/Explica brevemente/i);
    fireEvent.change(textarea, { target: { value: 'Motivo valido' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar excusa/i }));
    
    await screen.findByText('Error al guardar la excusa. Intenta de nuevo.');
  });

  it('bloquea campos mientras se envia y handleClose si esta enviando', async () => {
    let resolver: any;
    mockOnConfirmar.mockImplementationOnce(() => new Promise((res) => { resolver = res; }));
    
    render(
      <ModalExcusaAsistencia open={true} notificacion={notificacion} onClose={mockOnClose} onConfirmar={mockOnConfirmar} />
    );
    
    fireEvent.change(screen.getByPlaceholderText(/Explica brevemente/i), { target: { value: 'Motivo valido' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar excusa/i }));
    
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
    
    // Intenta cerrar
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mockOnClose).not.toHaveBeenCalled(); // esta desactivado pero x si acaso
    
    resolver();
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  });

  it('respeta max chars (no deja escribir mas)', () => {
    render(
      <ModalExcusaAsistencia open={true} notificacion={notificacion} onClose={mockOnClose} onConfirmar={mockOnConfirmar} />
    );
    
    const textarea = screen.getByPlaceholderText(/Explica brevemente/i);
    // 401 chars
    const textoLargo = 'a'.repeat(401);
    fireEvent.change(textarea, { target: { value: textoLargo } });
    // el textarea value is controlled, pero el evento onChange de React
    // con vitest si `e.target.value` > MAX_CHARS, setMotivo no se llama, entonces se queda vacío
    expect(textarea).toHaveValue('');
    
    // pero si mandamos 400
    const textoJusto = 'a'.repeat(400);
    fireEvent.change(textarea, { target: { value: textoJusto } });
    expect(textarea).toHaveValue(textoJusto);
  });
});
