import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToastProvider } from '../../context/ToastContext';
import ConfiguracionPage from './ConfiguracionPage';

function mostrar() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <ConfiguracionPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('ConfiguracionPage', () => {
  beforeEach(() => localStorage.clear());

  it('guarda preferencias de navegación, notificaciones y tema', () => {
    mostrar();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Menú lateral contraído' }));
    expect(localStorage.getItem('sidebar_colapsado')).toBe('1');

    fireEvent.click(screen.getByRole('radio', { name: 'Cada 5 minutos' }));
    expect(localStorage.getItem('intervalo_notificaciones')).toBe('300');
    fireEvent.click(screen.getByRole('radio', { name: 'Cada minuto' }));
    expect(localStorage.getItem('intervalo_notificaciones')).toBe('60');

    fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(localStorage.getItem('tema_aplicacion')).toBe('oscuro');
    fireEvent.click(screen.getByRole('radio', { name: 'Claro' }));
    expect(localStorage.getItem('tema_aplicacion')).toBe('claro');
  });

  it('restablece las preferencias y enlaza al perfil', () => {
    localStorage.setItem('sidebar_colapsado', '1');
    localStorage.setItem('intervalo_notificaciones', '300');
    localStorage.setItem('tema_aplicacion', 'oscuro');
    mostrar();

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer preferencias' }));
    expect(localStorage.getItem('sidebar_colapsado')).toBe('0');
    expect(localStorage.getItem('intervalo_notificaciones')).toBe('60');
    expect(localStorage.getItem('tema_aplicacion')).toBe('claro');
    expect(screen.getByRole('link', { name: 'Ir a mi perfil' })).toHaveAttribute('href', '/perfil');
  });
});
