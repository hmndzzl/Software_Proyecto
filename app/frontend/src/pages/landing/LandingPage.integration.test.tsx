import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';
import { AuthProvider } from '../../context/AuthContext';
import apiClient from '../../api/client';

vi.mock('./ContactoForm', () => ({ default: () => <form aria-label="contacto" /> }));
vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));

const contenidoPublicado = {
  nombre_parroquia: 'Parroquia San Pedro Nolasco',
  lema: 'Una iglesia cercana',
  titulo_principal: 'Contenido publicado desde administración',
  descripcion_principal: 'La descripción publicada para la comunidad.',
  quienes_somos: { titulo: 'Nuestra historia', descripcion: 'Una historia compartida.', mision: 'Acompañar.', comunidad: 'Servir.', servicio: 'Celebrar.' },
  cantidad_grupos: 14,
  cantidad_espacios: 8,
  valores_encabezado: { titulo: 'Valores publicados', descripcion: 'Nuestros principios.' },
  valores: [{ titulo: 'Esperanza', descripcion: 'Miramos al futuro con fe.' }],
  horarios_misa: [{ dias: 'Domingo', horas: ['09:00'] }],
  horarios_oficina: [{ dias: 'Lunes', horario: '09:00 – 12:00' }],
  contacto: { titulo: 'Hablemos', direccion: 'Guatemala', correo: 'hola@example.com', telefono: '+502 5555 5555' },
  texto_pie: 'Un pie publicado.',
};

describe('navegación del portal público', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
  });

  it('abre y cierra el menú y actualiza la sección activa al desplazarse', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);
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
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);
    const agenda = screen.getByRole('link', { name: 'AGENDA PARROQUIAL' });
    expect(agenda).toHaveAttribute('href', '/agenda');
    expect(agenda.closest('.hero-cta')?.querySelectorAll('a')).toHaveLength(1);
  });

  it('muestra fotografías reales y conserva el placeholder ante errores de carga', () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);
    const fachada = screen.getByRole('img', { name: 'Vista exterior de la parroquia' });
    expect(fachada).toHaveAttribute('src', expect.stringContaining('.webp'));
    fireEvent.error(fachada);
    expect(screen.getByRole('img', { name: 'Vista exterior de la parroquia' })).toHaveTextContent('Vista exterior de la parroquia');
  });

  it('enlaza el portal con la agenda pública', () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'AGENDA PARROQUIAL' })).toHaveAttribute('href', '/agenda');
  });

  it('consulta M3 y muestra el contenido publicado sin interpretar HTML', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: contenidoPublicado });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Contenido publicado desde administración' })).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Esperanza' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Altar preparado para una celebración' })).toHaveAttribute('src', expect.stringContaining('.webp'));
    expect(apiClient.get).toHaveBeenCalledWith('/api/public/landing');
  });

  it('elimina el listener de desplazamiento al desmontarse', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const vista = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);
    vista.unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
