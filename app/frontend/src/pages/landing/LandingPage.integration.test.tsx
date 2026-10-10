import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

vi.mock('./ContactoForm', () => ({ default: () => <form aria-label="contacto" /> }));

describe('navegación del portal público', () => {
  it('abre y cierra el menú y actualiza la sección activa al desplazarse', async () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const menu = screen.getByRole('button', { name: 'Menú' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getAllByRole('link', { name: 'Nuestros Valores' })[0]);
    expect(menu).toHaveAttribute('aria-expanded', 'false');

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 500 });
    Object.defineProperty(document.getElementById('quienes-somos')!, 'offsetTop', { configurable: true, value: 100 });
    Object.defineProperty(document.getElementById('valores')!, 'offsetTop', { configurable: true, value: 300 });
    Object.defineProperty(document.getElementById('contacto')!, 'offsetTop', { configurable: true, value: 900 });
    fireEvent.scroll(window);
    expect(screen.getAllByRole('link', { name: 'Nuestros Valores' })[0]).toHaveClass('active');
  });

  it('elimina el listener de desplazamiento al desmontarse', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const vista = render(<MemoryRouter><LandingPage /></MemoryRouter>);
    vista.unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
