import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingState from './LoadingState';

describe('LoadingState', () => {
  it('conserva el indicador de progreso para acciones sin una estructura de contenido', () => {
    render(<LoadingState label="Validando sesión" />);
    expect(screen.getByRole('status')).toHaveTextContent('Validando sesión');
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it.each(['table', 'cards', 'detail', 'list', 'metric'] as const)(
    'la variante %s anuncia la carga sin ofrecer controles ficticios', (variant) => {
      const { container } = render(<LoadingState variant={variant} label="Cargando contenido" />);
      expect(screen.getByRole('status', { name: 'Cargando contenido' })).toBeInTheDocument();
      expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
      expect(container.querySelector('button, input, a, [tabindex]')).toBeNull();
      expect(container.querySelector('svg')).toBeNull();
    },
  );
});
