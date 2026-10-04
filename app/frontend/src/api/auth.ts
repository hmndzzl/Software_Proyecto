import axios from 'axios';
import apiClient from './client';

const BASE_URL = import.meta.env.VITE_API_URL as string;

export interface UsuarioAuth {
  id: number;
  nombre: string;
  correo: string;
  rol_id: number;
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioAuth;
  mensaje: string;
}

export async function loginApi(correo: string, password: string): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>(
    `${BASE_URL}/api/auth/login`,
    { correo, password },
    { withCredentials: true }
  );
  return data;
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/api/auth/logout');
}

export async function meApi(): Promise<UsuarioAuth> {
  const { data } = await apiClient.get<{ usuario: UsuarioAuth }>('/api/auth/me');
  return data.usuario;
}
