import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgendaPublicaPage from './AgendaPublicaPage';
import { AuthProvider } from '../../context/AuthContext';
import apiClient from '../../api/client';

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));

const evento = {
  id: 12,
  titulo: 'Encuentro parroquial',
  descripcion: 'Una actividad abierta para toda la comunidad.',
  fecha: '2099-10-20',
  hora_inicio: '09:00:00',
  hora_fin: '11:00:00',
  nombre_espacio: 'Salón parroquial',
};

function mostrar() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><AgendaPublicaPage /></AuthProvider></MemoryRouter>);
}

describe('AgendaPublicaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: [evento] });
  });

  it('consulta M1 y muestra únicamente los campos públicos de la actividad', async () => {
    mostrar();

    expect(await screen.findByRole('heading', { name: 'Encuentro parroquial' })).toBeInTheDocument();
    expect(document.querySelector('.agenda-publica.public-portal')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Quiénes Somos' })[0]).toHaveAttribute('href', '/#quienes-somos');
    expect(apiClient.get).toHaveBeenCalledWith('/api/public/agenda');
    expect(screen.getByText('20 de octubre de 2099')).toBeInTheDocument();
    expect(screen.getByText('09:00 – 11:00')).toBeInTheDocument();
    expect(screen.getByText('Salón parroquial')).toBeInTheDocument();
    expect(screen.queryByText('privado@example.com')).not.toBeInTheDocument();
  });

  it('muestra un estado claro si no hay próximas actividades', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    mostrar();

    expect(await screen.findByRole('heading', { name: 'Aún no hay actividades publicadas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contáctanos para más información' })).toHaveAttribute('href', '/#contacto');
  });

  it('permite reintentar si la consulta pública falla', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ data: [] });
    mostrar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la agenda');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Aún no hay actividades publicadas' })).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});
