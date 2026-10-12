import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

vi.mock('./ContactoForm', () => ({ default: () => <form aria-label="contacto" /> }));

describe('navegación del portal público', () => {
  it('abre y cierra el menú y actualiza la sección activa al desplazarse', async () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const menu = screen.getByRole('button', { name: 'Menú' });
    const quienesSomos = screen.getAllByRole('link', { name: 'Quiénes Somos' })[0];
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getAllByRole('link', { name: 'Nuestros Valores' })[0]);
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('link', { name: 'Nuestros Valores' })[0]).toHaveClass('active');

    await userEvent.click(screen.getAllByRole('link', { name: 'Contáctanos' })[0]);
    expect(screen.getAllByRole('link', { name: 'Contáctanos' })[0]).toHaveClass('active');

    await userEvent.click(quienesSomos);
    expect(quienesSomos).toHaveClass('active');

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 500 });
    Object.defineProperty(document.getElementById('quienes-somos')!, 'offsetTop', { configurable: true, value: 100 });
    Object.defineProperty(document.getElementById('valores')!, 'offsetTop', { configurable: true, value: 300 });
    Object.defineProperty(document.getElementById('contacto')!, 'offsetTop', { configurable: true, value: 900 });
    fireEvent.scroll(window);
    expect(quienesSomos).toHaveClass('active');
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Nuestros Valores' })[0]).toHaveClass('active'));
  });

  it('mantiene la agenda como único CTA del hero', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const agenda = screen.getByRole('link', { name: 'AGENDA PARROQUIAL' });
    expect(agenda).toHaveAttribute('href', '/agenda');
    expect(agenda.closest('.hero-cta')?.querySelectorAll('a')).toHaveLength(1);
  });

  it('enlaza el portal con la agenda pública', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'AGENDA PARROQUIAL' })).toHaveAttribute('href', '/agenda');
  });

  it('elimina el listener de desplazamiento al desmontarse', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const vista = render(<MemoryRouter><LandingPage /></MemoryRouter>);
    vista.unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
