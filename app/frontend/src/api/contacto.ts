import apiClient from './client';

export interface ContactoInput {
  nombre: string;
  correo: string;
  telefono?: string;
  motivo: string;
  mensaje: string;
}

export interface MensajeContacto extends Omit<ContactoInput, 'telefono'> {
  id: number;
  telefono: string | null;
  fecha: string;
  creado_en: string;
}

export async function enviarContacto(contacto: ContactoInput) {
  await apiClient.post('/api/contacto', contacto);
}

export async function listarMensajesContactoApi(): Promise<MensajeContacto[]> {
  const { data } = await apiClient.get<MensajeContacto[]>('/api/contacto');
  return data;
}
