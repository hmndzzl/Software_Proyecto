import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Navbar from './Navbar';
import AppShell from './AppShell';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { authValue } from '../../test/authValue';

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

function Destino() {
  const location = useLocation();
  return <p>Destino: {location.pathname}{location.search}</p>;
}

function mostrar(ui: React.ReactNode) {
  return render(<MemoryRouter initialEntries={['/dashboard']}><Routes>
    <Route path="*" element={<>{ui}<Destino /></>} />
  </Routes></MemoryRouter>);
}

describe('layout integrado con sesión y notificaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Ana María López', correo: 'ana@test.com', rol_id: 5 }));
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
  });

  it('AppShell compone navegación, barra superior y contenido', async () => {
    mostrar(<AppShell><main>Contenido privado</main></AppShell>);
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
    expect(screen.getAllByAltText('Parroquia San Pedro Nolasco')).not.toHaveLength(0);
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/notificaciones'));
  });

  it('muestra iniciales, rol y ejecuta cierre de sesión', async () => {
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Ana María López', correo: 'ana@test.com', rol_id: 99 }, { logout }));
    mostrar(<TopBar />);
    expect(screen.getByText('AM')).toBeInTheDocument();
    expect(screen.getByText('Usuario')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar Sesión' }));
    expect(logout).toHaveBeenCalled();
  });

  it('abre el buzón vacío y lo cierra al hacer clic fuera', async () => {
    mostrar(<TopBar />);
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    await userEvent.click(screen.getByTitle('Notificaciones'));
    expect(screen.getByText('Sin notificaciones')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Sin notificaciones')).not.toBeInTheDocument();
  });

  it('muestra máximo 9+, marca una notificación y navega al detalle', async () => {
    const notificaciones = Array.from({ length: 11 }, (_, i) => ({ id: i + 1, mensaje: `Aviso ${i + 1}`, fecha: '2099-10-20', leida: i === 1 }));
    vi.mocked(apiClient.get).mockResolvedValue({ data: notificaciones });
    mostrar(<TopBar />);
    await userEvent.click(await screen.findByTitle('Notificaciones'));
    expect(screen.getByText('9+')).toBeInTheDocument();
    expect(screen.queryByText('Aviso 6')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Aviso 1/ }));
    expect(apiClient.put).toHaveBeenCalledWith('/api/notificaciones/1/leida');
    expect(await screen.findByText('Destino: /notificaciones?resaltar=1')).toBeInTheDocument();
  });

  it('navega aunque falle marcar como leída y no hace PUT para una leída', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 2, mensaje: 'Leída', fecha: '2099-10-20', leida: true }] });
    vi.mocked(apiClient.put).mockRejectedValue(new Error('red'));
    mostrar(<TopBar />);
    await userEvent.click(await screen.findByTitle('Notificaciones'));
    await userEvent.click(screen.getByRole('button', { name: /Leída/ }));
    expect(apiClient.put).not.toHaveBeenCalled();
    expect(await screen.findByText('Destino: /notificaciones?resaltar=2')).toBeInTheDocument();
  });

  it('tolera el fallo silencioso del polling y cubre usuario ausente', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ usuario: null } as any));
    vi.mocked(apiClient.get).mockRejectedValue(new Error('red'));
    mostrar(<TopBar />);
    expect(screen.getByText('—')).toBeInTheDocument();
    await userEvent.click(screen.getByTitle('Notificaciones'));
    expect(screen.getByText('Sin notificaciones')).toBeInTheDocument();
  });

  it('Navbar enlaza al panel y permite cerrar sesión', async () => {
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue(authValue({ id: 1, nombre: 'Admin', correo: 'a@test.com', rol_id: 5 }, { logout }));
    mostrar(<Navbar />);
    expect(screen.getByRole('link', { name: 'Panel de Control' })).toHaveAttribute('href', '/dashboard');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar Sesión' }));
    expect(logout).toHaveBeenCalled();
  });
});
