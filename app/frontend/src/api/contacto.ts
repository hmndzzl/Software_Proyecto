import apiClient from './client';

export interface ContactoInput {
  nombre: string;
  correo: string;
  telefono?: string;
  motivo: string;
  mensaje: string;
}

export async function enviarContacto(contacto: ContactoInput) {
  await apiClient.post('/api/contacto', contacto);
}
