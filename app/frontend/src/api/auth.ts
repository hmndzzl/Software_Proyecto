import apiClient from './client';

export interface UsuarioAuth {
  id: number;
  nombre: string;
  correo: string;
  rol_id: number;
  foto_url?: string | null;
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/api/auth/logout');
}

export async function meApi(): Promise<UsuarioAuth> {
  const { data } = await apiClient.get<{ usuario: UsuarioAuth }>('/api/auth/me');
  return data.usuario;
}
