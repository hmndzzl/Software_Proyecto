import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Btn from '../Btn';
import Badge from '../Badge';
import { Card, CardHead, CardBody } from '../Card';
import { Field, InputUI } from '../Field';

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

});
