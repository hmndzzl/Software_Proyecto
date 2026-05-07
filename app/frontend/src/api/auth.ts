import axios from 'axios';
import apiClient from './client';

const BASE_URL = import.meta.env.VITE_API_URL as string;

export interface LoginResponse {
  token: string;
  usuario: { id: number; nombre: string; correo: string; rol_id: number };
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
