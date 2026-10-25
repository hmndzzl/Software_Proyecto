import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PublicPortalLayout from './PublicPortalLayout';
import { AuthProvider } from '../../context/AuthContext';

describe('acceso desde el portal público', () => {
  it.each(['landing', 'agenda-publica'] as const)('respeta la sesión y sus cambios en %s', page => {
    localStorage.clear();
    render(<MemoryRouter><AuthProvider><PublicPortalLayout page={page}><main>Contenido público</main></PublicPortalLayout></AuthProvider></MemoryRouter>);
    const accesos = () => screen.getAllByRole('link', { name: /iniciar sesión|ir al panel/i });
    for (const enlace of accesos()) expect(enlace).toHaveAttribute('href', '/login');
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana', correo: 'ana@test.com', rol_id: 5 }));
    fireEvent(window, new StorageEvent('storage', { key: 'usuario' }));
    expect(screen.queryByRole('link', { name: /iniciar sesión/i })).not.toBeInTheDocument();
    for (const enlace of accesos()) expect(enlace).toHaveAttribute('href', '/dashboard');
    fireEvent.click(screen.getByRole('button', { name: 'Menú' }));
    fireEvent.click(accesos()[0]);
    expect(screen.getByRole('button', { name: 'Menú' })).toHaveAttribute('aria-expanded', 'false');
    localStorage.removeItem('usuario');
    fireEvent(window, new StorageEvent('storage', { key: 'usuario' }));
    for (const enlace of accesos()) expect(enlace).toHaveAttribute('href', '/login');
  });
});
