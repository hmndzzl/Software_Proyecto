import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import ImagenAmpliable from '../ImagenAmpliable';
import Modal from '../Modal';

const alt = 'Fotografía del salón';
const mostrar = () => render(<ImagenAmpliable src="/salon.webp" alt={alt} />);
const visor = () => screen.getByRole('dialog', { name: 'Imagen ampliada' });
const cargar = () => {
  const imagen = visor().querySelector('img')!;
  Object.defineProperties(imagen, { naturalWidth: { configurable: true, value: 1200 }, naturalHeight: { configurable: true, value: 800 } });
  fireEvent.load(imagen);
  return imagen;
};

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', ''); this.querySelector<HTMLButtonElement>('button')?.focus();
  }) });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open'); }) });
  window.matchMedia = vi.fn().mockReturnValue({ matches: true });
});
afterEach(() => { vi.useRealTimers(); document.body.style.overflow = ''; vi.restoreAllMocks(); });

describe('visor de imágenes compartido', () => {
  it('abre con teclado, contiene una imagen con texto alternativo y devuelve el foco', async () => {
    mostrar();
    const abrir = screen.getByRole('button', { name: `Ampliar imagen: ${alt}` });
    abrir.focus(); await userEvent.keyboard('{Enter}');
    expect(visor()).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Cerrar imagen' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    expect(within(visor()).getByRole('status')).toHaveTextContent('Cargando imagen');
    cargar();
    expect(within(visor()).getByRole('img', { name: alt })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(abrir).toHaveFocus(); expect(document.body.style.overflow).toBe('');
  });
  it('ajusta la proporción al espacio, limita el zoom y permite volver a ajustar', async () => {
    mostrar(); fireEvent.click(screen.getByRole('button'));
    const area = visor().querySelector<HTMLElement>('[tabindex="0"]')!;
    Object.defineProperties(area, { clientWidth: { configurable: true, value: 600 }, clientHeight: { configurable: true, value: 400 } });
    fireEvent(window, new Event('resize'));
    const imagen = cargar();
    expect(imagen).toHaveStyle({ width: '600px', height: '400px' });
    const acercar = screen.getByRole('button', { name: 'Acercar imagen' });
    for (let i = 0; i < 4; i++) fireEvent.click(acercar);
    expect(screen.getByText('300%')).toBeInTheDocument(); expect(acercar).toBeDisabled();
    expect(imagen).toHaveStyle({ width: '1800px', height: '1200px' });
    fireEvent.click(screen.getByRole('button', { name: 'Alejar imagen' }));
    expect(screen.getByText('250%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar' }));
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alejar imagen' })).toBeDisabled();
    Object.defineProperties(imagen, { naturalWidth: { configurable: true, value: 100 }, naturalHeight: { configurable: true, value: 50 } });
    fireEvent.load(imagen);
    expect(imagen).toHaveStyle({ width: '600px', height: '300px' });
  });
  it('un error permite reintentar la carga', () => {
    mostrar(); fireEvent.click(screen.getByRole('button'));
    fireEvent.error(visor().querySelector('img')!);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando imagen');
    cargar(); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it.each(['cancelar', 'fondo', 'lienzo'])('cierra mediante %s', tipo => {
    mostrar(); fireEvent.click(screen.getByRole('button'));
    const dialog = visor();
    if (tipo === 'cancelar') fireEvent(dialog, new Event('cancel', { cancelable: true }));
    else if (tipo === 'fondo') fireEvent.click(dialog);
    else fireEvent.click(dialog.querySelector('[class*="canvas"]')!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('pulsar la imagen no cierra el visor ni ejecuta la acción de la tarjeta', () => {
    const navegar = vi.fn();
    render(<article onClick={navegar}><ImagenAmpliable src="/salon.webp" alt={alt} /></article>);
    fireEvent.click(screen.getByRole('img'));
    fireEvent.click(cargar());
    expect(visor()).toBeInTheDocument(); expect(navegar).not.toHaveBeenCalled();
  });
  it('Escape dentro del visor no cierra el formulario de fondo', () => {
    const cerrarFormulario = vi.fn();
    render(<Modal open title="Editar espacio" onClose={cerrarFormulario}><ImagenAmpliable src="/salon.webp" alt={alt} /></Modal>);
    fireEvent.click(screen.getByRole('button', { name: `Ampliar imagen: ${alt}` }));
    fireEvent.keyDown(visor(), { key: 'Escape' });
    expect(cerrarFormulario).not.toHaveBeenCalled();
    fireEvent(visor(), new Event('cancel', { cancelable: true }));
    expect(screen.getByRole('dialog', { name: 'Editar espacio' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });
  it('espera a la transición de cierre y evita dobles cierres', () => {
    vi.useFakeTimers(); window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    mostrar(); fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }));
    expect(visor()).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(160));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('limpia observadores y el bloqueo de desplazamiento al desmontarse', () => {
    const disconnect = vi.fn(); const observe = vi.fn();
    vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect = disconnect; });
    const vista = mostrar(); fireEvent.click(screen.getByRole('button')); cargar();
    expect(observe).toHaveBeenCalledOnce();
    vista.unmount(); expect(disconnect).toHaveBeenCalledOnce();
    expect(document.body.style.overflow).toBe(''); vi.unstubAllGlobals();
  });
});
