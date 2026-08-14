import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Btn from '../Btn';
import Badge from '../Badge';
import { Card, CardHead, CardBody } from '../Card';
import { Field, InputUI } from '../Field';
import Spinner from '../Spinner';
import ErrorMessage from '../ErrorMessage';
import ErrorBoundary from '../ErrorBoundary';

describe('UI Components', () => {

  // ----------------------------------------------------
  // 1. Btn Component - Renderizado
  // ----------------------------------------------------
  it('Btn - debería renderizar el texto correctamente', () => {
    render(<Btn>Guardar</Btn>);
    const button = screen.getByRole('button', { name: /guardar/i });
    expect(button).toBeInTheDocument();
    // Por defecto debería tener las clases de primary y md (de los estilos)
    // No chequeamos clases específicas css module porque pueden cambiar el hash,
    // pero verificamos que sea de tipo botón.
    expect(button.tagName).toBe('BUTTON');
  });

  // ----------------------------------------------------
  // 2. Btn Component - Interacción
  // ----------------------------------------------------
  it('Btn - debería ejecutar la función onClick al ser presionado', () => {
    const handleClick = vi.fn();
    render(<Btn onClick={handleClick}>Click Me</Btn>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------
  // 3. Badge Component
  // ----------------------------------------------------
  it('Badge - debería renderizar el texto y el componente sin errores', () => {
    render(<Badge kind="ok">Aprobado</Badge>);
    const badge = screen.getByText(/aprobado/i);
    expect(badge).toBeInTheDocument();
  });

  // ----------------------------------------------------
  // 4. Card Component
  // ----------------------------------------------------
  it('Card - debería renderizar el contenido (hijos) y la cabecera', () => {
    render(
      <Card>
        <CardHead title="Título de la Tarjeta" hint="Un subtítulo" />
        <CardBody>
          <p>Contenido principal</p>
        </CardBody>
      </Card>
    );
    
    // Verificamos el título
    expect(screen.getByRole('heading', { name: /título de la tarjeta/i })).toBeInTheDocument();
    // Verificamos el hint
    expect(screen.getByText(/un subtítulo/i)).toBeInTheDocument();
    // Verificamos el contenido
    expect(screen.getByText(/contenido principal/i)).toBeInTheDocument();
  });

  // ----------------------------------------------------
  // 5. Field Component
  // ----------------------------------------------------
  it('Field - debería renderizar el label, el hint y el input', () => {
    render(
      <Field label="Nombre Completo" hint="Ingresa tus datos" required>
        <InputUI placeholder="Escribe aquí..." />
      </Field>
    );

    // Verificamos el label
    expect(screen.getByText(/nombre completo/i)).toBeInTheDocument();
    
    // Verificamos el asterisco de requerido
    expect(screen.getByText('*')).toBeInTheDocument();

    // Verificamos el hint
    expect(screen.getByText(/ingresa tus datos/i)).toBeInTheDocument();

    // Verificamos que el input se haya renderizado
    const input = screen.getByPlaceholderText(/escribe aquí.../i);
    expect(input).toBeInTheDocument();
  });

  // ----------------------------------------------------
  // 6. Spinner Component
  // ----------------------------------------------------
  describe('Spinner', () => {
    it('debería renderizar sin errores y tener role="status"', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('debería mostrar el label cuando se proporciona', () => {
      render(<Spinner label="Cargando datos..." />);
      expect(screen.getByText(/cargando datos/i)).toBeInTheDocument();
    });

    it('debería renderizarse en tamaño sm, md y lg sin errores', () => {
      const { rerender } = render(<Spinner size="sm" />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<Spinner size="md" />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<Spinner size="lg" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('debería renderizarse en modo fullPage sin errores', () => {
      render(<Spinner fullPage label="Procesando..." />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/procesando/i)).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------
  // 7. ErrorMessage Component
  // ----------------------------------------------------
  describe('ErrorMessage', () => {
    it('debería mostrar el mensaje de error con role="alert"', () => {
      render(<ErrorMessage message="No se pudo conectar al servidor." />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/no se pudo conectar/i)).toBeInTheDocument();
    });

    it('debería mostrar el botón de reintentar cuando se pasa onRetry', () => {
      const handleRetry = vi.fn();
      render(<ErrorMessage message="Error de red." onRetry={handleRetry} />);

      const retryBtn = screen.getByRole('button', { name: /reintentar/i });
      expect(retryBtn).toBeInTheDocument();

      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('NO debería mostrar el botón de reintentar cuando no se pasa onRetry', () => {
      render(<ErrorMessage message="Error sin retry." />);
      expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument();
    });
  });

  // ----------------------------------------------------
  // 8. ErrorBoundary Component
  // ----------------------------------------------------
  describe('ErrorBoundary', () => {
    // Suprimimos el console.error que React emite al capturar errores en tests
    const originalConsoleError = console.error;
    beforeEach(() => { console.error = vi.fn(); });
    afterEach(() => { console.error = originalConsoleError; });

    it('debería renderizar los hijos cuando no hay error', () => {
      render(
        <ErrorBoundary>
          <p>Contenido normal</p>
        </ErrorBoundary>
      );
      expect(screen.getByText(/contenido normal/i)).toBeInTheDocument();
    });

    it('debería mostrar la pantalla de error cuando un hijo lanza una excepción', () => {
      function ComponenteQueExplota() {
        throw new Error('Explosión de prueba');
      }

      render(
        <ErrorBoundary>
          <ComponenteQueExplota />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/algo salió mal/i)).toBeInTheDocument();
    });

    it('debería renderizar el fallback personalizado si se proporciona', () => {
      function ComponenteQueExplota() {
        throw new Error('Error');
      }

      render(
        <ErrorBoundary fallback={<p>Fallback personalizado</p>}>
          <ComponenteQueExplota />
        </ErrorBoundary>
      );

      expect(screen.getByText(/fallback personalizado/i)).toBeInTheDocument();
    });
  });

});
