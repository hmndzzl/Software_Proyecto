import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import AppShell from '../AppShell';
import { AuthProvider } from '../../../context/AuthContext';

const STORAGE_KEY = 'sidebar_colapsado';

function mostrar() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppShell>
          <p>Contenido</p>
        </AppShell>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('AppShell', () => {
  beforeEach(() => localStorage.clear());

  it('inicia expandido por defecto', () => {
    mostrar();
    expect(screen.getByRole('button', { name: 'Ocultar menú' })).toBeInTheDocument();
  });

  it('alterna a colapsado al hacer click y lo guarda en localStorage', () => {
    mostrar();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar menú' }));

    expect(screen.getByRole('button', { name: 'Mostrar menú' })).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('vuelve a expandir al hacer click de nuevo', () => {
    mostrar();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar menú' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menú' }));

    expect(screen.getByRole('button', { name: 'Ocultar menú' })).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('0');
  });

  it('lee el estado colapsado guardado al montar', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    mostrar();
    expect(screen.getByRole('button', { name: 'Mostrar menú' })).toBeInTheDocument();
  });

  it('abre y cierra el menú lateral desde el control móvil', () => {
    mostrar();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar menú' }));
    expect(screen.queryByRole('button', { name: 'Cerrar menú' })).not.toBeInTheDocument();
  });
});
