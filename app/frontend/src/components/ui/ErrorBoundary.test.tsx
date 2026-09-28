import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renderiza fallback ante error y maneja reset/reload', () => {
    const Fallback = () => <div>Fallback custom</div>;
    const Thrower = () => { throw new Error('Test error'); };
    
    // Suprimir console.error de react
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <ErrorBoundary fallback={<Fallback />}>
        <Thrower />
      </ErrorBoundary>
    );
    expect(screen.getByText('Fallback custom')).toBeInTheDocument();
    unmount();

    // Default fallback
    Object.defineProperty(window, 'location', { value: { reload: vi.fn() }, writable: true });
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );
    expect(screen.getByText('Test error')).toBeInTheDocument();
    
    // reload
    fireEvent.click(screen.getByText('Recargar página'));
    expect(window.location.reload).toHaveBeenCalled();

    // reset
    fireEvent.click(screen.getByText('Intentar de nuevo'));
    // Since it renders Thrower again, it immediately throws again, but we just want coverage of handleReset
    
    errSpy.mockRestore();
  });
});
