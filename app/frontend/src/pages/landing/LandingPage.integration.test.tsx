import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  quienes_somos: { titulo: 'Nuestra comunidad publicada', descripcion: 'Una historia compartida.', mision: 'Acompañar.', comunidad: 'Servir.', servicio: 'Celebrar.' },
  cantidad_grupos: 14,
  cantidad_espacios: 8,
  valores_encabezado: { titulo: 'Valores publicados', descripcion: 'Nuestros principios.' },
  valores: [{ titulo: 'Esperanza', descripcion: 'Miramos al futuro con fe.' }],
  horarios_misa: [{ dias: 'Domingo', horas: ['09:00'] }],
  horarios_oficina: [{ dias: 'Lunes', horario: '09:00 – 12:00' }],
  contacto: { titulo: 'Hablemos', direccion: 'Guatemala', correo: 'hola@example.com', telefono: '+502 5555 5555' },
  devocion: {
    titulo: 'Devoción publicada',
    descripcion: 'Cómo honramos a María.',
    oracion: { titulo: 'Oración publicada', texto: 'Padre nuestro.\n\nAmén.' },
    tarjetas: [{ titulo: 'Rosario', descripcion: 'Rezo diario.\n1° Primera parte' }],
  },
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
    const posiciones = { 'quienes-somos': 100, historia: 200, valores: 300, devocion: 700, fechas: 800, contacto: 900 };
    for (const [id, offsetTop] of Object.entries(posiciones)) {
      Object.defineProperty(document.getElementById(id)!, 'offsetTop', { configurable: true, value: offsetTop });
    }
    fireEvent.scroll(window);
    expect(quienesSomos).toHaveClass('active');
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Nuestros Valores' })[0]).toHaveClass('active'));
  });

  it('lista en el menú y en el pie las secciones de la landing en el orden en que aparecen', () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);
    const secciones = [
      ['Quiénes Somos', '#quienes-somos'], ['Historia', '#historia'], ['Nuestros Valores', '#valores'],
      ['Devoción', '#devocion'], ['Fechas', '#fechas'], ['Contáctanos', '#contacto'],
    ];
    for (const navegacion of [screen.getByRole('navigation', { name: 'Navegación principal' }), screen.getByRole('navigation', { name: 'Navegación del pie de página' })]) {
      const enlaces = within(navegacion).getAllByRole('link').filter(enlace => enlace.getAttribute('href')?.startsWith('#'));
      expect(enlaces.map(enlace => [enlace.textContent, enlace.getAttribute('href')])).toEqual(secciones);
    }
    for (const [, href] of secciones) expect(document.querySelector(href)).toBeInTheDocument();
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
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido-principal');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('link', { name: 'Saltar al contenido principal' })).toHaveAttribute('href', '#contenido-principal');
    for (const nombre of ['Contenido publicado desde administración', 'Nuestra comunidad publicada', 'Valores publicados', 'Hablemos']) {
      expect(screen.getByRole('region', { name: nombre })).toBeInTheDocument();
    }
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Esperanza' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Devoción publicada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Oración publicada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rosario' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Imagen pendiente para Rosario' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Altar preparado para una celebración' })).toHaveAttribute('src', expect.stringContaining('.webp'));
    expect(apiClient.get).toHaveBeenCalledWith('/api/public/landing');
  });

  it('abre al centro el detalle de cada tarjeta de nuestra historia y lo cierra con Escape', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { ...contenidoPublicado, historia: {
      titulo: 'Nuestra historia publicada', descripcion: 'Origen de la Orden.',
      tarjetas: [{ titulo: 'Historia de la Orden', lema: 'Libres para liberar', resumen: 'Resumen de la historia.', detalle: 'Primer párrafo.\n\nSegundo párrafo.' }],
    } } });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);

    await screen.findByRole('heading', { name: 'Contenido publicado desde administración' });
    const tarjeta = screen.getByRole('button', { name: /Historia de la Orden/ });
    expect(screen.getByText('Resumen de la historia.')).toBeInTheDocument();
    expect(screen.getByText('“Libres para liberar”')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(tarjeta);

    const dialogo = screen.getByRole('dialog', { name: 'Historia de la Orden' });
    expect(within(dialogo).getByText('“Libres para liberar”')).toBeInTheDocument();
    expect(within(dialogo).getByText('Primer párrafo.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Segundo párrafo.')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tarjeta).toHaveFocus();
  });

  it('muestra nuestra historia con espacios de imagen junto a las tarjetas', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: contenidoPublicado });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);

    await screen.findByRole('heading', { name: 'Contenido publicado desde administración' });
    expect(screen.getByRole('button', { name: /Historia de la Orden Mercedaria/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Significado del escudo mercedario/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Nuestra historia' })).toBeInTheDocument();
    const imagen = screen.getByRole('img', { name: 'Imagen pendiente: historia de la Orden' });
    const tarjeta = screen.getByRole('button', { name: /Historia de la Orden Mercedaria/ });
    expect(imagen.compareDocumentPosition(tarjeta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole('img', { name: /^Imagen pendiente:/ })).toHaveLength(3);
  });

  it('muestra la devoción después de los valores y antes del contacto, con la oración primero', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: contenidoPublicado });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Contenido publicado desde administración' });

    const secciones = Array.from(document.querySelectorAll('main > section')).map(seccion => seccion.id);
    expect(secciones).toEqual(['home', 'quienes-somos', 'historia', 'valores', 'devocion', 'fechas', 'contacto']);
    const oracion = screen.getByRole('heading', { name: 'Oración publicada' });
    const tarjeta = screen.getByRole('heading', { name: 'Rosario' });
    expect(oracion.compareDocumentPosition(tarjeta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Padre nuestro.')).toBeInTheDocument();
    expect(screen.queryByText('Amén.')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const tarjetaOracion = screen.getByRole('button', { name: /Oración publicada/ });
    await userEvent.click(tarjetaOracion);
    const dialogo = screen.getByRole('dialog', { name: 'Oración publicada' });
    expect(within(dialogo).getByText('Padre nuestro.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Amén.')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tarjetaOracion).toHaveFocus();
  });

  it('muestra las fechas importantes como tarjetas con espacio para foto', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { ...contenidoPublicado, fechas: {
      titulo: 'Fechas publicadas', descripcion: 'Calendario de la Orden.',
      tarjetas: [{ fecha: '10 de agosto', titulo: 'Fundación de la Orden', descripcion: 'Año 1218.' }],
    } } });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);

    const region = await screen.findByRole('region', { name: 'Fechas publicadas' });
    expect(within(region).getByText('10 de agosto')).toBeInTheDocument();
    expect(within(region).getByRole('heading', { name: 'Fundación de la Orden' })).toBeInTheDocument();
    expect(within(region).getByRole('img', { name: 'Imagen pendiente para Fundación de la Orden' })).toBeInTheDocument();
  });

  it('muestra las fechas iniciales si el contenido publicado aún no las incluye', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: contenidoPublicado });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);

    await screen.findByRole('heading', { name: 'Contenido publicado desde administración' });
    const region = screen.getByRole('region', { name: 'Fechas importantes' });
    expect(within(region).getAllByRole('article')).toHaveLength(6);
    expect(within(region).getByText('24 de septiembre')).toBeInTheDocument();
  });

  it('conserva la devoción inicial si el contenido publicado aún no la incluye', async () => {
    const { devocion, ...anterior } = contenidoPublicado;
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: anterior });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Contenido publicado desde administración' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Devoción a Nuestra Santísima Madre de la Merced' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¡Quédate con nosotros, Señor!' })).toBeInTheDocument();
  });

  it('muestra las fotos subidas desde el panel por encima de las predeterminadas', async () => {
    const subida = (n: number) => `/uploads/landing/subidas/00000000-0000-0000-0000-00000000000${n}.webp`;
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { ...contenidoPublicado,
      imagenes: { hero: subida(1), historia_1: subida(2), entrada: subida(3) },
      valores: [{ titulo: 'Esperanza', descripcion: 'Miramos al futuro con fe.', imagen: subida(4) }],
      devocion: { ...contenidoPublicado.devocion, tarjetas: [{ titulo: 'Rosario', descripcion: 'Rezo diario.', imagen: subida(5) }] },
      fechas: { titulo: 'Fechas publicadas', descripcion: 'Calendario.', tarjetas: [{ fecha: '10 de agosto', titulo: 'Fundación', descripcion: 'Año 1218.', imagen: subida(6) }] },
    } });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);

    await screen.findByRole('heading', { name: 'Esperanza' });
    const fuente = (nombre: string) => screen.getByRole('img', { name: nombre }).getAttribute('src');
    expect(fuente('Vista exterior de la parroquia')).toBe(subida(1));
    expect(fuente('Imagen pendiente: historia de la Orden')).toBe(subida(2));
    expect(fuente('Entrada a la parroquia')).toBe(subida(3));
    expect(fuente('Altar preparado para una celebración')).toBe(subida(4));
    expect(fuente('Imagen pendiente para Rosario')).toBe(subida(5));
    expect(fuente('Imagen pendiente para Fundación')).toBe(subida(6));
    // Las fotos de tarjetas se muestran completas, con fondo difuminado, en lugar de recortarse.
    for (const nombre of ['Altar preparado para una celebración', 'Imagen pendiente para Rosario', 'Imagen pendiente para Fundación']) {
      const marco = screen.getByRole('img', { name: nombre }).closest('.slot') as HTMLElement;
      expect(marco).toHaveClass('slot-ajustada');
      expect(marco.style.getPropertyValue('--foto-fondo')).toContain('/uploads/landing/subidas/');
    }
    expect(screen.getByRole('img', { name: 'Vista exterior de la parroquia' }).closest('.slot')).not.toHaveClass('slot-ajustada');
    // Sin foto subida se conserva la predeterminada o el espacio reservado.
    expect(fuente('Celebración litúrgica')).toContain('.webp');
    expect(screen.getByRole('img', { name: 'Imagen pendiente: escudo mercedario' })).toHaveTextContent('Imagen pendiente: escudo mercedario');
  });

  it('elimina el listener de desplazamiento al desmontarse', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const vista = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);
    vista.unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
