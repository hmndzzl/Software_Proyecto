import { cleanup, render, waitFor } from '@testing-library/react';
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
});
