import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import apiClient from './api/client';

vi.mock('./api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

const admin = {
  id: 1,
  nombre: 'Diego Calderon',
  correo: 'diego@parroquia.com',
  rol_id: 5,
};

function respuestaGet(url: string) {
  if (url === '/api/calendario') return { data: { eventos: [], tareas: [] } };
  if (/\/api\/espacios\/\d+$/.test(url)) {
    return {
      data: {
        id: 1,
        nombre: 'Salón parroquial',
        descripcion: 'Espacio de prueba',
        capacidad: 80,
        disponible: true,
      },
    };
  }
  return { data: [] };
}

async function abrir(ruta: string) {
  window.history.replaceState({}, '', ruta);
  const vista = render(<App />);
  await waitFor(() => expect(document.body).not.toHaveTextContent('Cargando…'));
  return vista;
}

describe('integración del enrutador con los módulos principales', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'jwt-integracion');
    localStorage.setItem('usuario', JSON.stringify(admin));
    vi.mocked(apiClient.get).mockImplementation(async (url) => respuestaGet(String(url)));
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each([
    '/',
    '/dashboard',
    '/ministros',
    '/ministros/coordinadores',
    '/tareas',
    '/reservas',
    '/grupos',
    '/espacios',
    '/espacios/1',
    '/eventos',
    '/calendario',
    '/cambios-turno',
    '/mis-reservas',
    '/ausencias',
    '/notificaciones',
    '/cuentas',
    '/perfil',
    '/configuracion',
    '/agenda',
    '/ruta-inexistente',
  ])('monta la ruta %s con sus proveedores y consultas reales', async (ruta) => {
    await abrir(ruta);
    expect(document.body.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('protege las rutas privadas cuando no existe una sesión', async () => {
    localStorage.clear();
    await abrir('/dashboard');
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
  });

  it('aplica el tema guardado en las preferencias de interfaz', async () => {
    localStorage.setItem('tema_aplicacion', 'oscuro');
    await abrir('/dashboard');
    expect(document.documentElement).toHaveAttribute('data-tema', 'oscuro');
  });

  it('cambia el tema sin recargar la aplicación', async () => {
    await abrir('/configuracion');
    fireEvent.click(await screen.findByRole('radio', { name: 'Oscuro' }));
    await waitFor(() =>
    expect(document.documentElement).toHaveAttribute('data-tema', 'oscuro')
);
  });

  it.each([1, 5])('abre la gestión de coordinadores para el rol %s', async rol_id => {
    localStorage.setItem('usuario', JSON.stringify({ ...admin, rol_id }));
    await abrir('/ministros/coordinadores');
    expect(await screen.findByRole('heading', { name: 'Coordinadores de ministros' })).toBeInTheDocument();
  });

  it.each([2, 3, 4])('impide acceso directo a gestión al rol %s', async rol_id => {
    localStorage.setItem('usuario', JSON.stringify({ ...admin, rol_id }));
    await abrir('/ministros/coordinadores');
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'));
  });

  it('impide al ministro abrir Mis Reservas mediante la URL', async () => {
    localStorage.setItem('usuario', JSON.stringify({ ...admin, rol_id: 4 }));
    await abrir('/mis-reservas');
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'));
  });

  it('impide al ministro abrir el detalle de espacios que muestra reservas', async () => {
    localStorage.setItem('usuario', JSON.stringify({ ...admin, rol_id: 4 }));
    await abrir('/espacios/1');
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'));
  });
});
